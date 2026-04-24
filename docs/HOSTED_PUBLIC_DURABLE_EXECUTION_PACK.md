# Hosted Public Durable Execution Pack

## Migration order

Apply migrations in this exact order on the hosted database:

1. `db/migrations/0011_market_data_durability.sql`
   - Dependency foundation for market-series and retained market tables used by public stock, fund, index, and markets reads.
2. `db/migrations/0016_benchmark_ohlcv_history.sql`
   - Required before benchmark-history backfill.
3. `db/migrations/0018_fund_composition_snapshots.sql`
   - Creates both `fund_holding_snapshots` and `fund_sector_allocation_snapshots`.
4. `db/migrations/0019_sector_performance_snapshots.sql`
   - Required before sector-board backfill for `/markets`.
5. `db/migrations/0020_index_component_weight_snapshots.sql`
   - Required before index composition backfill for `/nifty50`, `/sensex`, `/banknifty`, `/finnifty`.
6. `db/migrations/0021_mutual_funds_benchmark_index_slug.sql`
   - Required before hosted mutual-fund benchmark mapping proof. This is a dependency for the flagship fund benchmark lane even though it is not itself a backfill table.
7. `db/migrations/0022_mutual_fund_nav_history.sql`
   - Required before scheme-history/NAV backfill.
8. `db/migrations/0023_public_data_snapshot_tables.sql`
   - Creates:
     - `fund_factsheet_snapshots`
     - `stock_fundamental_snapshots`
     - `stock_shareholding_snapshots`

## Backfill order

Run the hosted backfill in this exact order after migrations complete.

### 1. Benchmark history
- Source file: `data/benchmark-ohlcv-history.json`
- Destination table: `public.benchmark_ohlcv_history`
- Minimum hosted-proof rows:
  - `nifty50`: 252+ rows
  - `sensex`: 252+ rows
  - `banknifty`: 252+ rows
  - `finnifty`: 252+ rows
  - Current local mirror also includes:
    - `nifty100`
    - `niftymidcap150`
- Current local proof count:
  - 4,698 rows total
  - 783 rows each for:
    - `nifty50`
    - `sensex`
    - `banknifty`
    - `finnifty`
    - `nifty100`
    - `niftymidcap150`
- Representative routes:
  - `/stocks/tata-motors`
  - `/mutual-funds/hdfc-mid-cap-opportunities`
  - `/nifty50`
  - `/markets`

### 2. Mutual-fund NAV history
- Source file: `data/mutual-fund-nav-history.json`
- Destination table: `public.mutual_fund_nav_history`
- Minimum hosted-proof rows:
  - 252+ rows per flagship fund
- Current local proof count:
  - `hdfc-mid-cap-opportunities`: 739 NAV rows
  - `sbi-bluechip-fund`: 747 NAV rows
- Representative routes:
  - `/mutual-funds/hdfc-mid-cap-opportunities`
  - `/mutual-funds/sbi-bluechip-fund`

### 3. Fund factsheets
- Source file: `data/fund-factsheets.json`
- Destination table: `public.fund_factsheet_snapshots`
- Minimum hosted-proof rows:
  - 1 latest factsheet row per flagship fund
- Current local proof rows:
  - `hdfc-mid-cap-opportunities`
  - `sbi-bluechip-fund`
- Representative routes:
  - `/mutual-funds/hdfc-mid-cap-opportunities`
  - `/mutual-funds/sbi-bluechip-fund`

### 4. Fund holdings
- Source file: `data/fund-holding-snapshots.json`
- Destination table: `public.fund_holding_snapshots`
- Minimum hosted-proof rows:
  - 1 latest snapshot per flagship fund
  - 5+ holdings in `payload_json`
- Current local proof rows:
  - `hdfc-mid-cap-opportunities`
  - `sbi-bluechip-fund`
- Representative routes:
  - `/mutual-funds/hdfc-mid-cap-opportunities`
  - `/mutual-funds/sbi-bluechip-fund`

### 5. Fund sector allocation
- Source file: `data/fund-sector-allocation-snapshots.json`
- Destination table: `public.fund_sector_allocation_snapshots`
- Minimum hosted-proof rows:
  - 1 latest snapshot per flagship fund
  - 5+ sectors in `payload_json`
- Current local proof rows:
  - `hdfc-mid-cap-opportunities`
  - `sbi-bluechip-fund`
- Representative routes:
  - `/mutual-funds/hdfc-mid-cap-opportunities`
  - `/mutual-funds/sbi-bluechip-fund`

### 6. Stock fundamentals
- Source file: `data/stock-fundamentals.json`
- Destination table: `public.stock_fundamental_snapshots`
- Minimum hosted-proof rows:
  - 4 stock rows:
    - `tata-motors`
    - `infosys`
    - `hdfc-bank`
    - `reliance-industries`
- Representative routes:
  - `/stocks/tata-motors`
  - `/stocks/infosys`
  - `/stocks/hdfc-bank`
  - `/stocks/reliance-industries`

### 7. Stock shareholding
- Source file: `data/stock-shareholding.json`
- Destination table: `public.stock_shareholding_snapshots`
- Minimum hosted-proof rows:
  - 4 stock rows:
    - `tata-motors`
    - `infosys`
    - `hdfc-bank`
    - `reliance-industries`
- Representative routes:
  - `/stocks/tata-motors`
  - `/stocks/infosys`
  - `/stocks/hdfc-bank`
  - `/stocks/reliance-industries`

### 8. Sector performance
- Source file: `data/sector-performance-snapshots.json`
- Destination table: `public.sector_performance_snapshots`
- Minimum hosted-proof rows:
  - 6 sectors:
    - `auto`
    - `it-services`
    - `banking`
    - `consumer`
    - `pharma`
    - `energy`
- Representative route:
  - `/markets`

### 9. Index composition snapshots
- Source file: `data/index-component-weight-snapshots.json`
- Destination table: `public.index_component_weight_snapshots`
- Minimum hosted-proof rows:
  - 1 latest snapshot row each for:
    - `nifty50`
    - `sensex`
    - `banknifty`
    - `finnifty`
- Current local component depth:
  - `nifty50`: 15 rows in payload
  - `sensex`: 15 rows in payload
  - `banknifty`: 12 rows in payload
  - `finnifty`: 15 rows in payload
- Representative routes:
  - `/nifty50`
  - `/sensex`
  - `/banknifty`
  - `/finnifty`

## Hosted-proof minimum coverage

### Stock
- Hosted DB must contain fundamentals + shareholding rows for:
  - `tata-motors`
  - `infosys`
  - `hdfc-bank`
  - `reliance-industries`

### Mutual fund
- Hosted DB must contain:
  - NAV history
  - factsheet snapshot
  - holdings snapshot
  - sector allocation snapshot
for:
  - `hdfc-mid-cap-opportunities`
  - `sbi-bluechip-fund`

### Index
- Hosted DB must contain:
  - benchmark history for:
    - `nifty50`
    - `sensex`
    - `banknifty`
    - `finnifty`
  - composition snapshots for:
    - `nifty50`
    - `sensex`
    - `banknifty`
    - `finnifty`

### Markets
- Hosted DB must contain:
  - benchmark rows for:
    - `nifty50`
    - `sensex`
    - `banknifty`
  - sector rows for:
    - `auto`
    - `it-services`
    - `banking`
    - `consumer`
    - `pharma`
    - `energy`

## Execution helper

Generate a deterministic hosted SQL backfill pack from the local JSON mirrors:

```bash
node scripts/generate-public-durable-backfill-sql.mjs > /tmp/public-durable-backfill.sql
```

This helper:
- deletes only the covered proof slugs/indexes/sectors before reinserting
- emits SQL for all 9 durable public lanes
- does not deploy or write to the hosted DB directly

## Hosted-proof execution sequence

1. Apply migrations through `0023`.
2. Generate SQL with `scripts/generate-public-durable-backfill-sql.mjs`.
3. Run the generated SQL against hosted Supabase/Postgres.
4. Verify representative pages:
   - `/stocks/tata-motors`
   - `/mutual-funds/hdfc-mid-cap-opportunities`
   - `/nifty50`
   - `/markets`
5. Verify the additional coverage routes:
   - `/stocks/infosys`
   - `/stocks/hdfc-bank`
   - `/stocks/reliance-industries`
   - `/mutual-funds/sbi-bluechip-fund`
   - `/sensex`
   - `/banknifty`
   - `/finnifty`
