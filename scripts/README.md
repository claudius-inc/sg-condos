# SG Condos Scripts

## Data Import

### CSV/JSON Import (Recommended)
```bash
# Import from CSV
npx tsx scripts/import-condos.ts data/condos.csv

# Import from JSON
npx tsx scripts/import-condos.ts data/condos.json
```

**CSV Format:**
```csv
name,developer,address,district,tenure,total_units,expected_top,status,min_price,max_price,min_psf,max_psf,bedrooms,website_url
The Orie,CDL,Toa Payoh,12,99-year,777,2029,launched,1098000,3500000,2200,2600,"[1,2,3,4,5]",https://theorie.com.sg
```

**Status values:** `upcoming`, `launched`, `sold_out`, `completed`, `resale`

### URA Transaction Data
```bash
# Set your URA API key (get free at https://www.ura.gov.sg/maps/api/)
export URA_ACCESS_KEY=your_key

# Fetch and import URA transactions
npx tsx scripts/fetch-ura-transactions.ts
```

### Web Scraping (Limited)
```bash
# Note: Most property sites use Cloudflare - scraping is blocked
npx tsx scripts/scrape-production.ts --new-launches
npx tsx scripts/scrape-production.ts --resale
npx tsx scripts/scrape-production.ts --all
```

For reliable scraping, consider:
- [ScraperAPI](https://www.scraperapi.com/) - Proxy service that bypasses Cloudflare
- [BrightData](https://brightdata.com/) - Enterprise proxy solution

## Manual Seeding

```bash
# Seed initial new launches
npx tsx scripts/seed.ts

# Seed resale condos
npx tsx scripts/seed-resale.ts
```

## Environment Variables

Required:
- `TURSO_DATABASE_URL` - Turso database URL
- `TURSO_AUTH_TOKEN` - Turso auth token

Optional:
- `URA_ACCESS_KEY` - URA API key for transaction data

## Data Sources

| Source | Data Type | Access |
|--------|-----------|--------|
| Manual CSV | New launches | ✅ Always works |
| URA API | Transactions | ✅ Free API key |
| EdgeProp | Listings | ❌ Cloudflare blocked |
| PropertyGuru | Listings | ❌ Cloudflare blocked |
| 99.co | Listings | ❌ Cloudflare blocked |
