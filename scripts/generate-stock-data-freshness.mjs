import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
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

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getCurrentIsoDateInTimeZone(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseIsoDate(value) {
  const parsed = new Date(`${cleanString(value, 40)}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(value, days) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return cleanString(value, 40);
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatIsoDate(parsed);
}

function getIndianWeekday(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return "Mon";
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(parsed);
}

function getPreviousIndianTradingDate(value) {
  let cursor = shiftIsoDate(value, -1);
  while (true) {
    const weekday = getIndianWeekday(cursor);
    if (weekday !== "Sat" && weekday !== "Sun") {
      return cursor;
    }
    cursor = shiftIsoDate(cursor, -1);
  }
}

const ACCEPTED_PROVIDER_NO_DATA_YAHOO_SYMBOLS = new Set([
  "KIRANVYPAR.NS",
  "NEAGI.NS",
]);

function getIndianMarketSession(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;
  const openMinutes = 9 * 60 + 15;
  const closeMinutes = 15 * 60 + 30;

  if (weekday === "Sat" || weekday === "Sun") {
    return "weekend";
  }
  if (totalMinutes < openMinutes) {
    return "pre_open";
  }
  if (totalMinutes <= closeMinutes) {
    return "open";
  }
  return "closed";
}

function resolveTradingDatePolicyContext(globalLatestTradingDate) {
  const evaluationDate = getCurrentIsoDateInTimeZone("Asia/Kolkata");
  const marketSessionState = getIndianMarketSession(new Date());
  const previousTradingDate = getPreviousIndianTradingDate(evaluationDate);
  const latest = cleanString(globalLatestTradingDate, 40) || null;

  if (marketSessionState === "weekend") {
    return {
      evaluationDate,
      expectedTradingDate: latest || previousTradingDate,
      marketSessionState,
      policyReason: "holiday_or_weekend",
    };
  }

  if (marketSessionState === "pre_open" || marketSessionState === "open") {
    return {
      evaluationDate,
      expectedTradingDate: latest && latest < evaluationDate ? latest : previousTradingDate,
      marketSessionState,
      policyReason: "market_not_closed",
    };
  }

  if (latest && latest < evaluationDate) {
    return {
      evaluationDate,
      expectedTradingDate: latest,
      marketSessionState,
      policyReason: "holiday_or_weekend",
    };
  }

  return {
    evaluationDate,
    expectedTradingDate: evaluationDate,
    marketSessionState,
    policyReason: null,
  };
}

function classifyStockFreshness({
  yahooSymbol,
  expectedTradingDate,
  hasExpectedPrice,
  hasExpectedSnapshot,
  lastPriceDate,
  lastSnapshotDate,
  policyReason,
}) {
  const normalizedYahooSymbol = cleanString(yahooSymbol, 160) || null;
  const normalizedLastPriceDate = cleanString(lastPriceDate, 40) || null;
  const normalizedLastSnapshotDate = cleanString(lastSnapshotDate, 40) || null;

  if (policyReason && hasExpectedPrice && hasExpectedSnapshot) {
    return { isStale: false, reasonCategory: policyReason };
  }

  if (hasExpectedPrice && hasExpectedSnapshot) {
    return { isStale: false, reasonCategory: "fresh" };
  }

  const previousTradingDate = getPreviousIndianTradingDate(expectedTradingDate);
  const hasProviderLagPrice =
    !hasExpectedPrice && normalizedLastPriceDate === previousTradingDate;
  const hasProviderLagSnapshot =
    !hasExpectedSnapshot && normalizedLastSnapshotDate === previousTradingDate;

  if (
    ACCEPTED_PROVIDER_NO_DATA_YAHOO_SYMBOLS.has(normalizedYahooSymbol ?? "") &&
    (!hasExpectedPrice || !hasExpectedSnapshot)
  ) {
    return { isStale: false, reasonCategory: "provider_no_data" };
  }

  if (!policyReason && normalizedYahooSymbol && (hasProviderLagPrice || hasProviderLagSnapshot)) {
    return { isStale: false, reasonCategory: "provider_lag" };
  }

  if (!normalizedYahooSymbol || (!normalizedLastPriceDate && !normalizedLastSnapshotDate)) {
    return { isStale: true, reasonCategory: "symbol_issue" };
  }

  if (!hasExpectedPrice) {
    return { isStale: true, reasonCategory: "stale_missing_price" };
  }

  return { isStale: true, reasonCategory: "stale_missing_snapshot" };
}

async function fetchAllRows(table, selectClause, configure) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase.from(table).select(selectClause).range(from, from + pageSize - 1);
    if (configure) {
      query = configure(query);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

const [stocks, coverageRowsRaw] = await Promise.all([
  fetchAllRows(
    "stocks_master",
    "id, symbol, yahoo_symbol, company_name",
    (query) => query.eq("status", "active").order("id", { ascending: true }),
  ),
  fetchAllRows(
    "stock_import_coverage",
    "stock_id, bucket_key, latest_trade_date, metadata",
    (query) => query.in("bucket_key", ["historical_prices", "latest_market_snapshot"]),
  ),
]);

const coverageByStockId = new Map();
for (const row of coverageRowsRaw) {
  const stockId = cleanString(row.stock_id, 160);
  const bucketKey = cleanString(row.bucket_key, 160);
  if (!stockId || !bucketKey) continue;
  const coverageMap = coverageByStockId.get(stockId) ?? new Map();
  coverageMap.set(bucketKey, row);
  coverageByStockId.set(stockId, coverageMap);
}

let globalLatestTradingDate = null;
for (const coverageMap of coverageByStockId.values()) {
  for (const bucketKey of ["historical_prices", "latest_market_snapshot"]) {
    const row = coverageMap.get(bucketKey);
    const metadata = normalizeMetadata(row?.metadata);
    const candidate =
      cleanString(metadata.lastAvailableDate, 40) ||
      cleanString(row?.latest_trade_date, 40) ||
      null;
    if (candidate && (!globalLatestTradingDate || candidate > globalLatestTradingDate)) {
      globalLatestTradingDate = candidate;
    }
  }
}

const tradingDatePolicy = resolveTradingDatePolicyContext(globalLatestTradingDate);

const [expectedPriceRows, expectedSnapshotRows] = await Promise.all([
  fetchAllRows(
    "stock_price_history",
    "stock_id, trade_date",
    (query) =>
      query
        .eq("trade_date", tradingDatePolicy.expectedTradingDate)
        .eq("interval_type", "1d")
        .eq("source_name", "yahoo_finance"),
  ),
  fetchAllRows(
    "stock_market_snapshot",
    "stock_id, trade_date",
    (query) =>
      query
        .eq("trade_date", tradingDatePolicy.expectedTradingDate)
        .eq("source_name", "yahoo_finance"),
  ),
]);

const expectedPriceStockIds = new Set(
  expectedPriceRows.map((row) => cleanString(row.stock_id, 160)).filter(Boolean),
);
const expectedSnapshotStockIds = new Set(
  expectedSnapshotRows.map((row) => cleanString(row.stock_id, 160)).filter(Boolean),
);

const freshnessRows = stocks.map((stock) => {
  const stockId = cleanString(stock.id, 160);
  const stockCoverage = coverageByStockId.get(stockId) ?? new Map();
  const historicalCoverage = stockCoverage.get("historical_prices");
  const snapshotCoverage = stockCoverage.get("latest_market_snapshot");
  const historicalMetadata = normalizeMetadata(historicalCoverage?.metadata);
  const snapshotMetadata = normalizeMetadata(snapshotCoverage?.metadata);
  const lastPriceDate =
    cleanString(historicalMetadata.lastAvailableDate, 120) ||
    cleanString(historicalCoverage?.latest_trade_date, 120) ||
    null;
  const lastSnapshotDate =
    cleanString(snapshotMetadata.lastAvailableDate, 120) ||
    cleanString(snapshotCoverage?.latest_trade_date, 120) ||
    null;
  const hasExpectedPrice = expectedPriceStockIds.has(stockId);
  const hasExpectedSnapshot = expectedSnapshotStockIds.has(stockId);
  const classification = classifyStockFreshness({
    yahooSymbol: stock.yahoo_symbol,
    expectedTradingDate: tradingDatePolicy.expectedTradingDate,
    hasExpectedPrice,
    hasExpectedSnapshot,
    lastPriceDate,
    lastSnapshotDate,
    policyReason: tradingDatePolicy.policyReason,
  });

  return {
    stock_id: stockId,
    has_today_price: hasExpectedPrice,
    has_today_snapshot: hasExpectedSnapshot,
    last_price_date: lastPriceDate,
    last_snapshot_date: lastSnapshotDate,
    expected_trading_date: tradingDatePolicy.expectedTradingDate,
    evaluation_date: tradingDatePolicy.evaluationDate,
    reason_category: classification.reasonCategory,
    market_session_state: tradingDatePolicy.marketSessionState,
    is_stale: classification.isStale,
    checked_at: new Date().toISOString(),
  };
});

const { error: upsertError } = await supabase.from("stock_data_freshness").upsert(freshnessRows, {
  onConflict: "stock_id",
});

if (upsertError) {
  throw new Error(`stock_data_freshness: ${upsertError.message}`);
}

const staleCount = freshnessRows.filter((row) => row.is_stale).length;
const reasonCounts = freshnessRows.reduce((accumulator, row) => {
  const key = cleanString(row.reason_category, 80) || "fresh";
  accumulator[key] = Number(accumulator[key] ?? 0) + 1;
  return accumulator;
}, {});

console.log(
  JSON.stringify(
    {
      evaluationDate: tradingDatePolicy.evaluationDate,
      expectedTradingDate: tradingDatePolicy.expectedTradingDate,
      marketSessionState: tradingDatePolicy.marketSessionState,
      policyReason: tradingDatePolicy.policyReason,
      totalStocks: freshnessRows.length,
      staleCount,
      freshCount: freshnessRows.length - staleCount,
      reasonCounts,
      sampleStaleStocks: stocks
        .filter((stock) =>
          freshnessRows.find((row) => row.stock_id === cleanString(stock.id, 160) && row.is_stale),
        )
        .slice(0, 20)
        .map((stock) => ({
          stockId: cleanString(stock.id, 160),
          symbol: cleanString(stock.symbol, 160),
          yahooSymbol: cleanString(stock.yahoo_symbol, 160) || null,
          companyName: cleanString(stock.company_name, 240) || null,
        })),
    },
    null,
    2,
  ),
);
