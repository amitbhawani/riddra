import fs from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);

function resolveAliasCandidate(specifier) {
  if (!specifier.startsWith("@/")) {
    return null;
  }

  const relativePath = specifier.slice(2);
  const basePath = path.join(process.cwd(), relativePath);
  const directCandidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs"),
  ];

  return directCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolveNextPackageCandidate(specifier) {
  if (!specifier.startsWith("next/") || path.extname(specifier)) {
    return null;
  }

  try {
    return require.resolve(`${specifier}.js`);
  } catch {
    return null;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliasCandidate = resolveAliasCandidate(specifier);

    if (aliasCandidate) {
      return {
        shortCircuit: true,
        url: pathToFileURL(aliasCandidate).href,
      };
    }

    const nextPackageCandidate = resolveNextPackageCandidate(specifier);

    if (nextPackageCandidate) {
      return {
        shortCircuit: true,
        url: pathToFileURL(nextPackageCandidate).href,
      };
    }

    return nextResolve(specifier, context);
  },
});

process.env.YAHOO_FINANCE_REQUESTS_PER_SECOND = "0.25";
process.env.YAHOO_FINANCE_MAX_CONCURRENT_WORKERS = "1";

const { runYahooDailySameDayOnlyUntilComplete } = await import("../lib/yahoo-finance-batch-import.ts");
const { extractYahooChartPayloadSymbol } = await import("../lib/yahoo-finance-service.ts");

const TARGET_DATE = "2026-04-30";
const REPAIR_REASON = "same_day_fixture_contamination_suspected";
const RELIANCE_SIGNATURE = {
  open: 1343.6,
  high: 1356.8,
  low: 1337.2,
  close: 1350.75,
  adjClose: null,
  volume: 5320000,
};
const AFFECTED_SYMBOLS = [
  "20MICRONS",
  "21STCENMGM",
  "360ONE",
  "3IINFOLTD",
  "3PLAND",
  "5PAISA",
  "63MOONS",
  "AAATECH",
  "AAREYDRUGS",
  "AARON",
  "AARTIDRUGS",
  "AARTIIND",
  "AARTISURF",
  "AARVI",
  "AAVAS",
  "ABB",
  "ABCAPITAL",
  "AXISBANK",
  "BHARTIARTL",
  "HDFCBANK",
  "ICICIBANK",
  "INFY",
  "ITC",
  "JOCIL",
  "KOTAKBANK",
  "KRBL",
  "LOVABLE",
  "LT",
  "MODISONLTD",
  "NYKAA",
  "OMAXE",
  "PIRAMALFIN",
  "RAYMONDREL",
  "RELIANCE",
  "SALSTEEL",
  "SBIN",
  "SDBL",
  "TCS",
  "ULTRACEMCO",
  "WIPRO",
];

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseJsonText(value) {
  const normalized = cleanString(value, 200000);
  if (!normalized) {
    return null;
  }
  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function toHistorySignature(row) {
  if (!row) {
    return null;
  }

  return [
    cleanString(row.trade_date, 40) || null,
    Number(row.open ?? 0),
    Number(row.high ?? 0),
    Number(row.low ?? 0),
    Number(row.close ?? 0),
    row.adj_close == null ? null : Number(row.adj_close),
    row.volume == null ? null : Number(row.volume),
  ].join("|");
}

const RELIANCE_SIGNATURE_KEY = [
  TARGET_DATE,
  RELIANCE_SIGNATURE.open,
  RELIANCE_SIGNATURE.high,
  RELIANCE_SIGNATURE.low,
  RELIANCE_SIGNATURE.close,
  RELIANCE_SIGNATURE.adjClose,
  RELIANCE_SIGNATURE.volume,
].join("|");

function assertEnv(name) {
  const value = cleanString(process.env[name], 4000);
  if (!value) {
    throw new Error(`Missing required env ${name}.`);
  }
  return value;
}

const supabase = createClient(
  assertEnv("NEXT_PUBLIC_SUPABASE_URL"),
  assertEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false },
  },
);

async function fetchAll(table, selectClause, configure, pageSize = 1000) {
  const rows = [];
  for (let from = 0; from < 10000; from += pageSize) {
    let query = supabase.from(table).select(selectClause).range(from, from + pageSize - 1);
    query = configure ? configure(query) : query;
    const { data, error } = await query;
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    const page = Array.isArray(data) ? data : [];
    if (!page.length) {
      break;
    }
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }
  }
  return rows;
}

async function resolveAffectedStocks() {
  const rows = await fetchAll(
    "stocks_master",
    "id, symbol, slug, company_name, yahoo_symbol",
    (query) => query.in("symbol", AFFECTED_SYMBOLS).eq("status", "active").order("symbol", { ascending: true }),
    100,
  );

  if (rows.length !== AFFECTED_SYMBOLS.length) {
    const found = new Set(rows.map((row) => cleanString(row.symbol, 160)));
    const missing = AFFECTED_SYMBOLS.filter((symbol) => !found.has(symbol));
    throw new Error(`Could not resolve all affected stocks. Missing: ${missing.join(", ")}`);
  }

  return rows.map((row) => ({
    stockId: cleanString(row.id, 160),
    symbol: cleanString(row.symbol, 160),
    slug: cleanString(row.slug, 240) || null,
    companyName: cleanString(row.company_name, 240) || cleanString(row.symbol, 160),
    yahooSymbol: cleanString(row.yahoo_symbol, 160),
  }));
}

async function loadHistoryRows(stockIds) {
  const rows = [];
  for (const batch of chunk(stockIds, 100)) {
    const { data, error } = await supabase
      .from("stock_price_history")
      .select("id, stock_id, symbol, trade_date, open, high, low, close, adj_close, volume, raw_import_id, source_symbol")
      .in("stock_id", batch)
      .eq("trade_date", TARGET_DATE)
      .eq("interval_type", "1d")
      .eq("source_name", "yahoo_finance");
    if (error) {
      throw new Error(`stock_price_history: ${error.message}`);
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

async function loadSnapshotRows(stockIds) {
  const rows = [];
  for (const batch of chunk(stockIds, 100)) {
    const { data, error } = await supabase
      .from("stock_market_snapshot")
      .select("id, stock_id, symbol, trade_date, raw_import_id, source_symbol, snapshot_at, price, change_percent")
      .in("stock_id", batch)
      .eq("trade_date", TARGET_DATE)
      .eq("source_name", "yahoo_finance");
    if (error) {
      throw new Error(`stock_market_snapshot: ${error.message}`);
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

async function loadRawImports(rawImportIds) {
  const byId = new Map();
  for (const batch of chunk(rawImportIds.filter(Boolean), 100)) {
    if (!batch.length) continue;
    const { data, error } = await supabase
      .from("raw_yahoo_imports")
      .select("id, stock_id, yahoo_symbol, request_url, request_context, raw_payload, imported_at")
      .in("id", batch);
    if (error) {
      throw new Error(`raw_yahoo_imports: ${error.message}`);
    }
    for (const row of data ?? []) {
      byId.set(cleanString(row.id, 160), row);
    }
  }
  return byId;
}

async function insertActiveQuarantines(rows) {
  const existing = await fetchAll(
    "market_data_row_quarantine",
    "id, table_name, row_id, stock_id, row_date, status",
    (query) =>
      query
        .eq("status", "active")
        .in("table_name", ["stock_price_history", "stock_market_snapshot"])
        .eq("row_date", TARGET_DATE),
    1000,
  );

  const existingKeys = new Set(
    existing.map((row) => `${cleanString(row.table_name, 120)}:${cleanString(row.row_id, 160)}`),
  );
  const insertRows = rows.filter(
    (row) => !existingKeys.has(`${cleanString(row.table_name, 120)}:${cleanString(row.row_id, 160)}`),
  );

  if (!insertRows.length) {
    return 0;
  }

  const { error } = await supabase.from("market_data_row_quarantine").insert(insertRows);
  if (error) {
    throw new Error(`market_data_row_quarantine insert: ${error.message}`);
  }

  return insertRows.length;
}

async function resolveQuarantinesByRowIds(rowIds) {
  const activeRows = await fetchAll(
    "market_data_row_quarantine",
    "id, row_id, table_name, status",
    (query) => query.eq("status", "active").in("row_id", rowIds),
    1000,
  );

  if (!activeRows.length) {
    return 0;
  }

  const ids = activeRows.map((row) => cleanString(row.id, 160)).filter(Boolean);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("market_data_row_quarantine")
    .update({ status: "resolved", resolved_at: now })
    .in("id", ids);
  if (error) {
    throw new Error(`market_data_row_quarantine resolve: ${error.message}`);
  }
  return ids.length;
}

function buildQuarantineEvidence(kind, stock, row, rawImport) {
  return {
    investigation: "riddra-same-day-candle-corruption-investigation",
    suspectedCause: "dry_run_fixture_leak",
    targetDate: TARGET_DATE,
    rowType: kind,
    rawImportId: cleanString(row.raw_import_id, 160) || null,
    rawImportRequestUrl: cleanString(rawImport?.request_url, 2000) || null,
    rawImportRequestContext: parseJsonText(rawImport?.request_context),
    payloadSymbol: extractYahooChartPayloadSymbol(rawImport?.raw_payload ?? null),
    stockSymbol: stock.symbol,
    yahooSymbol: stock.yahooSymbol,
    rowId: cleanString(row.id, 160),
    signature:
      kind === "stock_price_history"
        ? {
            tradeDate: cleanString(row.trade_date, 40),
            open: Number(row.open ?? 0),
            high: Number(row.high ?? 0),
            low: Number(row.low ?? 0),
            close: Number(row.close ?? 0),
            adjClose: row.adj_close == null ? null : Number(row.adj_close),
            volume: row.volume == null ? null : Number(row.volume),
          }
        : {
            tradeDate: cleanString(row.trade_date, 40),
            snapshotAt: cleanString(row.snapshot_at, 120) || null,
            price: row.price == null ? null : Number(row.price),
            changePercent: row.change_percent == null ? null : Number(row.change_percent),
          },
  };
}

function isDryRunContext(rawImport) {
  const context = parseJsonText(rawImport?.request_context);
  return context?.dryRun === true;
}

async function main() {
  const actorEmail =
    cleanString(process.env.YAHOO_IMPORT_ACTOR_EMAIL, 240) ||
    cleanString(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, 240) ||
    "Same-Day Candle Repair";

  const stocks = await resolveAffectedStocks();
  const stockById = new Map(stocks.map((stock) => [stock.stockId, stock]));
  const stockIds = stocks.map((stock) => stock.stockId);
  const historyRows = await loadHistoryRows(stockIds);
  const snapshotRows = await loadSnapshotRows(stockIds);
  const rawImportIds = [
    ...new Set(
      [...historyRows, ...snapshotRows]
        .map((row) => cleanString(row.raw_import_id, 160))
        .filter(Boolean),
    ),
  ];
  const rawImportsById = await loadRawImports(rawImportIds);

  const corruptedHistoryRows = historyRows.filter(
    (row) =>
      toHistorySignature(row) === RELIANCE_SIGNATURE_KEY &&
      isDryRunContext(rawImportsById.get(cleanString(row.raw_import_id, 160))),
  );

  if (corruptedHistoryRows.length !== AFFECTED_SYMBOLS.length) {
    throw new Error(
      `Expected ${AFFECTED_SYMBOLS.length} corrupted history rows but found ${corruptedHistoryRows.length}.`,
    );
  }

  const corruptedStockIds = new Set(corruptedHistoryRows.map((row) => cleanString(row.stock_id, 160)));
  const relatedSnapshotRows = snapshotRows.filter((row) =>
    corruptedStockIds.has(cleanString(row.stock_id, 160)),
  );

  const quarantineRows = [
    ...corruptedHistoryRows.map((row) => {
      const stock = stockById.get(cleanString(row.stock_id, 160));
      const rawImport = rawImportsById.get(cleanString(row.raw_import_id, 160));
      return {
        row_id: cleanString(row.id, 160),
        stock_id: cleanString(row.stock_id, 160),
        yahoo_symbol: stock?.yahooSymbol ?? (cleanString(row.source_symbol, 160) || null),
        table_name: "stock_price_history",
        row_date: TARGET_DATE,
        reason: REPAIR_REASON,
        evidence: buildQuarantineEvidence("stock_price_history", stock, row, rawImport),
        status: "active",
      };
    }),
    ...relatedSnapshotRows.map((row) => {
      const stock = stockById.get(cleanString(row.stock_id, 160));
      const rawImport = rawImportsById.get(cleanString(row.raw_import_id, 160));
      return {
        row_id: cleanString(row.id, 160),
        stock_id: cleanString(row.stock_id, 160),
        yahoo_symbol: stock?.yahooSymbol ?? (cleanString(row.source_symbol, 160) || null),
        table_name: "stock_market_snapshot",
        row_date: TARGET_DATE,
        reason: REPAIR_REASON,
        evidence: buildQuarantineEvidence("stock_market_snapshot", stock, row, rawImport),
        status: "active",
      };
    }),
  ];

  const insertedQuarantineCount = await insertActiveQuarantines(quarantineRows);

  const result = await runYahooDailySameDayOnlyUntilComplete({
    stocks: stocks.map((stock) => ({ yahooSymbol: stock.yahooSymbol, stockId: stock.stockId })),
    actorEmail,
    targetDate: TARGET_DATE,
    force: true,
    dryRun: false,
    maxItems: stocks.length,
  });

  const repairedHistoryRows = await loadHistoryRows(stockIds);
  const repairedSnapshotRows = await loadSnapshotRows(stockIds);
  const repairedRawImportIds = [
    ...new Set(
      [...repairedHistoryRows, ...repairedSnapshotRows]
        .map((row) => cleanString(row.raw_import_id, 160))
        .filter(Boolean),
    ),
  ];
  const repairedRawImportsById = await loadRawImports(repairedRawImportIds);

  const historyVerifications = repairedHistoryRows.map((row) => {
    const stock = stockById.get(cleanString(row.stock_id, 160));
    const rawImport = repairedRawImportsById.get(cleanString(row.raw_import_id, 160));
    const payloadSymbol = extractYahooChartPayloadSymbol(rawImport?.raw_payload ?? null);
    const requestContext = parseJsonText(rawImport?.request_context);
    const signature = toHistorySignature(row);
    return {
      stockId: cleanString(row.stock_id, 160),
      symbol: stock?.symbol ?? cleanString(row.symbol, 160),
      yahooSymbol: stock?.yahooSymbol ?? null,
      historyRowId: cleanString(row.id, 160),
      rawImportId: cleanString(row.raw_import_id, 160) || null,
      payloadSymbol,
      requestUrl: cleanString(rawImport?.request_url, 2000) || null,
      dryRun: requestContext?.dryRun === true,
      fixtureName: cleanString(requestContext?.fixtureName, 240) || null,
      suspiciousSignature: signature === RELIANCE_SIGNATURE_KEY,
      valid:
        cleanString(payloadSymbol, 160).toUpperCase() === cleanString(stock?.yahooSymbol, 160).toUpperCase() &&
        requestContext?.dryRun !== true &&
        signature !== RELIANCE_SIGNATURE_KEY,
    };
  });
  const snapshotVerifications = repairedSnapshotRows.map((row) => {
    const stock = stockById.get(cleanString(row.stock_id, 160));
    const rawImport = repairedRawImportsById.get(cleanString(row.raw_import_id, 160));
    const payloadSymbol = extractYahooChartPayloadSymbol(rawImport?.raw_payload ?? null);
    const requestContext = parseJsonText(rawImport?.request_context);
    return {
      stockId: cleanString(row.stock_id, 160),
      symbol: stock?.symbol ?? cleanString(row.symbol, 160),
      yahooSymbol: stock?.yahooSymbol ?? null,
      snapshotRowId: cleanString(row.id, 160),
      rawImportId: cleanString(row.raw_import_id, 160) || null,
      payloadSymbol,
      requestUrl: cleanString(rawImport?.request_url, 2000) || null,
      dryRun: requestContext?.dryRun === true,
      fixtureName: cleanString(requestContext?.fixtureName, 240) || null,
      valid:
        cleanString(payloadSymbol, 160).toUpperCase() === cleanString(stock?.yahooSymbol, 160).toUpperCase() &&
        requestContext?.dryRun !== true,
    };
  });

  const invalidHistory = historyVerifications.filter((item) => !item.valid);
  const invalidSnapshots = snapshotVerifications.filter((item) => !item.valid);
  const suspiciousSharedRows = historyVerifications.filter((item) => item.suspiciousSignature);
  const resolvedQuarantineCount =
    invalidHistory.length === 0 && invalidSnapshots.length === 0
      ? await resolveQuarantinesByRowIds(quarantineRows.map((row) => cleanString(row.row_id, 160)).filter(Boolean))
      : 0;

  const activeQuarantinesAfterRepair = await fetchAll(
    "market_data_row_quarantine",
    "id, row_id, table_name, stock_id, status",
    (query) =>
      query
        .eq("status", "active")
        .in("table_name", ["stock_price_history", "stock_market_snapshot"])
        .in("stock_id", stockIds),
    1000,
  );

  const report = {
    targetDate: TARGET_DATE,
    affectedSymbols: AFFECTED_SYMBOLS,
    quarantinedBeforeRepair: {
      corruptedHistoryRowCount: corruptedHistoryRows.length,
      relatedSnapshotRowCount: relatedSnapshotRows.length,
      insertedActiveQuarantineRows: insertedQuarantineCount,
    },
    repairRun: {
      requestedCount: result.requestedCount,
      processedCount: result.processedCount,
      completedCount: result.completedCount,
      failedCount: result.failedCount,
      warningCount: result.warningCount,
      insertedRows: result.insertedRows,
      updatedRows: result.updatedRows,
      skippedRows: result.skippedRows,
      snapshotInsertedCount: result.snapshotInsertedCount,
      snapshotSkippedCount: result.snapshotSkippedCount,
      noDataCount: result.noDataCount,
      usedLatestAvailableTradingDateCount: result.usedLatestAvailableTradingDateCount,
      stoppedEarly: result.stoppedEarly,
      stopReason: result.stopReason,
      failures: result.failures,
    },
    verification: {
      repairedHistoryRowCount: repairedHistoryRows.length,
      repairedSnapshotRowCount: repairedSnapshotRows.length,
      validSymbolSpecificHistoryPayloadCount:
        historyVerifications.length - invalidHistory.length,
      validSymbolSpecificSnapshotPayloadCount:
        snapshotVerifications.length - invalidSnapshots.length,
      invalidHistoryPayloads: invalidHistory,
      invalidSnapshotPayloads: invalidSnapshots,
      suspiciousSharedRelianceFixtureRowsRemaining: suspiciousSharedRows.map((item) => item.symbol),
      quarantineResolvedCount: resolvedQuarantineCount,
      activeQuarantinesAfterRepair: activeQuarantinesAfterRepair.length,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (invalidHistory.length > 0 || invalidSnapshots.length > 0) {
    throw new Error(
      `Repair verification failed for ${invalidHistory.length} repaired history row(s) and ${invalidSnapshots.length} repaired snapshot row(s). Active quarantine was left in place for follow-up.`,
    );
  }
}

main().catch((error) => {
  console.error("[quarantine-and-repair-same-day-candles] failed", error);
  process.exitCode = 1;
});
