import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function cleanString(value, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeSlug(value) {
  return cleanString(value, 160).toLowerCase();
}

function normalizeUpper(value, maxLength = 80) {
  return cleanString(value, maxLength).toUpperCase();
}

function normalizeYahooSymbol(value) {
  return normalizeUpper(value, 80);
}

function normalizeYahooSymbolForStockLookup(value) {
  return normalizeYahooSymbol(value).replace(/\.(NS|BO|NSE|BSE)$/i, "");
}

function buildSlugFromText(value) {
  return cleanString(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferYahooSymbol({ yahooSymbol, symbol, exchange }) {
  const directYahoo = normalizeYahooSymbol(yahooSymbol);
  if (directYahoo) {
    return directYahoo;
  }

  const normalizedSymbol = normalizeUpper(symbol, 80);
  const normalizedExchange = normalizeUpper(exchange, 20);
  if (!normalizedSymbol) {
    return null;
  }

  if (normalizedExchange === "NSE" || normalizedExchange === "NS") {
    return `${normalizedSymbol}.NS`;
  }

  return normalizedSymbol;
}

async function safeMaybeSingle(query) {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function safeHasRows(label, query) {
  const { data, error } = await query;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
}

async function findStocksMasterRow(supabase, input) {
  const slug = normalizeSlug(input.slug);
  const yahooSymbol = normalizeYahooSymbol(input.yahooSymbol);
  const symbol = normalizeUpper(input.symbol, 80);
  const lookupSymbol = yahooSymbol ? normalizeYahooSymbolForStockLookup(yahooSymbol) : "";
  const instrumentId = cleanString(input.instrumentId, 160);

  if (slug) {
    const row = await safeMaybeSingle(
      supabase.from("stocks_master").select("*").eq("slug", slug).limit(1).maybeSingle(),
    );
    if (row) return row;
  }

  if (yahooSymbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("stocks_master")
        .select("*")
        .eq("yahoo_symbol", yahooSymbol)
        .limit(1)
        .maybeSingle(),
    );
    if (row) return row;
  }

  if (symbol) {
    const row = await safeMaybeSingle(
      supabase.from("stocks_master").select("*").eq("symbol", symbol).limit(1).maybeSingle(),
    );
    if (row) return row;
  }

  if (lookupSymbol && lookupSymbol !== symbol) {
    const row = await safeMaybeSingle(
      supabase.from("stocks_master").select("*").eq("symbol", lookupSymbol).limit(1).maybeSingle(),
    );
    if (row) return row;
  }

  if (instrumentId) {
    const row = await safeMaybeSingle(
      supabase
        .from("stocks_master")
        .select("*")
        .eq("instrument_id", instrumentId)
        .limit(1)
        .maybeSingle(),
    );
    if (row) return row;
  }

  return null;
}

async function findInstrumentRow(supabase, input) {
  const slug = normalizeSlug(input.slug);
  const yahooSymbol = normalizeYahooSymbol(input.yahooSymbol);
  const symbol = normalizeUpper(input.symbol, 80);
  const lookupSymbol = yahooSymbol ? normalizeYahooSymbolForStockLookup(yahooSymbol) : "";
  const instrumentId = cleanString(input.instrumentId, 160);

  if (slug) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select("*")
        .eq("slug", slug)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) return row;
  }

  if (symbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select("*")
        .eq("symbol", symbol)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) return row;
  }

  if (lookupSymbol && lookupSymbol !== symbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select("*")
        .eq("symbol", lookupSymbol)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) return row;
  }

  if (instrumentId) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select("*")
        .eq("id", instrumentId)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) return row;
  }

  return null;
}

async function findCompaniesRow(supabase, instrumentId) {
  const normalizedInstrumentId = cleanString(instrumentId, 160);
  if (!normalizedInstrumentId) {
    return null;
  }

  return safeMaybeSingle(
    supabase
      .from("companies")
      .select("*")
      .eq("instrument_id", normalizedInstrumentId)
      .limit(1)
      .maybeSingle(),
  );
}

async function findStocksMasterFromInstrument(supabase, instrumentRow) {
  if (!instrumentRow) {
    return null;
  }

  return findStocksMasterRow(supabase, {
    instrumentId: cleanString(instrumentRow.id, 160) || null,
    slug: cleanString(instrumentRow.slug, 160) || null,
    symbol: cleanString(instrumentRow.symbol, 80) || null,
    yahooSymbol: inferYahooSymbol({
      symbol: cleanString(instrumentRow.symbol, 80) || null,
      exchange: cleanString(instrumentRow.exchange, 20) || null,
    }),
  });
}

async function resolveDataPresence(supabase, { stocksMasterId, slug }) {
  const normalizedStockId = cleanString(stocksMasterId, 160) || null;
  const normalizedSlug = normalizeSlug(slug);

  const [
    normalizedHistorical,
    legacyHistorical,
    normalizedSnapshot,
    legacySnapshot,
  ] = await Promise.all([
    normalizedStockId
      ? safeHasRows(
          "stock_price_history",
          supabase.from("stock_price_history").select("stock_id").eq("stock_id", normalizedStockId).limit(1),
        )
      : Promise.resolve(false),
    normalizedSlug
      ? safeHasRows(
          "stock_ohlcv_history",
          supabase.from("stock_ohlcv_history").select("slug").eq("slug", normalizedSlug).limit(1),
        )
      : Promise.resolve(false),
    normalizedStockId
      ? safeHasRows(
          "stock_market_snapshot",
          supabase.from("stock_market_snapshot").select("stock_id").eq("stock_id", normalizedStockId).limit(1),
        )
      : Promise.resolve(false),
    normalizedSlug
      ? safeHasRows(
          "stock_quote_history",
          supabase.from("stock_quote_history").select("slug").eq("slug", normalizedSlug).limit(1),
        )
      : Promise.resolve(false),
  ]);

  return {
    hasHistoricalData: normalizedHistorical || legacyHistorical,
    hasSnapshotData: normalizedSnapshot || legacySnapshot,
  };
}

function buildNormalizedResolution({
  sourceLayer,
  masterRow,
  instrumentRow,
  companyRow,
  lookup,
  hasHistoricalData,
  hasSnapshotData,
}) {
  const masterId = cleanString(masterRow?.id, 160) || null;
  const instrumentId =
    cleanString(masterRow?.instrument_id, 160) ||
    cleanString(instrumentRow?.id, 160) ||
    cleanString(lookup.instrumentId, 160) ||
    null;
  const companyId = cleanString(companyRow?.id, 160) || null;
  const companyName =
    cleanString(masterRow?.company_name, 240) ||
    cleanString(companyRow?.legal_name, 240) ||
    cleanString(instrumentRow?.name, 240) ||
    null;
  const symbol =
    cleanString(masterRow?.symbol, 80) ||
    cleanString(instrumentRow?.symbol, 80) ||
    normalizeYahooSymbolForStockLookup(cleanString(lookup.yahooSymbol, 80)) ||
    normalizeUpper(lookup.symbol, 80) ||
    null;
  const exchange =
    cleanString(masterRow?.exchange, 40) ||
    cleanString(instrumentRow?.exchange, 40) ||
    null;
  const yahooSymbol =
    cleanString(masterRow?.yahoo_symbol, 80) ||
    inferYahooSymbol({
      yahooSymbol: lookup.yahooSymbol,
      symbol,
      exchange,
    });
  const slug =
    cleanString(masterRow?.slug, 160) ||
    cleanString(instrumentRow?.slug, 160) ||
    normalizeSlug(lookup.slug) ||
    (companyName ? buildSlugFromText(companyName) : "") ||
    (symbol ? buildSlugFromText(symbol) : "") ||
    null;

  return {
    stockId: masterId || instrumentId || companyId || null,
    stocksMasterId: masterId,
    instrumentId,
    companyId,
    symbol: symbol || null,
    yahooSymbol: yahooSymbol || null,
    companyName,
    slug: slug || null,
    exchange: exchange || null,
    sourceLayer,
    hasHistoricalData,
    hasSnapshotData,
  };
}

async function resolveCanonicalStock(supabase, input) {
  const hasLookup =
    Boolean(normalizeSlug(input.slug)) ||
    Boolean(normalizeYahooSymbol(input.yahooSymbol)) ||
    Boolean(normalizeUpper(input.symbol, 80)) ||
    Boolean(cleanString(input.instrumentId, 160));

  if (!hasLookup) {
    return null;
  }

  let masterRow = await findStocksMasterRow(supabase, input);
  let instrumentRow = null;
  let companyRow = null;
  let sourceLayer = "stocks_master";

  if (!masterRow) {
    instrumentRow = await findInstrumentRow(supabase, input);
    if (instrumentRow) {
      const masterFromInstrument = await findStocksMasterFromInstrument(supabase, instrumentRow);
      if (masterFromInstrument) {
        masterRow = masterFromInstrument;
      } else {
        sourceLayer = "instruments";
      }
    }
  }

  if (masterRow && !instrumentRow) {
    instrumentRow = await findInstrumentRow(supabase, {
      instrumentId: cleanString(masterRow.instrument_id, 160) || null,
      slug: cleanString(masterRow.slug, 160) || null,
      symbol: cleanString(masterRow.symbol, 80) || null,
      yahooSymbol: cleanString(masterRow.yahoo_symbol, 80) || null,
    });
  }

  companyRow = await findCompaniesRow(
    supabase,
    cleanString(masterRow?.instrument_id, 160) ||
      cleanString(instrumentRow?.id, 160) ||
      cleanString(input.instrumentId, 160) ||
      null,
  );

  if (!masterRow && !instrumentRow && companyRow) {
    sourceLayer = "companies";
  }

  if (!masterRow && !instrumentRow && !companyRow) {
    return null;
  }

  const presence = await resolveDataPresence(supabase, {
    stocksMasterId: cleanString(masterRow?.id, 160) || null,
    slug:
      cleanString(masterRow?.slug, 160) ||
      cleanString(instrumentRow?.slug, 160) ||
      normalizeSlug(input.slug) ||
      null,
  });

  return buildNormalizedResolution({
    sourceLayer,
    masterRow,
    instrumentRow,
    companyRow,
    lookup: input,
    hasHistoricalData: presence.hasHistoricalData,
    hasSnapshotData: presence.hasSnapshotData,
  });
}

async function main() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const cases = [
    "reliance-industries",
    "tcs",
    "infosys",
    "hdfc-bank",
    "icici-bank",
  ];

  const results = [];

  for (const slug of cases) {
    const bySlug = await resolveCanonicalStock(supabase, { slug });
    const byYahoo =
      bySlug?.yahooSymbol
        ? await resolveCanonicalStock(supabase, { yahooSymbol: bySlug.yahooSymbol })
        : null;
    const bySymbol =
      bySlug?.symbol ? await resolveCanonicalStock(supabase, { symbol: bySlug.symbol }) : null;
    const byInstrumentId =
      bySlug?.instrumentId
        ? await resolveCanonicalStock(supabase, { instrumentId: bySlug.instrumentId })
        : null;

    results.push({
      slug,
      bySlug,
      byYahoo,
      bySymbol,
      byInstrumentId,
    });
  }

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
