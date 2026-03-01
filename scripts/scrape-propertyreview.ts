/**
 * Scrape PropertyReviewSG for upcoming new launches
 * This site doesn't use Cloudflare and is easy to parse
 * 
 * Run: npx tsx scripts/scrape-propertyreview.ts
 */

import * as cheerio from "cheerio";
import { createClient } from "@libsql/client";

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

interface ScrapedProject {
  name: string;
  location?: string;
  tenure?: string;
  district?: number;
  status: string;
  preview_date?: string;
  launch_date?: string;
  developer?: string;
}

function extractDistrict(text: string): number | undefined {
  // District keywords
  const districtMap: Record<string, number> = {
    "marina": 1, "raffles": 1, "shenton": 1,
    "tanjong pagar": 2, "chinatown": 2, "anson": 2,
    "queenstown": 3, "tiong bahru": 3, "alexandra": 3, "havelock": 3,
    "harbourfront": 4, "sentosa": 4, "keppel": 4, "telok blangah": 4,
    "buona vista": 5, "west coast": 5, "clementi": 5, "one-north": 5, "media circle": 5,
    "city hall": 6, "beach road": 7, "bugis": 7,
    "farrer park": 8, "little india": 8,
    "orchard": 9, "river valley": 9, "cairnhill": 9,
    "tanglin": 10, "holland": 10, "bukit timah": 10,
    "newton": 11, "novena": 11,
    "toa payoh": 12, "balestier": 12,
    "macpherson": 13, "potong pasir": 13,
    "geylang": 14, "paya lebar": 14, "eunos": 14,
    "katong": 15, "marine parade": 15, "east coast": 15, "meyer": 15,
    "bedok": 16, "bayshore": 16, "upper east coast": 16,
    "changi": 17, "loyang": 17,
    "tampines": 18, "pasir ris": 18,
    "serangoon": 19, "hougang": 19, "punggol": 19, "sengkang": 19, "lorong chuan": 19,
    "bishan": 20, "ang mo kio": 20, "thomson": 20,
    "upper bukit timah": 21, "clementi park": 21,
    "jurong": 22, "boon lay": 22, "lakeside": 22,
    "bukit batok": 23, "hillview": 23, "dairy farm": 23,
    "lim chu kang": 24, "tengah": 24,
    "woodlands": 25, "admiralty": 25,
    "mandai": 26, "lentor": 26, "springleaf": 26,
    "yishun": 27, "sembawang": 27,
    "seletar": 28, "yio chu kang": 28,
  };

  const lower = text.toLowerCase();
  for (const [keyword, district] of Object.entries(districtMap)) {
    if (lower.includes(keyword)) {
      return district;
    }
  }
  return undefined;
}

function parseTenure(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("freehold") || lower.includes("fh")) return "Freehold";
  if (lower.includes("999")) return "999-year";
  if (lower.includes("99y") || lower.includes("99 y") || lower.includes("99-year")) return "99-year";
  return undefined;
}

async function scrapePropertyReview(): Promise<ScrapedProject[]> {
  console.log("📍 Fetching PropertyReviewSG...");
  
  const response = await fetch("https://propertyreviewsg.com/upcoming-new-launches/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const projects: ScrapedProject[] = [];
  
  // Find all tables
  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    
    rows.each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 3) {
        const cellTexts: string[] = [];
        cells.each((_, cell) => {
          cellTexts.push($(cell).text().trim());
        });
        
        // First cell usually has project name
        const name = cellTexts[0]?.replace(/\s*\([^)]*\)\s*/g, "").trim();
        if (!name || name.length < 3 || name === "Project" || name.toLowerCase().includes("region")) {
          return;
        }
        
        // Try to find location info in parentheses
        const locationMatch = cellTexts[0]?.match(/\(([^)]+)\)/);
        const location = locationMatch?.[1] || cellTexts.find(t => 
          t.toLowerCase().includes("road") || 
          t.toLowerCase().includes("street") ||
          t.toLowerCase().includes("ave")
        );
        
        // Find tenure
        const tenureCell = cellTexts.find(t => 
          t.toLowerCase().includes("99") || 
          t.toLowerCase().includes("freehold")
        );
        
        // Find dates
        const datePattern = /\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
        const dates = cellTexts.filter(t => datePattern.test(t));
        
        const project: ScrapedProject = {
          name,
          location,
          tenure: parseTenure(tenureCell || ""),
          district: extractDistrict(cellTexts.join(" ")),
          status: dates.length > 0 ? "upcoming" : "unknown",
          preview_date: dates[0],
          launch_date: dates[1],
        };
        
        // Skip duplicates
        if (!projects.some(p => p.name.toLowerCase() === project.name.toLowerCase())) {
          projects.push(project);
        }
      }
    });
  });
  
  return projects;
}

async function upsertProject(project: ScrapedProject): Promise<"inserted" | "updated" | "skipped"> {
  // Check if exists
  const existing = await db.execute({
    sql: "SELECT id FROM condos WHERE LOWER(name) = LOWER(?)",
    args: [project.name],
  });
  
  if (existing.rows.length > 0) {
    // Update with any new info
    const updates: string[] = [];
    const args: (string | number | null)[] = [];
    
    if (project.location) { updates.push("address = COALESCE(address, ?)"); args.push(project.location); }
    if (project.district) { updates.push("district = COALESCE(district, ?)"); args.push(project.district); }
    if (project.tenure) { updates.push("tenure = COALESCE(tenure, ?)"); args.push(project.tenure); }
    if (project.launch_date) { updates.push("launch_date = COALESCE(launch_date, ?)"); args.push(project.launch_date); }
    
    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      args.push(existing.rows[0].id as number);
      
      await db.execute({
        sql: `UPDATE condos SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });
      return "updated";
    }
    return "skipped";
  }
  
  // Insert new
  await db.execute({
    sql: `
      INSERT INTO condos (name, address, district, tenure, status, launch_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      project.name,
      project.location || null,
      project.district || null,
      project.tenure || null,
      project.status === "upcoming" ? "upcoming" : "launched",
      project.launch_date || null,
    ],
  });
  
  return "inserted";
}

async function main() {
  console.log("🏢 PropertyReviewSG Scraper");
  console.log("===========================");
  console.log(`Started: ${new Date().toISOString()}`);
  
  try {
    const projects = await scrapePropertyReview();
    console.log(`\n📊 Found ${projects.length} projects\n`);
    
    let inserted = 0, updated = 0, skipped = 0;
    
    for (const project of projects) {
      const result = await upsertProject(project);
      if (result === "inserted") {
        inserted++;
        console.log(`  ✓ New: ${project.name} (D${project.district || "?"})`);
      } else if (result === "updated") {
        updated++;
        console.log(`  ↻ Updated: ${project.name}`);
      } else {
        skipped++;
      }
    }
    
    console.log("\n✅ Complete!");
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
