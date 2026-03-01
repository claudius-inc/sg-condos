/**
 * Scrape LatestProjectLaunch.com for new condo launches
 * No Cloudflare protection - easy to parse
 * 
 * Run: npx tsx scripts/scrape-latestproject.ts
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
  url: string;
  description?: string;
  tenure?: string;
  district?: number;
  location?: string;
}

function extractDistrict(text: string): number | undefined {
  const districtMap: Record<string, number> = {
    "marina bay": 1, "marina": 1, "raffles": 1, "shenton": 1, "cecil": 1,
    "tanjong pagar": 2, "chinatown": 2, "anson": 2,
    "queenstown": 3, "tiong bahru": 3, "alexandra": 3, "margaret drive": 3,
    "harbourfront": 4, "sentosa": 4, "keppel": 4, "telok blangah": 4,
    "buona vista": 5, "west coast": 5, "clementi": 5, "faber": 5,
    "city hall": 6, "beach road": 7, "bugis": 7,
    "farrer park": 8, "little india": 8, "boon keng": 8,
    "orchard": 9, "river valley": 9, "cairnhill": 9, "sophia": 9, "robertson": 9,
    "tanglin": 10, "holland": 10, "bukit timah": 10,
    "newton": 11, "novena": 11,
    "toa payoh": 12, "balestier": 12,
    "macpherson": 13, "potong pasir": 13,
    "geylang": 14, "paya lebar": 14, "eunos": 14,
    "katong": 15, "marine parade": 15, "east coast": 15, "meyer": 15,
    "bedok": 16, "bayshore": 16,
    "changi": 17, "loyang": 17,
    "tampines": 18, "pasir ris": 18,
    "serangoon": 19, "hougang": 19, "punggol": 19, "sengkang": 19, "lorong chuan": 19,
    "bishan": 20, "ang mo kio": 20,
    "upper bukit timah": 21,
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
  if (lower.includes("999 year") || lower.includes("999-year") || lower.includes("999yr")) return "999-year";
  if (lower.includes("99 year") || lower.includes("99-year") || lower.includes("99yr") || lower.includes("leasehold")) return "99-year";
  return undefined;
}

function extractNameFromUrl(url: string): string {
  // Extract name from URL like "the-orie.html" -> "The Orie"
  const match = url.match(/([^/]+)\.html$/);
  if (match) {
    return match[1]
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .replace(/Condo$/, "")
      .replace(/Ec$/, "EC")
      .trim();
  }
  return url;
}

async function scrapeLatestProject(): Promise<ScrapedProject[]> {
  console.log("📍 Fetching LatestProjectLaunch.com...");
  
  const response = await fetch("https://www.latestprojectlaunch.com/", {
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
  const seen = new Set<string>();
  
  // Find all links to project pages
  $("a[href*='.html']").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.includes("singapoproperty") || href.includes("ura.gov")) return;
    if (!href.includes("latestprojectlaunch.com") && !href.startsWith("/")) return;
    
    // Skip non-project pages
    if (href.includes("about") || href.includes("contact") || href.includes("privacy")) return;
    
    const url = href.startsWith("http") ? href : `https://www.latestprojectlaunch.com${href.startsWith("/") ? "" : "/"}${href}`;
    const name = extractNameFromUrl(href);
    
    // Skip if already seen or invalid name
    if (seen.has(name.toLowerCase()) || name.length < 3) return;
    seen.add(name.toLowerCase());
    
    // Get description from nearby text
    const parent = $(el).parent();
    const description = parent.text().trim().substring(0, 200);
    
    // Try to extract tenure and district
    const combinedText = `${name} ${description}`;
    
    projects.push({
      name,
      url,
      description: description.length > 10 ? description : undefined,
      tenure: parseTenure(combinedText),
      district: extractDistrict(combinedText),
    });
  });
  
  return projects;
}

async function fetchProjectDetails(project: ScrapedProject): Promise<ScrapedProject> {
  try {
    const response = await fetch(project.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) return project;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try to extract more details from the page
    const pageText = $("body").text().toLowerCase();
    
    if (!project.tenure) {
      project.tenure = parseTenure(pageText);
    }
    
    if (!project.district) {
      project.district = extractDistrict(pageText);
    }
    
    // Look for address/location
    const locationPatterns = [
      /located at ([^.]+)/i,
      /address[:\s]+([^.]+)/i,
      /along ([a-z\s]+ road|[a-z\s]+ avenue|[a-z\s]+ street)/i,
    ];
    
    for (const pattern of locationPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        project.location = match[1].trim().substring(0, 100);
        break;
      }
    }
    
  } catch (e) {
    // Ignore errors, use what we have
  }
  
  return project;
}

async function upsertProject(project: ScrapedProject): Promise<"inserted" | "updated" | "skipped"> {
  const existing = await db.execute({
    sql: "SELECT id FROM condos WHERE LOWER(name) = LOWER(?)",
    args: [project.name],
  });
  
  if (existing.rows.length > 0) {
    const updates: string[] = [];
    const args: (string | number | null)[] = [];
    
    if (project.district) { updates.push("district = COALESCE(district, ?)"); args.push(project.district); }
    if (project.tenure) { updates.push("tenure = COALESCE(tenure, ?)"); args.push(project.tenure); }
    if (project.location) { updates.push("address = COALESCE(address, ?)"); args.push(project.location); }
    if (project.description) { updates.push("description = COALESCE(description, ?)"); args.push(project.description); }
    if (project.url) { updates.push("website_url = COALESCE(website_url, ?)"); args.push(project.url); }
    
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
  
  await db.execute({
    sql: `
      INSERT INTO condos (name, address, district, tenure, status, description, website_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      project.name,
      project.location || null,
      project.district || null,
      project.tenure || null,
      "launched",
      project.description || null,
      project.url,
    ],
  });
  
  return "inserted";
}

async function main() {
  console.log("🏢 LatestProjectLaunch.com Scraper");
  console.log("==================================");
  console.log(`Started: ${new Date().toISOString()}`);
  
  try {
    const projects = await scrapeLatestProject();
    console.log(`\n📊 Found ${projects.length} projects\n`);
    
    // Fetch details for each project (with rate limiting)
    console.log("Fetching project details...");
    for (let i = 0; i < Math.min(projects.length, 30); i++) {
      projects[i] = await fetchProjectDetails(projects[i]);
      if (i % 5 === 0) {
        await new Promise(r => setTimeout(r, 500)); // Rate limit
      }
    }
    
    console.log("\n💾 Updating database...\n");
    
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
