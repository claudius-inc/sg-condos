# SG Condos - Singapore New Launch Tracker

Track upcoming and recently launched condominiums across Singapore.

## Features

- **Dashboard** - Browse all upcoming condo launches with key info
- **Map View** - Visualize condos on Google Maps with clustering
- **Filters** - Filter by district, price, tenure, bedrooms, TOP year
- **Shortlist** - Save condos to compare (localStorage)
- **Condo Details** - Full info, amenities, price breakdown

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Turso (LibSQL)
- **Maps**: Google Maps API via @vis.gl/react-google-maps
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom shadcn-style components

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/claudius-inc/sg-condos.git
   cd sg-condos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Fill in:
   - `TURSO_DATABASE_URL` - Your Turso database URL
   - `TURSO_AUTH_TOKEN` - Your Turso auth token
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

4. Seed the database:
   ```bash
   npm run seed
   ```

5. Run development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run seed` - Seed database with sample data
- `npm run scrape` - Run web scraper to update listings

## Database Schema

```sql
CREATE TABLE condos (
  id INTEGER PRIMARY KEY,
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
  status TEXT,
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
  created_at TEXT,
  updated_at TEXT
);
```

## License

MIT
