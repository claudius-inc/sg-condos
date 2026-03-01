/**
 * Production scraper for Singapore property data
 * Uses Playwright for JavaScript-rendered sites
 * 
 * Run: npx tsx scripts/scrape-production.ts [--new-launches | --resale | --all]
 * 
 * Sources:
 * - EdgeProp (new launches + resale)
 * - PropertyGuru (new launches + resale)
 * - 99.co (new launches + resale)
 */

import { chromium, type Page } from "playwright";
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
  latitude?: number;
  longitude?: number;
  tenure?: string;
  total_units?: number;
  expected_top?: string;
  launch_date?: string;
  status: "upcoming" | "launched" | "completed" | "resale";
  min_price?: number;
  max_price?: number;
  min_psf?: number;
  max_psf?: number;
  min_sqft?: number;
  max_sqft?: number;
  bedrooms?: string;
  amenities?: string;
  description?: string;
  website_url?: string;
  image_url?: string;
  source: string;
}

// Singapore district mapping
const DISTRICT_KEYWORDS: Record<string, number> = {
  "raffles place": 1, "marina": 1, "cecil": 1,
  "tanjong pagar": 2, "chinatown": 2,
  "queenstown": 3, "tiong bahru": 3, "alexandra": 3,
  "telok blangah": 4, "harbourfront": 4, "sentosa": 4, "keppel": 4,
  "buona vista": 5, "west coast": 5, "clementi": 5, "pasir panjang": 5,
  "city hall": 6, "beach road": 7, "bugis": 7,
  "farrer park": 8, "little india": 8,
  "orchard": 9, "cairnhill": 9, "river valley": 9,
  "tanglin": 10, "holland": 10, "bukit timah": 10,
  "newton": 11, "novena": 11,
  "toa payoh": 12, "balestier": 12,
  "macpherson": 13, "potong pasir": 13,
  "geylang": 14, "paya lebar": 14, "eunos": 14,
  "katong": 15, "marine parade": 15, "joo chiat": 15, "east coast": 15,
  "bedok": 16, "upper east coast": 16,
  "changi": 17, "loyang": 17,
  "tampines": 18, "pasir ris": 18,
  "serangoon": 19, "hougang": 19, "punggol": 19, "sengkang": 19,
  "bishan": 20, "ang mo kio": 20,
  "clementi park": 21, "upper bukit timah": 21,
  "jurong": 22, "boon lay": 22, "tuas": 22,
  "bukit batok": 23, "hillview": 23, "dairy farm": 23,
  "lim chu kang": 24, "tengah": 24,
  "woodlands": 25, "admiralty": 25,
  "mandai": 26, "lentor": 26, "upper thomson": 26,
  "yishun": 27, "sembawang": 27,
  "seletar": 28, "yio chu kang": 28,
};

function extractDistrict(text: string): number | undefined {
  const lower = text.toLowerCase();
  
  // Try explicit "D12" or "District 12" pattern
  const explicitMatch = lower.match(/d(\d{1,2})|district\s*(\d{1,2})/);
  if (explicitMatch) {
    return parseInt(explicitMatch[1] || explicitMatch[2]);
  }
  
  // Try keyword matching
  for (const [keyword, district] of Object.entries(DISTRICT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return district;
    }
  }
  
  return undefined;
}

function parsePriceRange(text: string): { min?: number; max?: number } {
  // Handle "$1.2M - $2.5M" or "$1,200,000 - $2,500,000"
  const millions = text.match(/\$?([\d.]+)\s*[mM]\s*[-–]\s*\$?([\d.]+)\s*[mM]/);
  if (millions) {
    return {
      min: Math.round(parseFloat(millions[1]) * 1000000),
      max: Math.round(parseFloat(millions[2]) * 1000000),
    };
  }
  
  const full = text.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/);
  if (full) {
    return {
      min: parseInt(full[1].replace(/,/g, "")),
      max: parseInt(full[2].replace(/,/g, "")),
    };
  }
  
  // Single value
  const single = text.match(/\$?([\d.]+)\s*[mM]/);
  if (single) {
    const val = Math.round(parseFloat(single[1]) * 1000000);
    return { min: val, max: val };
  }
  
  return {};
}

function parsePsfRange(text: string): { min?: number; max?: number } {
  const match = text.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/);
  if (match) {
    return {
      min: parseInt(match[1].replace(/,/g, "")),
      max: parseInt(match[2].replace(/,/g, "")),
    };
  }
  
  const single = text.match(/\$?([\d,]+)/);
  if (single) {
    const val = parseInt(single[1].replace(/,/g, ""));
    return { min: val, max: val };
  }
  
  return {};
}

async function scrapeEdgePropNewLaunches(page: Page): Promise<ScrapedCondo[]> {
  console.log("\n📍 Scraping EdgeProp New Launches...");
  const condos: ScrapedCondo[] = [];
  
  try {
    await page.goto("https://www.edgeprop.sg/new-launches", { 
      waitUntil: "domcontentloaded",
      timeout: 60000 
    });
    
    // Wait for content to load
    await page.waitForSelector('[class*="project"], [class*="card"], [class*="listing"]', { timeout: 10000 }).catch(() => {});
    
    // Get all project cards
    const projects = await page.$$('[class*="project-card"], [class*="listing-card"], article[class*="card"]');
    
    for (const project of projects) {
      try {
        const name = await project.$eval('h2, h3, [class*="title"]', (el) => el.textContent?.trim() || "").catch(() => "");
        if (!name) continue;
        
        const developer = await project.$eval('[class*="developer"], [class*="by"]', (el) => el.textContent?.trim()).catch(() => undefined);
        const location = await project.$eval('[class*="location"], [class*="address"]', (el) => el.textContent?.trim()).catch(() => undefined);
        const psfText = await project.$eval('[class*="psf"], [class*="price"]', (el) => el.textContent?.trim() || "").catch(() => "");
        const tenure = await project.$eval('[class*="tenure"]', (el) => el.textContent?.trim()).catch(() => undefined);
        const top = await project.$eval('[class*="top"], [class*="completion"]', (el) => el.textContent?.trim()).catch(() => undefined);
        
        const psf = parsePsfRange(psfText);
        
        condos.push({
          name,
          developer,
          address: location,
          district: location ? extractDistrict(location) : undefined,
          tenure: tenure?.includes("Freehold") ? "Freehold" : tenure?.includes("999") ? "999-year" : tenure?.includes("99") ? "99-year" : undefined,
          expected_top: top,
          status: "launched",
          min_psf: psf.min,
          max_psf: psf.max,
          source: "EdgeProp",
        });
      } catch (e) {
        // Skip this card
      }
    }
    
    console.log(`   Found ${condos.length} projects`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
  
  return condos;
}

async function scrapePropertyGuruNewLaunches(page: Page): Promise<ScrapedCondo[]> {
  console.log("\n📍 Scraping PropertyGuru New Launches...");
  const condos: ScrapedCondo[] = [];
  
  try {
    await page.goto("https://www.propertyguru.com.sg/new-launch", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    
    await page.waitForSelector('[class*="listing"], [class*="card"], [class*="project"]', { timeout: 10000 }).catch(() => {});
    
    // PropertyGuru uses data attributes and specific class patterns
    const listings = await page.$$('[data-automation-id="listing-card"], [class*="listing-card"]');
    
    for (const listing of listings) {
      try {
        const name = await listing.$eval('[class*="title"], h2, h3', (el) => el.textContent?.trim() || "").catch(() => "");
        if (!name) continue;
        
        const address = await listing.$eval('[class*="location"], [class*="address"]', (el) => el.textContent?.trim()).catch(() => undefined);
        const priceText = await listing.$eval('[class*="price"]', (el) => el.textContent?.trim() || "").catch(() => "");
        const developer = await listing.$eval('[class*="developer"]', (el) => el.textContent?.trim()).catch(() => undefined);
        
        const prices = parsePriceRange(priceText);
        const psf = parsePsfRange(priceText);
        
        condos.push({
          name,
          developer,
          address,
          district: address ? extractDistrict(address) : undefined,
          status: "launched",
          min_price: prices.min,
          max_price: prices.max,
          min_psf: psf.min,
          max_psf: psf.max,
          source: "PropertyGuru",
        });
      } catch (e) {
        // Skip
      }
    }
    
    console.log(`   Found ${condos.length} projects`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
  
  return condos;
}

async function scrape99coNewLaunches(page: Page): Promise<ScrapedCondo[]> {
  console.log("\n📍 Scraping 99.co New Launches...");
  const condos: ScrapedCondo[] = [];
  
  try {
    await page.goto("https://www.99.co/singapore/new-launches/condos-apartments", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    
    await page.waitForSelector('[class*="listing"], [class*="card"]', { timeout: 10000 }).catch(() => {});
    
    // 99.co specific selectors
    const cards = await page.$$('[class*="ListingCard"], [class*="property-card"]');
    
    for (const card of cards) {
      try {
        const name = await card.$eval('h2, h3, [class*="name"], [class*="title"]', (el) => el.textContent?.trim() || "").catch(() => "");
        if (!name) continue;
        
        const address = await card.$eval('[class*="address"], [class*="location"]', (el) => el.textContent?.trim()).catch(() => undefined);
        const priceText = await card.$eval('[class*="price"]', (el) => el.textContent?.trim() || "").catch(() => "");
        const tenure = await card.$eval('[class*="tenure"]', (el) => el.textContent?.trim()).catch(() => undefined);
        
        const prices = parsePriceRange(priceText);
        
        condos.push({
          name,
          address,
          district: address ? extractDistrict(address) : undefined,
          status: "launched",
          tenure: tenure?.includes("Freehold") ? "Freehold" : tenure?.includes("99") ? "99-year" : undefined,
          min_price: prices.min,
          max_price: prices.max,
          source: "99.co",
        });
      } catch (e) {
        // Skip
      }
    }
    
    console.log(`   Found ${condos.length} projects`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
  
  return condos;
}

async function scrapeResaleListings(page: Page): Promise<ScrapedCondo[]> {
  console.log("\n📍 Scraping Resale Listings from PropertyGuru...");
  const condos: ScrapedCondo[] = [];
  
  try {
    // PropertyGuru resale condos
    await page.goto("https://www.propertyguru.com.sg/property-for-sale?market=residential&property_type=C&property_type_code%5B0%5D=CONDO", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    
    await page.waitForSelector('[class*="listing"]', { timeout: 10000 }).catch(() => {});
    
    const listings = await page.$$('[data-automation-id="listing-card"], [class*="listing-card"]');
    
    const seenCondos = new Set<string>();
    
    for (const listing of listings.slice(0, 50)) { // Limit to first 50
      try {
        const nameEl = await listing.$('[class*="title"], h2, h3');
        const name = nameEl ? await nameEl.textContent() : "";
        if (!name) continue;
        
        // Extract just the condo name (before the unit details)
        const condoName = name.split(/\s+#|\s+at\s+/i)[0].trim();
        
        // Skip if we've already seen this condo
        if (seenCondos.has(condoName.toLowerCase())) continue;
        seenCondos.add(condoName.toLowerCase());
        
        const address = await listing.$eval('[class*="location"], [class*="address"]', (el) => el.textContent?.trim()).catch(() => undefined);
        const priceText = await listing.$eval('[class*="price"]', (el) => el.textContent?.trim() || "").catch(() => "");
        
        const prices = parsePriceRange(priceText);
        
        condos.push({
          name: condoName,
          address,
          district: address ? extractDistrict(address) : undefined,
          status: "completed",
          min_price: prices.min,
          max_price: prices.max,
          source: "PropertyGuru Resale",
        });
      } catch (e) {
        // Skip
      }
    }
    
    console.log(`   Found ${condos.length} unique condos`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
  
  return condos;
}

async function upsertCondo(condo: ScrapedCondo): Promise<"inserted" | "updated" | "skipped"> {
  const existing = await db.execute({
    sql: "SELECT id, source FROM condos WHERE LOWER(name) = LOWER(?)",
    args: [condo.name],
  });
  
  if (existing.rows.length > 0) {
    // Update if we have new data
    const updates: string[] = [];
    const args: (string | number | null)[] = [];
    
    if (condo.developer) { updates.push("developer = ?"); args.push(condo.developer); }
    if (condo.address) { updates.push("address = ?"); args.push(condo.address); }
    if (condo.district) { updates.push("district = ?"); args.push(condo.district); }
    if (condo.tenure) { updates.push("tenure = ?"); args.push(condo.tenure); }
    if (condo.min_price) { updates.push("min_price = ?"); args.push(condo.min_price); }
    if (condo.max_price) { updates.push("max_price = ?"); args.push(condo.max_price); }
    if (condo.min_psf) { updates.push("min_psf = ?"); args.push(condo.min_psf); }
    if (condo.max_psf) { updates.push("max_psf = ?"); args.push(condo.max_psf); }
    if (condo.expected_top) { updates.push("expected_top = ?"); args.push(condo.expected_top); }
    
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
      INSERT INTO condos (name, developer, address, district, latitude, longitude,
        tenure, total_units, expected_top, launch_date, status,
        min_price, max_price, min_psf, max_psf, min_sqft, max_sqft,
        bedrooms, amenities, description, website_url, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      condo.name,
      condo.developer || null,
      condo.address || null,
      condo.district || null,
      condo.latitude || null,
      condo.longitude || null,
      condo.tenure || null,
      condo.total_units || null,
      condo.expected_top || null,
      condo.launch_date || null,
      condo.status,
      condo.min_price || null,
      condo.max_price || null,
      condo.min_psf || null,
      condo.max_psf || null,
      condo.min_sqft || null,
      condo.max_sqft || null,
      condo.bedrooms || null,
      condo.amenities || null,
      condo.description || null,
      condo.website_url || null,
      condo.image_url || null,
    ],
  });
  
  return "inserted";
}

async function main() {
  const args = process.argv.slice(2);
  const scrapeNewLaunches = args.includes("--all") || args.includes("--new-launches") || args.length === 0;
  const scrapeResale = args.includes("--all") || args.includes("--resale");
  
  console.log("🏗️  SG Condos Production Scraper");
  console.log("================================");
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Mode: ${scrapeNewLaunches && scrapeResale ? "All" : scrapeNewLaunches ? "New Launches" : "Resale"}`);
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-SG",
    timezoneId: "Asia/Singapore",
  });
  
  // Add stealth scripts
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  
  const page = await context.newPage();
  
  try {
    const allCondos: ScrapedCondo[] = [];
    
    if (scrapeNewLaunches) {
      const edgeProp = await scrapeEdgePropNewLaunches(page);
      const propertyGuru = await scrapePropertyGuruNewLaunches(page);
      const ninety9co = await scrape99coNewLaunches(page);
      allCondos.push(...edgeProp, ...propertyGuru, ...ninety9co);
    }
    
    if (scrapeResale) {
      const resale = await scrapeResaleListings(page);
      allCondos.push(...resale);
    }
    
    // Dedupe by name
    const uniqueCondos = new Map<string, ScrapedCondo>();
    for (const condo of allCondos) {
      const key = condo.name.toLowerCase().trim();
      if (!uniqueCondos.has(key)) {
        uniqueCondos.set(key, condo);
      } else {
        // Merge data
        const existing = uniqueCondos.get(key)!;
        uniqueCondos.set(key, {
          ...existing,
          developer: existing.developer || condo.developer,
          address: existing.address || condo.address,
          district: existing.district || condo.district,
          tenure: existing.tenure || condo.tenure,
          min_price: existing.min_price || condo.min_price,
          max_price: existing.max_price || condo.max_price,
          min_psf: existing.min_psf || condo.min_psf,
          max_psf: existing.max_psf || condo.max_psf,
        });
      }
    }
    
    console.log("\n📊 Summary");
    console.log("----------");
    console.log(`Total scraped: ${allCondos.length}`);
    console.log(`Unique condos: ${uniqueCondos.size}`);
    
    console.log("\n💾 Updating database...");
    let inserted = 0, updated = 0, skipped = 0;
    
    for (const condo of uniqueCondos.values()) {
      const result = await upsertCondo(condo);
      if (result === "inserted") {
        inserted++;
        console.log(`   ✓ New: ${condo.name}`);
      } else if (result === "updated") {
        updated++;
        console.log(`   ↻ Updated: ${condo.name}`);
      } else {
        skipped++;
      }
    }
    
    console.log("\n✅ Complete!");
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Finished: ${new Date().toISOString()}`);
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
