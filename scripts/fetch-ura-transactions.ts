/**
 * Fetch URA private residential transactions
 * 
 * URA provides free transaction data with a delay (usually 4-6 weeks)
 * This script fetches recent transactions to identify active projects and price trends
 * 
 * Usage: npx tsx scripts/fetch-ura-transactions.ts
 * 
 * Note: Requires URA API key - get one free at https://www.ura.gov.sg/maps/api/
 */

import { createClient } from "@libsql/client";

const URA_ACCESS_KEY = process.env.URA_ACCESS_KEY;
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

interface URATransaction {
  project: string;
  street: string;
  x: string; // SVY21 coordinate
  y: string;
  marketSegment: string;
  area: string;
  floorRange: string;
  noOfUnits: string;
  contractDate: string;
  typeOfSale: string;
  price: string;
  propertyType: string;
  district: string;
  typeOfArea: string;
  tenure: string;
  nettPrice?: string;
}

// Convert SVY21 to WGS84 (approximate)
function svy21ToWgs84(x: number, y: number): { lat: number; lon: number } {
  // Simplified conversion (accurate to ~100m for Singapore)
  const lat = 1.2866 + (y - 30000) / 111320;
  const lon = 103.8 + (x - 30000) / (111320 * Math.cos(1.3 * Math.PI / 180));
  return { lat, lon };
}

async function fetchURAToken(): Promise<string | null> {
  if (!URA_ACCESS_KEY) {
    console.log("⚠️  URA_ACCESS_KEY not set. Get one free at https://www.ura.gov.sg/maps/api/");
    return null;
  }
  
  const response = await fetch("https://www.ura.gov.sg/uraDataService/insertNewToken.action", {
    method: "GET",
    headers: {
      "AccessKey": URA_ACCESS_KEY,
    },
  });
  
  if (!response.ok) {
    console.error("Failed to get URA token:", response.status);
    return null;
  }
  
  const data = await response.json();
  return data.Result;
}

async function fetchTransactions(token: string, batch: number = 1): Promise<URATransaction[]> {
  const response = await fetch(
    `https://www.ura.gov.sg/uraDataService/invokeUraDS?service=PMI_Resi_Transaction&batch=${batch}`,
    {
      headers: {
        "AccessKey": URA_ACCESS_KEY!,
        "Token": token,
      },
    }
  );
  
  if (!response.ok) {
    console.error(`Failed to fetch batch ${batch}:`, response.status);
    return [];
  }
  
  const data = await response.json();
  return data.Result || [];
}

async function updateCondoFromTransactions(projectName: string, transactions: URATransaction[]) {
  if (transactions.length === 0) return;
  
  const first = transactions[0];
  const prices = transactions.map(t => parseInt(t.price)).filter(p => !isNaN(p));
  const areas = transactions.map(t => parseInt(t.area)).filter(a => !isNaN(a));
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minSqft = Math.min(...areas);
  const maxSqft = Math.max(...areas);
  
  // Calculate PSF
  const psfs = transactions
    .filter(t => parseInt(t.price) && parseInt(t.area))
    .map(t => Math.round(parseInt(t.price) / parseInt(t.area)));
  
  const minPsf = psfs.length ? Math.min(...psfs) : null;
  const maxPsf = psfs.length ? Math.max(...psfs) : null;
  
  // Get coordinates
  let latitude = null, longitude = null;
  if (first.x && first.y) {
    const coords = svy21ToWgs84(parseFloat(first.x), parseFloat(first.y));
    latitude = Math.round(coords.lat * 10000) / 10000;
    longitude = Math.round(coords.lon * 10000) / 10000;
  }
  
  // Check if exists
  const existing = await db.execute({
    sql: "SELECT id FROM condos WHERE LOWER(name) = LOWER(?)",
    args: [projectName],
  });
  
  if (existing.rows.length > 0) {
    await db.execute({
      sql: `
        UPDATE condos SET
          address = COALESCE(address, ?),
          district = COALESCE(district, ?),
          latitude = COALESCE(latitude, ?),
          longitude = COALESCE(longitude, ?),
          tenure = COALESCE(tenure, ?),
          min_price = ?,
          max_price = ?,
          min_psf = ?,
          max_psf = ?,
          min_sqft = COALESCE(min_sqft, ?),
          max_sqft = COALESCE(max_sqft, ?),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        first.street,
        first.district ? parseInt(first.district) : null,
        latitude, longitude,
        first.tenure,
        minPrice, maxPrice,
        minPsf, maxPsf,
        minSqft, maxSqft,
        existing.rows[0].id,
      ],
    });
    return "updated";
  }
  
  // Insert new
  await db.execute({
    sql: `
      INSERT INTO condos (
        name, address, district, latitude, longitude, tenure,
        status, min_price, max_price, min_psf, max_psf, min_sqft, max_sqft
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      projectName,
      first.street,
      first.district ? parseInt(first.district) : null,
      latitude, longitude,
      first.tenure,
      "completed", // URA data is for completed transactions
      minPrice, maxPrice,
      minPsf, maxPsf,
      minSqft, maxSqft,
    ],
  });
  return "inserted";
}

async function main() {
  console.log("🏢 URA Transaction Data Fetcher");
  console.log("================================");
  
  if (!URA_ACCESS_KEY) {
    console.log("\n⚠️  No URA_ACCESS_KEY set.");
    console.log("\nTo use this script:");
    console.log("1. Get a free API key at https://www.ura.gov.sg/maps/api/");
    console.log("2. Set: export URA_ACCESS_KEY=your_key");
    console.log("3. Run again");
    
    console.log("\n📝 Alternative: Use import-condos.ts with a CSV file");
    process.exit(0);
  }
  
  console.log("\nFetching URA token...");
  const token = await fetchURAToken();
  
  if (!token) {
    console.error("Failed to get URA token");
    process.exit(1);
  }
  
  console.log("Fetching transactions...");
  
  // Fetch all batches (URA provides data in 4 batches)
  const allTransactions: URATransaction[] = [];
  for (let batch = 1; batch <= 4; batch++) {
    const transactions = await fetchTransactions(token, batch);
    allTransactions.push(...transactions);
    console.log(`  Batch ${batch}: ${transactions.length} transactions`);
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }
  
  console.log(`\nTotal transactions: ${allTransactions.length}`);
  
  // Group by project
  const byProject = new Map<string, URATransaction[]>();
  for (const tx of allTransactions) {
    const name = tx.project;
    if (!byProject.has(name)) {
      byProject.set(name, []);
    }
    byProject.get(name)!.push(tx);
  }
  
  console.log(`Unique projects: ${byProject.size}`);
  console.log("\nUpdating database...");
  
  let inserted = 0, updated = 0;
  for (const [projectName, transactions] of byProject) {
    const result = await updateCondoFromTransactions(projectName, transactions);
    if (result === "inserted") inserted++;
    else if (result === "updated") updated++;
  }
  
  console.log(`\n✅ Done!`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated: ${updated}`);
}

main().catch(console.error);
