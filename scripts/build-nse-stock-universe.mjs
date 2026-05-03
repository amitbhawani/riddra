import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const NSE_EQUITY_LIST_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv";
const DEFAULT_BATCH_SIZE = 40;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for NSE stock-universe build.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPositiveEnvNumber(name, fallback) {
  const parsed = Number(process.env[name] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRequestsPerSecond() {
  return readPositiveEnvNumber("YAHOO_FINANCE_REQUESTS_PER_SECOND", 1);
}

function getMaxRetries() {
  return Math.max(0, Math.floor(readPositiveEnvNumber("YAHOO_FINANCE_MAX_RETRIES", 3)));
}

function getRetryBaseMs() {
  return readPositiveEnvNumber("YAHOO_FINANCE_RETRY_BASE_MS", 1000);
}

function getYahooTimeoutMs() {
  return readPositiveEnvNumber("YAHOO_FINANCE_TIMEOUT_MS", 12000);
}

function getBatchSize() {
  return Math.max(1, Math.min(100, Math.floor(readPositiveEnvNumber("NSE_STOCK_UNIVERSE_VALIDATION_BATCH_SIZE", DEFAULT_BATCH_SIZE))));
}

function buildSlug(value) {
  return cleanString(value, 240)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSymbol(value) {
  return cleanString(value, 80).toUpperCase();
}

function normalizeYahooSymbol(value) {
  const symbol = normalizeSymbol(value);
  return symbol.endsWith(".NS") ? symbol : `${symbol}.NS`;
}

function isBatchSafeYahooSymbol(yahooSymbol) {
  return /^[A-Z0-9.-]+\.NS$/.test(cleanString(yahooSymbol, 120).toUpperCase());
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((item) => cleanString(item, 200));
  return rows.slice(1).map((cells) => {
    const record = {};
    for (let index = 0; index < headers.length; index += 1) {
      record[headers[index]] = cleanString(cells[index], 1000);
    }
    return record;
  });
}

async function fetchNseEquityList() {
  const response = await fetch(NSE_EQUITY_LIST_URL, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(getYahooTimeoutMs()),
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "RiddraNseUniverseBuilder/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`NSE equity list fetch failed with status ${response.status}.`);
  }

  const csvText = await response.text();
  return parseCsv(csvText);
}

async function fetchAllRows(tableName, select = "*") {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.from(tableName).select(select).range(offset, offset + pageSize - 1);
    if (error) {
      throw new Error(`Could not read ${tableName}. ${error.message}`);
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    offset += batch.length;
  }

  return rows;
}

async function fetchYahooSparkBatch(symbols, attempt = 1) {
  const url = new URL("https://query1.finance.yahoo.com/v7/finance/spark");
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("range", "5d");
  url.searchParams.set("interval", "1d");
  url.searchParams.set("indicators", "close");
  url.searchParams.set("includeTimestamps", "true");
  url.searchParams.set("includePrePost", "false");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(getYahooTimeoutMs()),
    headers: {
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "RiddraNseUniverseBuilder/1.0",
    },
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { rawText: text };
  }

  if (!response.ok) {
    if (attempt <= getMaxRetries()) {
      await sleep(getRetryBaseMs() * 2 ** (attempt - 1));
      return fetchYahooSparkBatch(symbols, attempt + 1);
    }
    throw new Error(`Yahoo spark validation failed with status ${response.status}.`);
  }

  const results = Array.isArray(payload?.spark?.result) ? payload.spark.result : [];
  return {
    responseStatus: response.status,
    requestUrl: url.toString(),
    results,
  };
}

async function validateYahooSparkSymbols(symbols, diagnostics, depth = 0) {
  try {
    const batchResult = await fetchYahooSparkBatch(symbols);
    diagnostics.push({
      type: "batch",
      depth,
      symbolCount: symbols.length,
      responseStatus: batchResult.responseStatus,
      requestUrl: batchResult.requestUrl,
      success: true,
    });
    return extractValidatedSymbols(batchResult.results);
  } catch (error) {
    const message = cleanString(error?.message ?? error, 1000);
    diagnostics.push({
      type: "batch",
      depth,
      symbolCount: symbols.length,
      responseStatus: 400,
      requestUrl: null,
      success: false,
      error: message,
      sampleSymbols: symbols.slice(0, 8),
    });

    if (symbols.length === 1) {
      return new Map([
        [
          symbols[0],
          {
            yahooSymbol: symbols[0],
            valid: false,
            exchangeName: null,
            companyName: null,
            latestTimestamp: null,
            latestPrice: null,
            latestClose: null,
            marketState: null,
            validationError: message,
          },
        ],
      ]);
    }

    const midpoint = Math.ceil(symbols.length / 2);
    const left = symbols.slice(0, midpoint);
    const right = symbols.slice(midpoint);
    const merged = new Map();

    const leftResults = await validateYahooSparkSymbols(left, diagnostics, depth + 1);
    for (const [key, value] of leftResults.entries()) {
      merged.set(key, value);
    }

    await sleep(Math.max(250, Math.round(1000 / getRequestsPerSecond())));

    const rightResults = await validateYahooSparkSymbols(right, diagnostics, depth + 1);
    for (const [key, value] of rightResults.entries()) {
      merged.set(key, value);
    }

    return merged;
  }
}

function extractValidatedSymbols(batchResults) {
  const availability = new Map();

  for (const entry of batchResults) {
    const yahooSymbol = normalizeYahooSymbol(entry?.symbol ?? "");
    const response = Array.isArray(entry?.response) ? entry.response[0] ?? {} : {};
    const meta = response?.meta ?? {};
    const closes = Array.isArray(response?.indicators?.quote?.[0]?.close)
      ? response.indicators.quote[0].close.filter((value) => value !== null && value !== undefined)
      : [];
    const timestamps = Array.isArray(response?.timestamp) ? response.timestamp : [];
    const valid =
      cleanString(meta?.symbol, 120).toUpperCase() === yahooSymbol &&
      timestamps.length > 0 &&
      closes.length > 0;

    availability.set(yahooSymbol, {
      yahooSymbol,
      valid,
      exchangeName: cleanString(meta?.exchangeName, 120) || null,
      companyName:
        cleanString(meta?.longName, 240) ||
        cleanString(meta?.shortName, 240) ||
        null,
      latestTimestamp:
        typeof meta?.regularMarketTime === "number"
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : null,
      latestPrice:
        typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null,
      latestClose:
        closes.length ? Number(closes[closes.length - 1]) : null,
      marketState: cleanString(meta?.marketState, 80) || null,
    });
  }

  return availability;
}

function createUniqueSlug(preferredBaseSlug, usedSlugs, symbol) {
  let candidate = preferredBaseSlug || buildSlug(symbol) || symbol.toLowerCase();
  if (!usedSlugs.has(candidate)) {
    usedSlugs.add(candidate);
    return candidate;
  }

  candidate = `${candidate}-${buildSlug(symbol) || symbol.toLowerCase()}`;
  if (!usedSlugs.has(candidate)) {
    usedSlugs.add(candidate);
    return candidate;
  }

  let suffix = 2;
  while (usedSlugs.has(`${candidate}-${suffix}`)) {
    suffix += 1;
  }
  const finalSlug = `${candidate}-${suffix}`;
  usedSlugs.add(finalSlug);
  return finalSlug;
}

async function main() {
  const startedAt = new Date().toISOString();
  const nseRows = await fetchNseEquityList();

  const eqRows = nseRows.filter((row) => normalizeSymbol(row.SERIES) === "EQ");
  const dedupedBySymbol = new Map();
  for (const row of eqRows) {
    const symbol = normalizeSymbol(row.SYMBOL);
    if (!symbol) {
      continue;
    }
    if (!dedupedBySymbol.has(symbol)) {
      dedupedBySymbol.set(symbol, row);
    }
  }

  const candidateRows = Array.from(dedupedBySymbol.values());
  const candidateYahooSymbols = candidateRows.map((row) => normalizeYahooSymbol(row.SYMBOL));

  const validationBatchSize = getBatchSize();
  const batchSafeSymbols = candidateYahooSymbols.filter((symbol) => isBatchSafeYahooSymbol(symbol));
  const isolatedSymbols = candidateYahooSymbols.filter((symbol) => !isBatchSafeYahooSymbol(symbol));
  const symbolBatches = [
    ...chunk(batchSafeSymbols, validationBatchSize),
    ...isolatedSymbols.map((symbol) => [symbol]),
  ];
  const requestsPerSecond = getRequestsPerSecond();
  const throttleMs = Math.max(1000, Math.round(1000 / requestsPerSecond));
  const availability = new Map();
  const batchDiagnostics = [];

  for (let index = 0; index < symbolBatches.length; index += 1) {
    const batch = symbolBatches[index];
    const batchAvailability = await validateYahooSparkSymbols(batch, batchDiagnostics);
    for (const [key, value] of batchAvailability.entries()) {
      availability.set(key, value);
    }
    batchDiagnostics.push({
      type: "summary",
      batchNumber: index + 1,
      symbolCount: batch.length,
      validatedInBatch: Array.from(batchAvailability.values()).filter((item) => item.valid).length,
    });
    if ((index + 1) % 10 === 0 || index === symbolBatches.length - 1) {
      console.error(
        `[nse-universe-build] validated batch ${index + 1}/${symbolBatches.length} (${batch.length} symbols in current batch)`,
      );
    }
    if (index < symbolBatches.length - 1) {
      await sleep(throttleMs);
    }
  }

  const unavailableSymbols = [];
  const validatedRows = [];
  for (const row of candidateRows) {
    const symbol = normalizeSymbol(row.SYMBOL);
    const yahooSymbol = normalizeYahooSymbol(symbol);
    const validation = availability.get(yahooSymbol);
    if (!validation?.valid) {
      unavailableSymbols.push({
        symbol,
        yahooSymbol,
        companyName: cleanString(row["NAME OF COMPANY"], 240) || null,
      });
      continue;
    }

    validatedRows.push({
      symbol,
      yahooSymbol,
      companyName: validation.companyName || cleanString(row["NAME OF COMPANY"], 240) || symbol,
      listingDate: cleanString(row["DATE OF LISTING"], 80) || null,
      isin: cleanString(row["ISIN NUMBER"], 80) || null,
      faceValue: safeInteger(row["FACE VALUE"]),
      paidUpValue: safeInteger(row["PAID UP VALUE"]),
      marketLot: safeInteger(row["MARKET LOT"]),
      series: normalizeSymbol(row.SERIES) || "EQ",
      validation,
    });
  }

  const [existingStocks, existingInstruments, existingCompanies] = await Promise.all([
    fetchAllRows("stocks_master", "id, instrument_id, slug, symbol, company_name, yahoo_symbol, exchange, status, metadata"),
    fetchAllRows("instruments", "id, slug, symbol, name, exchange, instrument_type, status"),
    fetchAllRows("companies", "instrument_id, legal_name"),
  ]);

  const existingByYahoo = new Map();
  const existingBySymbol = new Map();
  const usedSlugs = new Set();
  for (const row of existingStocks) {
    const yahooSymbol = normalizeYahooSymbol(row.yahoo_symbol ?? "");
    const symbol = normalizeSymbol(row.symbol ?? "");
    if (yahooSymbol) {
      existingByYahoo.set(yahooSymbol, row);
    }
    if (symbol) {
      existingBySymbol.set(symbol, row);
    }
    if (cleanString(row.slug, 240)) {
      usedSlugs.add(cleanString(row.slug, 240));
    }
  }

  const instrumentBySymbol = new Map();
  for (const row of existingInstruments) {
    if (["stock", "equity"].includes(cleanString(row.instrument_type, 80).toLowerCase())) {
      instrumentBySymbol.set(normalizeSymbol(row.symbol ?? ""), row);
      if (cleanString(row.slug, 240)) {
        usedSlugs.add(cleanString(row.slug, 240));
      }
    }
  }

  const companyByInstrumentId = new Map();
  for (const row of existingCompanies) {
    const instrumentId = cleanString(row.instrument_id, 160);
    if (instrumentId) {
      companyByInstrumentId.set(instrumentId, row);
    }
  }

  const importedAt = new Date().toISOString();
  const upsertRows = [];
  let reusedExistingSlugCount = 0;
  let reusedInstrumentSlugCount = 0;
  let generatedSlugCount = 0;
  let newUniverseRows = 0;
  let updatedUniverseRows = 0;

  for (const row of validatedRows) {
    const existingRow = existingByYahoo.get(row.yahooSymbol) ?? existingBySymbol.get(row.symbol) ?? null;
    const instrumentRow = instrumentBySymbol.get(row.symbol) ?? null;
    const instrumentId = cleanString(existingRow?.instrument_id, 160) || cleanString(instrumentRow?.id, 160) || null;
    const companyRow = instrumentId ? companyByInstrumentId.get(instrumentId) ?? null : null;

    let slug = cleanString(existingRow?.slug, 240);
    if (slug) {
      reusedExistingSlugCount += 1;
    } else {
      slug = cleanString(instrumentRow?.slug, 240);
      if (slug) {
        reusedInstrumentSlugCount += 1;
      }
    }

    if (!slug) {
      slug = createUniqueSlug(buildSlug(row.companyName), usedSlugs, row.symbol);
      generatedSlugCount += 1;
    }

    const existingMetadata =
      existingRow && existingRow.metadata && typeof existingRow.metadata === "object" && !Array.isArray(existingRow.metadata)
        ? existingRow.metadata
        : {};

    if (existingRow) {
      updatedUniverseRows += 1;
    } else {
      newUniverseRows += 1;
    }

    upsertRows.push({
      slug,
      instrument_id: instrumentId,
      symbol: row.symbol,
      company_name:
        cleanString(companyRow?.legal_name, 240) ||
        cleanString(instrumentRow?.name, 240) ||
        row.companyName,
      yahoo_symbol: row.yahooSymbol,
      exchange: "NSE",
      quote_currency: "INR",
      market: "NSE",
      status: "active",
      primary_source_code: "yahoo_finance",
      source_name: "nse_universe_build",
      source_url: NSE_EQUITY_LIST_URL,
      metadata: {
        ...existingMetadata,
        universe_build: {
          source: "nse_equity_list",
          source_url: NSE_EQUITY_LIST_URL,
          listing_date: row.listingDate,
          isin: row.isin,
          face_value: row.faceValue,
          paid_up_value: row.paidUpValue,
          market_lot: row.marketLot,
          series: row.series,
          yahoo_validation: {
            valid: true,
            exchange_name: row.validation.exchangeName,
            company_name: row.validation.companyName,
            latest_timestamp: row.validation.latestTimestamp,
            latest_price: row.validation.latestPrice,
            latest_close: row.validation.latestClose,
            market_state: row.validation.marketState,
            validated_at: importedAt,
          },
        },
      },
      imported_at: importedAt,
      updated_at: importedAt,
      created_at: cleanString(existingRow?.created_at, 120) || importedAt,
    });
  }

  for (const batch of chunk(upsertRows, 250)) {
    const { error } = await supabase.from("stocks_master").upsert(batch, { onConflict: "slug" });
    if (error) {
      throw new Error(`Could not upsert stocks_master NSE universe rows. ${error.message}`);
    }
  }

  const finalStocks = await fetchAllRows("stocks_master", "id, slug, symbol, yahoo_symbol");
  const finalDistinctYahooSymbols = new Set(
    finalStocks.map((row) => normalizeYahooSymbol(row.yahoo_symbol ?? "")).filter(Boolean),
  );

  const completedAt = new Date().toISOString();
  const actualValidationRequests = batchDiagnostics.filter((item) => item.type === "batch").length;
  const failedValidationRequests = batchDiagnostics.filter((item) => item.type === "batch" && item.success === false).length;
  const reportData = {
    ok: true,
    startedAt,
    completedAt,
    projectUrl: supabaseUrl,
    sourceUrl: NSE_EQUITY_LIST_URL,
    filters: {
      series: "EQ",
      exchange: "NSE",
      yahooSuffix: ".NS",
    },
    counts: {
      nseCsvRows: nseRows.length,
      eqRows: eqRows.length,
      dedupedEqSymbols: candidateRows.length,
      yahooValidatedSymbols: validatedRows.length,
      yahooUnavailableSymbols: unavailableSymbols.length,
      upsertedRows: upsertRows.length,
      newUniverseRows,
      updatedUniverseRows,
      finalStocksMasterRows: finalStocks.length,
      finalDistinctYahooSymbols: finalDistinctYahooSymbols.size,
    },
    slugStrategy: {
      reusedExistingSlugCount,
      reusedInstrumentSlugCount,
      generatedSlugCount,
    },
    validation: {
      requestBatches: symbolBatches.length,
      actualValidationRequests,
      failedValidationRequests,
      requestPace: `${requestsPerSecond} req/sec`,
      batchSize: validationBatchSize,
      batchSafeSymbols: batchSafeSymbols.length,
      isolatedSymbols: isolatedSymbols.length,
    },
    samples: {
      firstValidatedSymbols: validatedRows.slice(0, 10).map((row) => ({
        symbol: row.symbol,
        yahooSymbol: row.yahooSymbol,
        companyName: row.companyName,
      })),
      unavailableSymbols: unavailableSymbols.slice(0, 25),
    },
    note: "This build validates Yahoo symbol availability only. It does not import Yahoo raw or normalized market-data buckets.",
  };

  const docsPath = path.join(process.cwd(), "docs", "riddra-stock-universe-build-report.md");
  const reportMarkdown = `# Riddra Stock Universe Build Report

Last updated: 2026-04-29 IST

## Summary

Built a clean NSE stock universe into \`stocks_master\` from the official NSE equity list CSV and validated each candidate against Yahoo Finance availability before storing it.

- Source URL: \`${NSE_EQUITY_LIST_URL}\`
- Exchange stored: \`NSE\`
- Yahoo suffix used: \`.NS\`
- Validation mode: Yahoo \`spark\` endpoint batches, no raw Yahoo import tables touched
- Request pace: \`${requestsPerSecond} req/sec\`

## Result Counts

| Metric | Count |
|---|---:|
| NSE CSV rows | ${reportData.counts.nseCsvRows} |
| EQ-series rows | ${reportData.counts.eqRows} |
| Deduplicated EQ symbols | ${reportData.counts.dedupedEqSymbols} |
| Yahoo-validated symbols | ${reportData.counts.yahooValidatedSymbols} |
| Yahoo-unavailable symbols | ${reportData.counts.yahooUnavailableSymbols} |
| Upserted \`stocks_master\` rows | ${reportData.counts.upsertedRows} |
| New universe rows | ${reportData.counts.newUniverseRows} |
| Updated existing rows | ${reportData.counts.updatedUniverseRows} |
| Final \`stocks_master\` rows | ${reportData.counts.finalStocksMasterRows} |
| Final distinct Yahoo symbols | ${reportData.counts.finalDistinctYahooSymbols} |

## Validation Strategy

- filtered the official NSE equity list to \`SERIES = EQ\`
- deduplicated by \`SYMBOL\`
- normalized every candidate as \`<SYMBOL>.NS\`
- validated availability through Yahoo’s multi-symbol \`spark\` endpoint
- stayed within safe pacing instead of running the full Yahoo data importer

Validation diagnostics:

- top-level request batches: ${reportData.validation.requestBatches}
- actual validation requests after recursive fallback: ${reportData.validation.actualValidationRequests}
- failed batch requests retried by recursive split: ${reportData.validation.failedValidationRequests}
- batch size: ${reportData.validation.batchSize}
- request pace: ${reportData.validation.requestPace}
- batch-safe symbols: ${reportData.validation.batchSafeSymbols}
- isolated special-case symbols: ${reportData.validation.isolatedSymbols}

## Stored Fields

Rows written to \`stocks_master\` include:

- \`symbol\`
- \`yahoo_symbol\`
- \`company_name\`
- \`exchange = NSE\`
- \`status = active\`

Also preserved where possible:

- existing Riddra \`slug\`
- existing \`instrument_id\`
- listing metadata in \`metadata.universe_build\`

## Slug Handling

| Strategy | Count |
|---|---:|
| Reused existing \`stocks_master\` slug | ${reportData.slugStrategy.reusedExistingSlugCount} |
| Reused existing \`instruments\` slug | ${reportData.slugStrategy.reusedInstrumentSlugCount} |
| Generated new slug | ${reportData.slugStrategy.generatedSlugCount} |

## Sample Validated Symbols

| Symbol | Yahoo Symbol | Company |
|---|---|---|
${reportData.samples.firstValidatedSymbols.map((row) => `| ${row.symbol} | ${row.yahooSymbol} | ${row.companyName} |`).join("\n")}

## Sample Yahoo-Unavailable Symbols

| Symbol | Yahoo Symbol | Company |
|---|---|---|
${(reportData.samples.unavailableSymbols.length
  ? reportData.samples.unavailableSymbols.map((row) => `| ${row.symbol} | ${row.yahooSymbol} | ${row.companyName ?? ""} |`).join("\n")
  : "| None in sampled failures |  |  |")}

## Notes

- No Yahoo market-data import was run in this step.
- No \`raw_yahoo_imports\` rows were created by this universe build.
- The build only prepared a clean, validated stock universe for future import batches.
`;

  fs.writeFileSync(docsPath, `${reportMarkdown}\n`, "utf8");
  console.log(JSON.stringify(reportData, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: cleanString(error?.message ?? error, 6000),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
