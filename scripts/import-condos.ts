/**
 * Import condos from CSV or JSON
 * 
 * Usage:
 *   npx tsx scripts/import-condos.ts data/new-launches.csv
 *   npx tsx scripts/import-condos.ts data/condos.json
 * 
 * CSV format (header row required):
 *   name,developer,address,district,tenure,total_units,expected_top,status,min_price,max_price,min_psf,max_psf,bedrooms,website_url
 * 
 * JSON format:
 *   [{ "name": "...", "developer": "...", ... }]
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  console.error("TURSO_DATABASE_URL not set");
  process.exit(1);
}

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

interface CondoInput {
  name: string;
  developer?: string;
  address?: string;
  district?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  tenure?: string;
  total_units?: number | string;
  expected_top?: string;
  launch_date?: string;
  status?: string;
  min_price?: number | string;
  max_price?: number | string;
  min_psf?: number | string;
  max_psf?: number | string;
  min_sqft?: number | string;
  max_sqft?: number | string;
  bedrooms?: string;
  amenities?: string;
  description?: string;
  website_url?: string;
  image_url?: string;
}

function parseNumber(val: number | string | undefined): number | null {
  if (val === undefined || val === "" || val === null) return null;
  const num = typeof val === "number" ? val : parseFloat(val.toString().replace(/[,$]/g, ""));
  return isNaN(num) ? null : num;
}

function parseCSV(content: string): CondoInput[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const condos: CondoInput[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const condo: Record<string, string> = {};
    
    headers.forEach((header, idx) => {
      if (values[idx]) condo[header] = values[idx];
    });
    
    if (condo.name) {
      condos.push(condo as unknown as CondoInput);
    }
  }
  
  return condos;
}

async function importCondo(condo: CondoInput): Promise<"inserted" | "updated"> {
  const existing = await db.execute({
    sql: "SELECT id FROM condos WHERE LOWER(name) = LOWER(?)",
    args: [condo.name],
  });
  
  const values = {
    name: condo.name,
    developer: condo.developer || null,
    address: condo.address || null,
    district: parseNumber(condo.district),
    latitude: parseNumber(condo.latitude),
    longitude: parseNumber(condo.longitude),
    tenure: condo.tenure || null,
    total_units: parseNumber(condo.total_units),
    expected_top: condo.expected_top || null,
    launch_date: condo.launch_date || null,
    status: condo.status || "upcoming",
    min_price: parseNumber(condo.min_price),
    max_price: parseNumber(condo.max_price),
    min_psf: parseNumber(condo.min_psf),
    max_psf: parseNumber(condo.max_psf),
    min_sqft: parseNumber(condo.min_sqft),
    max_sqft: parseNumber(condo.max_sqft),
    bedrooms: condo.bedrooms || null,
    amenities: condo.amenities || null,
    description: condo.description || null,
    website_url: condo.website_url || null,
    image_url: condo.image_url || null,
  };
  
  if (existing.rows.length > 0) {
    await db.execute({
      sql: `
        UPDATE condos SET
          developer = COALESCE(?, developer),
          address = COALESCE(?, address),
          district = COALESCE(?, district),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          tenure = COALESCE(?, tenure),
          total_units = COALESCE(?, total_units),
          expected_top = COALESCE(?, expected_top),
          launch_date = COALESCE(?, launch_date),
          status = COALESCE(?, status),
          min_price = COALESCE(?, min_price),
          max_price = COALESCE(?, max_price),
          min_psf = COALESCE(?, min_psf),
          max_psf = COALESCE(?, max_psf),
          min_sqft = COALESCE(?, min_sqft),
          max_sqft = COALESCE(?, max_sqft),
          bedrooms = COALESCE(?, bedrooms),
          amenities = COALESCE(?, amenities),
          description = COALESCE(?, description),
          website_url = COALESCE(?, website_url),
          image_url = COALESCE(?, image_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        values.developer, values.address, values.district,
        values.latitude, values.longitude, values.tenure,
        values.total_units, values.expected_top, values.launch_date,
        values.status, values.min_price, values.max_price,
        values.min_psf, values.max_psf, values.min_sqft, values.max_sqft,
        values.bedrooms, values.amenities, values.description,
        values.website_url, values.image_url,
        existing.rows[0].id,
      ],
    });
    return "updated";
  }
  
  await db.execute({
    sql: `
      INSERT INTO condos (
        name, developer, address, district, latitude, longitude,
        tenure, total_units, expected_top, launch_date, status,
        min_price, max_price, min_psf, max_psf, min_sqft, max_sqft,
        bedrooms, amenities, description, website_url, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      values.name, values.developer, values.address, values.district,
      values.latitude, values.longitude, values.tenure, values.total_units,
      values.expected_top, values.launch_date, values.status,
      values.min_price, values.max_price, values.min_psf, values.max_psf,
      values.min_sqft, values.max_sqft, values.bedrooms, values.amenities,
      values.description, values.website_url, values.image_url,
    ],
  });
  return "inserted";
}

async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log("Usage: npx tsx scripts/import-condos.ts <file.csv|file.json>");
    console.log("\nCSV format:");
    console.log("  name,developer,address,district,tenure,status,min_price,max_price,min_psf,max_psf,website_url");
    console.log("\nJSON format:");
    console.log('  [{ "name": "The Orie", "developer": "CDL", ... }]');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();
  
  let condos: CondoInput[];
  
  if (ext === ".json") {
    condos = JSON.parse(content);
  } else if (ext === ".csv") {
    condos = parseCSV(content);
  } else {
    console.error("Unsupported file format. Use .csv or .json");
    process.exit(1);
  }
  
  console.log(`📥 Importing ${condos.length} condos from ${path.basename(filePath)}`);
  console.log("---");
  
  let inserted = 0, updated = 0;
  
  for (const condo of condos) {
    const result = await importCondo(condo);
    if (result === "inserted") {
      inserted++;
      console.log(`  ✓ New: ${condo.name}`);
    } else {
      updated++;
      console.log(`  ↻ Updated: ${condo.name}`);
    }
  }
  
  console.log("---");
  console.log(`✅ Done! Inserted: ${inserted}, Updated: ${updated}`);
}

main().catch(console.error);
