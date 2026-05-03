import { getYahooDryRunFixture } from "../lib/yahoo-finance-dry-run-fixtures.ts";

const SYMBOLS = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
];

const TARGET_DATE = "2026-04-30";

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function extractLastHistoricalRow(payload) {
  const chart = payload && typeof payload === "object" ? payload.chart : null;
  const result =
    chart && typeof chart === "object" && Array.isArray(chart.result) ? chart.result[0] : null;
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = Array.isArray(result?.indicators?.quote) ? result.indicators.quote[0] ?? null : null;
  const adjCloseSeries = Array.isArray(result?.indicators?.adjclose)
    ? result.indicators.adjclose[0]?.adjclose ?? []
    : [];
  const lastIndex = timestamps.length - 1;
  if (!quote || lastIndex < 0) {
    return null;
  }

  return {
    tradeDate: TARGET_DATE,
    open: Number(quote.open?.[lastIndex]),
    high: Number(quote.high?.[lastIndex]),
    low: Number(quote.low?.[lastIndex]),
    close: Number(quote.close?.[lastIndex]),
    adjClose:
      typeof adjCloseSeries[lastIndex] === "number" ? Number(adjCloseSeries[lastIndex]) : null,
    volume: typeof quote.volume?.[lastIndex] === "number" ? Number(quote.volume[lastIndex]) : null,
  };
}

function extractYahooChartPayloadSymbol(payload) {
  const chart = payload && typeof payload === "object" ? payload.chart : null;
  const result =
    chart && typeof chart === "object" && Array.isArray(chart.result) ? chart.result[0] : null;
  const meta = result && typeof result === "object" ? result.meta : null;
  return cleanString(meta?.symbol, 160).toUpperCase() || null;
}

function buildHistoricalRequestUrl(yahooSymbol) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol,
  )}?interval=1d&range=1mo&includePrePost=false&events=div%2Csplits`;
}

function buildYahooSameDayHistoricalSignature(row) {
  if (!row) {
    return null;
  }

  return [
    row.tradeDate,
    row.open,
    row.high,
    row.low,
    row.close,
    row.adjClose ?? "null",
    row.volume ?? "null",
  ].join("|");
}

function validateYahooSameDayHistoricalSourceIsolation(input) {
  const issues = [];
  const expectedYahooSymbol = cleanString(input.requestedYahooSymbol, 160).toUpperCase();
  const resolvedYahooSymbol = cleanString(input.resolvedYahooSymbol, 160).toUpperCase();
  const rawImportYahooSymbol = cleanString(input.rawImportYahooSymbol, 160).toUpperCase();
  const payloadSymbol = extractYahooChartPayloadSymbol(input.payload);
  const requestUrl = cleanString(input.requestUrl, 2000).toUpperCase();

  if (resolvedYahooSymbol !== expectedYahooSymbol) {
    issues.push(
      `Resolved Yahoo symbol mismatch. Expected "${expectedYahooSymbol}" but received "${resolvedYahooSymbol}".`,
    );
  }
  if (rawImportYahooSymbol !== expectedYahooSymbol) {
    issues.push(
      `Raw import Yahoo symbol mismatch. Expected "${expectedYahooSymbol}" but received "${rawImportYahooSymbol}".`,
    );
  }
  if (!payloadSymbol) {
    issues.push("Yahoo chart payload did not include meta.symbol.");
  } else if (payloadSymbol !== expectedYahooSymbol) {
    issues.push(
      `Yahoo chart payload symbol mismatch. Expected "${expectedYahooSymbol}" but received "${payloadSymbol}".`,
    );
  }
  if (!requestUrl.includes(expectedYahooSymbol)) {
    issues.push(`Yahoo chart request URL did not contain the expected symbol "${expectedYahooSymbol}".`);
  }
  if (input.effectiveRow && input.effectiveRow.tradeDate > input.targetDate) {
    issues.push(
      `Effective same-day row date "${input.effectiveRow.tradeDate}" is after requested target date "${input.targetDate}".`,
    );
  }

  return {
    ok: issues.length === 0,
    payloadSymbol,
    issues,
  };
}

function detectSuspiciousSameDaySignatureSpike(records, threshold = 3) {
  const normalizedThreshold = Math.max(2, Math.floor(threshold));
  const signatureMap = new Map();

  for (const record of records) {
    const existing = signatureMap.get(record.signature) ?? [];
    existing.push(record);
    signatureMap.set(record.signature, existing);
  }

  for (const [signature, matches] of signatureMap.entries()) {
    const distinctSymbols = [...new Set(matches.map((match) => match.yahooSymbol))];
    if (distinctSymbols.length >= normalizedThreshold) {
      return {
        shouldStop: true,
        signature,
        threshold: normalizedThreshold,
        matches,
        distinctSymbols,
        message: `Suspicious same-day OHLCV signature spike detected for ${distinctSymbols.length} symbols in one daily_same_day_only batch: ${distinctSymbols.join(", ")}.`,
      };
    }
  }

  return {
    shouldStop: false,
    signature: null,
    threshold: normalizedThreshold,
    matches: [],
    distinctSymbols: [],
    message: null,
  };
}

const records = [];
for (const yahooSymbol of SYMBOLS) {
  const fixture = getYahooDryRunFixture({
    yahooSymbol,
    requestType: "historical_prices",
  });
  const payloadSymbol = extractYahooChartPayloadSymbol(fixture.payload);
  const effectiveRow = extractLastHistoricalRow(fixture.payload);

  const validation = validateYahooSameDayHistoricalSourceIsolation({
    requestedYahooSymbol: yahooSymbol,
    resolvedYahooSymbol: yahooSymbol,
    rawImportYahooSymbol: yahooSymbol,
    requestUrl: buildHistoricalRequestUrl(yahooSymbol),
    payload: fixture.payload,
    targetDate: TARGET_DATE,
    effectiveRow,
  });

  if (!validation.ok) {
    throw new Error(
      `Source isolation validation failed for ${yahooSymbol}: ${validation.issues.join(" ")}`,
    );
  }

  const signature = buildYahooSameDayHistoricalSignature(effectiveRow);
  if (!signature) {
    throw new Error(`Could not build same-day historical signature for ${yahooSymbol}.`);
  }

  records.push({
    stockId: `dry-run-${cleanString(yahooSymbol, 160).toLowerCase()}`,
    yahooSymbol,
    symbol: cleanString(yahooSymbol, 160).replace(/\.NS$/, ""),
    payloadSymbol,
    signature,
    row: effectiveRow,
  });
}

const anomaly = detectSuspiciousSameDaySignatureSpike(records, 3);
if (!anomaly.shouldStop) {
  throw new Error(
    "Expected same-day anomaly detector to stop when five distinct symbols share one signature.",
  );
}

console.log(
  JSON.stringify(
    {
      targetDate: TARGET_DATE,
      symbolCount: SYMBOLS.length,
      payloadSymbols: records.map((record) => record.payloadSymbol),
      uniqueSignatureCount: new Set(records.map((record) => record.signature)).size,
      anomaly,
    },
    null,
    2,
  ),
);
