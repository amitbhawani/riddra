import {
  createSupabaseAdminClient,
  createSupabaseReadClient,
} from "@/lib/supabase/admin";
import {
  hasRuntimeSupabaseAdminEnv,
  hasRuntimeSupabaseEnv,
} from "@/lib/runtime-launch-config";
import { normalizeYahooSymbolForStockLookup } from "@/lib/yahoo-finance-service";

export type CanonicalStockSourceLayer =
  | "stocks_master"
  | "instruments"
  | "companies";

export type CanonicalStockLookupInput = {
  slug?: string | null;
  yahooSymbol?: string | null;
  symbol?: string | null;
  instrumentId?: string | null;
};

export type CanonicalStockResolution = {
  stockId: string | null;
  stocksMasterId: string | null;
  instrumentId: string | null;
  companyId: string | null;
  symbol: string | null;
  yahooSymbol: string | null;
  companyName: string | null;
  slug: string | null;
  exchange: string | null;
  sourceLayer: CanonicalStockSourceLayer;
  hasHistoricalData: boolean;
  hasSnapshotData: boolean;
};

type QueryableRecord = Record<string, unknown>;
const STOCKS_MASTER_RESOLVER_SELECT =
  "id, instrument_id, slug, symbol, company_name, yahoo_symbol, exchange";
const INSTRUMENT_RESOLVER_SELECT = "id, slug, symbol, name, exchange";
const COMPANY_RESOLVER_SELECT = "id, instrument_id, legal_name";

function cleanString(value: unknown, maxLength = 240) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeSlug(value: string | null | undefined) {
  return cleanString(value, 160).toLowerCase();
}

function normalizeUpper(value: string | null | undefined, maxLength = 80) {
  return cleanString(value, maxLength).toUpperCase();
}

function normalizeYahooSymbol(value: string | null | undefined) {
  return normalizeUpper(value, 80);
}

function buildSlugFromText(value: string) {
  return cleanString(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferYahooSymbol(input: {
  yahooSymbol?: string | null;
  symbol?: string | null;
  exchange?: string | null;
}) {
  const directYahoo = normalizeYahooSymbol(input.yahooSymbol);
  if (directYahoo) {
    return directYahoo;
  }

  const symbol = normalizeUpper(input.symbol, 80);
  const exchange = normalizeUpper(input.exchange, 20);
  if (!symbol) {
    return null;
  }

  if (exchange === "NSE" || exchange === "NS") {
    return `${symbol}.NS`;
  }

  return symbol;
}

function getResolverClient() {
  if (hasRuntimeSupabaseAdminEnv()) {
    return createSupabaseAdminClient();
  }

  if (hasRuntimeSupabaseEnv()) {
    return createSupabaseReadClient();
  }

  throw new Error(
    "Canonical stock resolver requires Supabase runtime configuration in this environment.",
  );
}

async function safeMaybeSingle(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as QueryableRecord | null;
}

async function findStocksMasterRow(
  supabase: ReturnType<typeof getResolverClient>,
  input: CanonicalStockLookupInput,
) {
  const slug = normalizeSlug(input.slug);
  const yahooSymbol = normalizeYahooSymbol(input.yahooSymbol);
  const symbol = normalizeUpper(input.symbol, 80);
  const lookupSymbol = yahooSymbol ? normalizeYahooSymbolForStockLookup(yahooSymbol) : "";
  const instrumentId = cleanString(input.instrumentId, 160);

  if (slug) {
    const row = await safeMaybeSingle(
      supabase
        .from("stocks_master")
        .select(STOCKS_MASTER_RESOLVER_SELECT)
        .eq("slug", slug)
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  if (yahooSymbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("stocks_master")
        .select(STOCKS_MASTER_RESOLVER_SELECT)
        .eq("yahoo_symbol", yahooSymbol)
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  if (symbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("stocks_master")
        .select(STOCKS_MASTER_RESOLVER_SELECT)
        .eq("symbol", symbol)
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  if (lookupSymbol && lookupSymbol !== symbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("stocks_master")
        .select(STOCKS_MASTER_RESOLVER_SELECT)
        .eq("symbol", lookupSymbol)
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  if (instrumentId) {
    const row = await safeMaybeSingle(
      supabase
        .from("stocks_master")
        .select(STOCKS_MASTER_RESOLVER_SELECT)
        .eq("instrument_id", instrumentId)
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  return null;
}

async function findInstrumentRow(
  supabase: ReturnType<typeof getResolverClient>,
  input: CanonicalStockLookupInput,
) {
  const slug = normalizeSlug(input.slug);
  const yahooSymbol = normalizeYahooSymbol(input.yahooSymbol);
  const symbol = normalizeUpper(input.symbol, 80);
  const lookupSymbol = yahooSymbol ? normalizeYahooSymbolForStockLookup(yahooSymbol) : "";
  const instrumentId = cleanString(input.instrumentId, 160);

  if (slug) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select(INSTRUMENT_RESOLVER_SELECT)
        .eq("slug", slug)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  if (symbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select(INSTRUMENT_RESOLVER_SELECT)
        .eq("symbol", symbol)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  if (lookupSymbol && lookupSymbol !== symbol) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select(INSTRUMENT_RESOLVER_SELECT)
        .eq("symbol", lookupSymbol)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  if (instrumentId) {
    const row = await safeMaybeSingle(
      supabase
        .from("instruments")
        .select(INSTRUMENT_RESOLVER_SELECT)
        .eq("id", instrumentId)
        .eq("instrument_type", "stock")
        .limit(1)
        .maybeSingle(),
    );
    if (row) {
      return row;
    }
  }

  return null;
}

async function findCompaniesRow(
  supabase: ReturnType<typeof getResolverClient>,
  instrumentId: string | null,
) {
  const normalizedInstrumentId = cleanString(instrumentId, 160);
  if (!normalizedInstrumentId) {
    return null;
  }

  return safeMaybeSingle(
    supabase
      .from("companies")
      .select(COMPANY_RESOLVER_SELECT)
      .eq("instrument_id", normalizedInstrumentId)
      .limit(1)
      .maybeSingle(),
  );
}

async function findStocksMasterFromInstrument(
  supabase: ReturnType<typeof getResolverClient>,
  instrument: QueryableRecord | null,
) {
  if (!instrument) {
    return null;
  }

  return findStocksMasterRow(supabase, {
    instrumentId: cleanString(instrument.id, 160) || null,
    slug: cleanString(instrument.slug, 160) || null,
    symbol: cleanString(instrument.symbol, 80) || null,
    yahooSymbol: inferYahooSymbol({
      symbol: cleanString(instrument.symbol, 80) || null,
      exchange: cleanString(instrument.exchange, 20) || null,
    }),
  });
}

function logResolverWarning(operation: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[canonical-stock-resolver] ${operation}: ${detail}`);
}

async function safeHasRows(
  operation: string,
  query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
) {
  try {
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    logResolverWarning(operation, error);
    return false;
  }
}

async function resolveDataPresence(
  supabase: ReturnType<typeof getResolverClient>,
  input: { stocksMasterId: string | null; slug: string | null },
) {
  const stocksMasterId = cleanString(input.stocksMasterId, 160) || null;
  const slug = normalizeSlug(input.slug);

  const [
    normalizedHistorical,
    legacyHistorical,
    normalizedSnapshot,
    legacySnapshot,
  ] = await Promise.all([
    stocksMasterId
      ? safeHasRows(
          "stock_price_history presence check failed",
          supabase
            .from("stock_price_history")
            .select("stock_id")
            .eq("stock_id", stocksMasterId)
            .limit(1),
        )
      : Promise.resolve(false),
    slug
      ? safeHasRows(
          "stock_ohlcv_history presence check failed",
          supabase.from("stock_ohlcv_history").select("slug").eq("slug", slug).limit(1),
        )
      : Promise.resolve(false),
    stocksMasterId
      ? safeHasRows(
          "stock_market_snapshot presence check failed",
          supabase
            .from("stock_market_snapshot")
            .select("stock_id")
            .eq("stock_id", stocksMasterId)
            .limit(1),
        )
      : Promise.resolve(false),
    slug
      ? safeHasRows(
          "stock_quote_history presence check failed",
          supabase.from("stock_quote_history").select("slug").eq("slug", slug).limit(1),
        )
      : Promise.resolve(false),
  ]);

  return {
    hasHistoricalData: normalizedHistorical || legacyHistorical,
    hasSnapshotData: normalizedSnapshot || legacySnapshot,
  };
}

function buildNormalizedResolution(input: {
  sourceLayer: CanonicalStockSourceLayer;
  masterRow: QueryableRecord | null;
  instrumentRow: QueryableRecord | null;
  companyRow: QueryableRecord | null;
  lookup: CanonicalStockLookupInput;
  hasHistoricalData: boolean;
  hasSnapshotData: boolean;
}): CanonicalStockResolution {
  const masterId = cleanString(input.masterRow?.id, 160) || null;
  const instrumentId =
    cleanString(input.masterRow?.instrument_id, 160) ||
    cleanString(input.instrumentRow?.id, 160) ||
    cleanString(input.lookup.instrumentId, 160) ||
    null;
  const companyId = cleanString(input.companyRow?.id, 160) || null;
  const companyName =
    cleanString(input.masterRow?.company_name, 240) ||
    cleanString(input.companyRow?.legal_name, 240) ||
    cleanString(input.instrumentRow?.name, 240) ||
    null;
  const symbol =
    cleanString(input.masterRow?.symbol, 80) ||
    cleanString(input.instrumentRow?.symbol, 80) ||
    normalizeYahooSymbolForStockLookup(cleanString(input.lookup.yahooSymbol, 80)) ||
    cleanString(input.lookup.symbol, 80).toUpperCase() ||
    null;
  const exchange =
    cleanString(input.masterRow?.exchange, 40) ||
    cleanString(input.instrumentRow?.exchange, 40) ||
    null;
  const yahooSymbol =
    cleanString(input.masterRow?.yahoo_symbol, 80) ||
    inferYahooSymbol({
      yahooSymbol: input.lookup.yahooSymbol,
      symbol,
      exchange,
    });
  const slug =
    cleanString(input.masterRow?.slug, 160) ||
    cleanString(input.instrumentRow?.slug, 160) ||
    normalizeSlug(input.lookup.slug) ||
    (companyName ? buildSlugFromText(companyName) : "") ||
    (symbol ? buildSlugFromText(symbol) : "") ||
    null;
  const stockId = masterId || instrumentId || companyId || null;

  return {
    stockId,
    stocksMasterId: masterId,
    instrumentId,
    companyId,
    symbol: symbol || null,
    yahooSymbol: yahooSymbol || null,
    companyName,
    slug: slug || null,
    exchange: exchange || null,
    sourceLayer: input.sourceLayer,
    hasHistoricalData: input.hasHistoricalData,
    hasSnapshotData: input.hasSnapshotData,
  };
}

export async function resolveCanonicalStock(
  input: CanonicalStockLookupInput,
): Promise<CanonicalStockResolution | null> {
  const hasLookup =
    Boolean(normalizeSlug(input.slug)) ||
    Boolean(normalizeYahooSymbol(input.yahooSymbol)) ||
    Boolean(normalizeUpper(input.symbol, 80)) ||
    Boolean(cleanString(input.instrumentId, 160));

  if (!hasLookup) {
    return null;
  }

  const supabase = getResolverClient();

  const directMasterRow = await findStocksMasterRow(supabase, input);
  let instrumentRow: QueryableRecord | null = null;
  let companyRow: QueryableRecord | null = null;
  let sourceLayer: CanonicalStockSourceLayer = "stocks_master";
  let masterRow = directMasterRow;

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

  const slug =
    cleanString(masterRow?.slug, 160) ||
    cleanString(instrumentRow?.slug, 160) ||
    normalizeSlug(input.slug) ||
    null;
  const presence = await resolveDataPresence(supabase, {
    stocksMasterId: cleanString(masterRow?.id, 160) || null,
    slug,
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

export async function resolveCanonicalStockBySlug(slug: string) {
  return resolveCanonicalStock({ slug });
}

export async function resolveCanonicalStockByYahooSymbol(yahooSymbol: string) {
  return resolveCanonicalStock({ yahooSymbol });
}

export async function resolveCanonicalStockBySymbol(symbol: string) {
  return resolveCanonicalStock({ symbol });
}

export async function resolveCanonicalStockByInstrumentId(instrumentId: string) {
  return resolveCanonicalStock({ instrumentId });
}
