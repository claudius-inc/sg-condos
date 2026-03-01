/**
 * Scraper for Singapore property new launches
 * Sources: EdgeProp, PropertyGuru, 99.co
 * 
 * Run with: npx tsx scripts/scrape-launches.ts
 * 
 * Note: This is a basic scraper template. Real-world usage may require:
 * - Handling rate limits
 * - Dealing with JavaScript-rendered content (use Puppeteer/Playwright)
 * - Respecting robots.txt
 * - Adding proper error handling and retries
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

interface ScrapedCondo {
  name: string;
  developer?: string;
  address?: string;
  district?: number;
  tenure?: string;
  total_units?: number;
  expected_top?: string;
  launch_date?: string;
  status?: string;
  min_psf?: number;
  max_psf?: number;
  website_url?: string;
}

// Helper to parse PSF values like "$2,100 - $2,400 psf"
function parsePsfRange(text: string): { min?: number; max?: number } {
  const matches = text.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/);
  if (matches) {
    return {
      min: parseInt(matches[1].replace(/,/g, "")),
      max: parseInt(matches[2].replace(/,/g, "")),
    };
  }
  const single = text.match(/\$?([\d,]+)/);
  if (single) {
    const val = parseInt(single[1].replace(/,/g, ""));
    return { min: val, max: val };
  }
  return {};
}

// Helper to extract district from address
function extractDistrict(address: string): number | undefined {
  const districtMatch = address.match(/D(\d+)|District\s*(\d+)/i);
  if (districtMatch) {
    return parseInt(districtMatch[1] || districtMatch[2]);
  }
  return undefined;
}

async function scrapeEdgeProp(): Promise<ScrapedCondo[]> {
  console.log("Scraping EdgeProp...");
  const condos: ScrapedCondo[] = [];
  
  try {
    const url = "https://www.edgeprop.sg/new-launches";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SGCondosBot/1.0)",
      },
    });
    
    if (!response.ok) {
      console.log(`  EdgeProp returned ${response.status}, skipping...`);
      return condos;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Example selectors - adjust based on actual page structure
    $(".property-card, .launch-card, .project-item").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".property-name, .title, h3").first().text().trim();
      const developer = $el.find(".developer, .by").text().trim();
      const location = $el.find(".location, .address").text().trim();
      const psf = $el.find(".psf, .price").text().trim();
      
      if (name) {
        const psfRange = parsePsfRange(psf);
        condos.push({
          name,
          developer: developer || undefined,
          address: location || undefined,
          district: extractDistrict(location),
          status: "upcoming",
          ...psfRange,
        });
      }
    });
    
    console.log(`  Found ${condos.length} projects from EdgeProp`);
  } catch (error) {
    console.error("  EdgeProp scrape failed:", error);
  }
  
  return condos;
}

async function scrapePropertyGuru(): Promise<ScrapedCondo[]> {
  console.log("Scraping PropertyGuru...");
  const condos: ScrapedCondo[] = [];
  
  try {
    const url = "https://www.propertyguru.com.sg/new-launch";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SGCondosBot/1.0)",
      },
    });
    
    if (!response.ok) {
      console.log(`  PropertyGuru returned ${response.status}, skipping...`);
      return condos;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Example selectors - adjust based on actual page structure
    $(".listing-card, .project-card").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".listing-title, .project-name").first().text().trim();
      const developer = $el.find(".developer-name").text().trim();
      const address = $el.find(".listing-location, .address").text().trim();
      const top = $el.find(".top-date, .completion").text().trim();
      
      if (name) {
        condos.push({
          name,
          developer: developer || undefined,
          address: address || undefined,
          district: extractDistrict(address),
          expected_top: top || undefined,
          status: "upcoming",
        });
      }
    });
    
    console.log(`  Found ${condos.length} projects from PropertyGuru`);
  } catch (error) {
    console.error("  PropertyGuru scrape failed:", error);
  }
  
  return condos;
}

async function scrape99co(): Promise<ScrapedCondo[]> {
  console.log("Scraping 99.co...");
  const condos: ScrapedCondo[] = [];
  
  try {
    const url = "https://www.99.co/singapore/new-launches";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SGCondosBot/1.0)",
      },
    });
    
    if (!response.ok) {
      console.log(`  99.co returned ${response.status}, skipping...`);
      return condos;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Example selectors - adjust based on actual page structure
    $(".property-listing, .project-item").each((_, el) => {
      const $el = $(el);
      const name = $el.find("h2, .name, .title").first().text().trim();
      const details = $el.find(".details, .info").text().trim();
      const tenure = details.includes("Freehold") ? "Freehold" : 
                    details.includes("999") ? "999-year" :
                    details.includes("99") ? "99-year" : undefined;
      
      if (name) {
        condos.push({
          name,
          tenure,
          status: "upcoming",
        });
      }
    });
    
    console.log(`  Found ${condos.length} projects from 99.co`);
  } catch (error) {
    console.error("  99.co scrape failed:", error);
  }
  
  return condos;
}

async function upsertCondo(condo: ScrapedCondo) {
  // Check if condo already exists
  const existing = await db.execute({
    sql: "SELECT id FROM condos WHERE name = ?",
    args: [condo.name],
  });
  
  if (existing.rows.length > 0) {
    // Update existing record
    const updates: string[] = [];
    const args: (string | number | undefined)[] = [];
    
    if (condo.developer) {
      updates.push("developer = ?");
      args.push(condo.developer);
    }
    if (condo.min_psf) {
      updates.push("min_psf = ?");
      args.push(condo.min_psf);
    }
    if (condo.max_psf) {
      updates.push("max_psf = ?");
      args.push(condo.max_psf);
    }
    
    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      args.push(existing.rows[0].id as number);
      
      await db.execute({
        sql: `UPDATE condos SET ${updates.join(", ")} WHERE id = ?`,
        args: args.filter((a) => a !== undefined) as (string | number)[],
      });
      console.log(`  Updated: ${condo.name}`);
    }
  } else {
    // Insert new record
    await db.execute({
      sql: `
        INSERT INTO condos (name, developer, address, district, tenure, total_units, 
          expected_top, launch_date, status, min_psf, max_psf, website_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        condo.name,
        condo.developer || null,
        condo.address || null,
        condo.district || null,
        condo.tenure || null,
        condo.total_units || null,
        condo.expected_top || null,
        condo.launch_date || null,
        condo.status || "upcoming",
        condo.min_psf || null,
        condo.max_psf || null,
        condo.website_url || null,
      ],
    });
    console.log(`  Inserted: ${condo.name}`);
  }
}

async function main() {
  console.log("Starting scrape at", new Date().toISOString());
  console.log("---");
  
  // Scrape from all sources
  const [edgePropCondos, propertyGuruCondos, ninetynineCondos] = await Promise.all([
    scrapeEdgeProp(),
    scrapePropertyGuru(),
    scrape99co(),
  ]);
  
  // Combine and dedupe by name
  const allCondos = [...edgePropCondos, ...propertyGuruCondos, ...ninetynineCondos];
  const uniqueCondos = new Map<string, ScrapedCondo>();
  
  for (const condo of allCondos) {
    const key = condo.name.toLowerCase().trim();
    if (!uniqueCondos.has(key)) {
      uniqueCondos.set(key, condo);
    } else {
      // Merge data from multiple sources
      const existing = uniqueCondos.get(key)!;
      uniqueCondos.set(key, {
        ...existing,
        developer: existing.developer || condo.developer,
        address: existing.address || condo.address,
        district: existing.district || condo.district,
        tenure: existing.tenure || condo.tenure,
        min_psf: existing.min_psf || condo.min_psf,
        max_psf: existing.max_psf || condo.max_psf,
        expected_top: existing.expected_top || condo.expected_top,
      });
    }
  }
  
  console.log("---");
  console.log(`Total unique projects found: ${uniqueCondos.size}`);
  console.log("Updating database...");
  
  for (const condo of uniqueCondos.values()) {
    await upsertCondo(condo);
  }
  
  console.log("---");
  console.log("Scrape completed at", new Date().toISOString());
}

main().catch(console.error);
