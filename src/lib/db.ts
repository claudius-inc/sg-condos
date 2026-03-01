import { createClient } from "@libsql/client";

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  console.warn("TURSO_DATABASE_URL not set - database operations will fail");
}

export const db = createClient({
  url: dbUrl || "libsql://localhost:8080",
  authToken: dbToken,
});

// Initialize schema
export async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS condos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      developer TEXT,
      address TEXT,
      district INTEGER,
      latitude REAL,
      longitude REAL,
      tenure TEXT,
      total_units INTEGER,
      expected_top TEXT,
      launch_date TEXT,
      status TEXT DEFAULT 'upcoming',
      min_price INTEGER,
      max_price INTEGER,
      min_psf INTEGER,
      max_psf INTEGER,
      min_sqft INTEGER,
      max_sqft INTEGER,
      bedrooms TEXT,
      amenities TEXT,
      description TEXT,
      website_url TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export type Condo = {
  id: number;
  name: string;
  developer: string | null;
  address: string | null;
  district: number | null;
  latitude: number | null;
  longitude: number | null;
  tenure: string | null;
  total_units: number | null;
  expected_top: string | null;
  launch_date: string | null;
  status: string | null;
  min_price: number | null;
  max_price: number | null;
  min_psf: number | null;
  max_psf: number | null;
  min_sqft: number | null;
  max_sqft: number | null;
  bedrooms: string | null;
  amenities: string | null;
  description: string | null;
  website_url: string | null;
  image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};
