import {
  ingestMarketDataPayload,
  type MarketDataIngestionPayload,
} from "@/lib/market-data-ingestion";
import {
  firstTrustedFundTargets,
  firstTrustedIndexTargets,
  firstTrustedStockTargets,
} from "@/lib/market-data-first-rollout";
import { ensureTrackedIndexFoundationData } from "@/lib/index-tracker-foundation";
import {
  getHostedRuntimeRequirements,
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
} from "@/lib/runtime-launch-config";
import { isHostedAppRuntime } from "@/lib/durable-data-runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RefreshPayloadSegmentKey =
  | "stockQuotes"
  | "stockCharts"
  | "fundNavs"
  | "indexSnapshots";

type MfApiDirectoryRow = {
  schemeCode: number;
  schemeName: string;
};

type MfApiNavRow = {
  date?: string;
  nav?: string | number;
};

type MfApiSchemeResponse = {
  meta?: {
    scheme_name?: string;
    fund_house?: string;
  };
  data?: MfApiNavRow[];
};

type NseQuoteResponse = {
  info?: {
    companyName?: string;
  };
  metadata?: {
    lastUpdateTime?: string;
  };
  priceInfo?: {
    lastPrice?: number;
    pChange?: number;
  };
};

type NseAllIndicesRow = {
  index?: string;
  indexSymbol?: string;
  percentChange?: number | string;
  advances?: number | string;
  declines?: number | string;
};

type NseAllIndicesResponse = {
  data?: NseAllIndicesRow[];
  timestamp?: string;
};

type IndexWeightRosterRow = {
  slug: string;
  componentSymbol: string;
  componentName: string;
  weight: number;
  sourceCode: string | null;
};

type LatestQuoteStatusRow = {
  assetSlug: string;
  changePercent: number;
  latestPointAt: string | null;
};

type BuiltIndexComponent = {
  symbol: string;
  name: string;
  weight: number;
  changePercent: number;
  contribution: number;
  signal: "bullish" | "bearish" | "neutral";
};

const NSE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
const NSE_ACCEPT_LANGUAGE = "en-US,en;q=0.9";

function isNseUrl(url: string) {
  try {
    return new URL(url).hostname.includes("nseindia.com");
  } catch {
    return false;
  }
}

function isMfApiDirectoryUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("api.mfapi.in") && /\/mf\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isNseAllIndicesUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("nseindia.com") && parsed.pathname.includes("/api/allIndices");
  } catch {
    return false;
  }
}

function buildRefreshHeaders(url: string) {
  const config = getRuntimeLaunchConfig();
  const headers = new Headers({
    Accept: "application/json",
  });

  if (isNseUrl(url)) {
    headers.set("Accept", "application/json, text/plain, */*");
    headers.set("Accept-Language", NSE_ACCEPT_LANGUAGE);
    headers.set("Cache-Control", "no-cache");
    headers.set("Pragma", "no-cache");
    headers.set("Referer", "https://www.nseindia.com/");
    headers.set("User-Agent", NSE_USER_AGENT);
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

  if (config.marketDataProviderToken) {
    headers.set("Authorization", `Bearer ${config.marketDataProviderToken}`);
  }

  return headers;
}

async function fetchJson(url: string, label: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: buildRefreshHeaders(url),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${label} failed with status ${response.status}.`);
  }

  return response.json();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSchemeSearchValue(value: string) {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " "),
  );
}

function tokenizeSchemeName(value: string) {
  return normalizeSchemeSearchValue(value)
    .split(" ")
    .filter(Boolean);
}

function scoreFundSchemeMatch(targetName: string, candidateName: string) {
  const targetTokens = tokenizeSchemeName(targetName).filter(
    (token) =>
      ![
        "fund",
        "plan",
        "option",
        "regular",
        "direct",
        "growth",
        "idcw",
        "dividend",
      ].includes(token),
  );
  const candidateTokens = new Set(tokenizeSchemeName(candidateName));
  const matchCount = targetTokens.filter((token) => candidateTokens.has(token)).length;
  const includesGrowth = /\bgrowth\b/i.test(candidateName);
  const includesRegular = /\bregular\b/i.test(candidateName);
  const includesIdcw = /\bidcw\b|\bdividend\b/i.test(candidateName);

  return (
    matchCount * 10 +
    (includesGrowth ? 5 : 0) +
    (includesRegular ? 3 : 0) -
    (includesIdcw ? 2 : 0)
  );
}

function parseNseDateTime(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const match = value.match(
    /^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  const [, day, monthName, year, hour = "15", minute = "30", second = "00"] = match;
  const monthLookup: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const monthIndex = monthLookup[monthName.toLowerCase()];

  if (monthIndex === undefined) {
    return fallback;
  }

  return new Date(
    Date.UTC(
      Number(year),
      monthIndex,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  ).toISOString();
}

function parseNavDate(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback.slice(0, 10);
  }

  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback.slice(0, 10) : parsed.toISOString().slice(0, 10);
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function normalizeIsoTimestamp(value: string | null | undefined, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const candidate = value.trim();
  if (!candidate) return fallback;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeIndexName(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeComponentSignal(changePercent: number): BuiltIndexComponent["signal"] {
  if (changePercent > 0.3) return "bullish";
  if (changePercent < -0.3) return "bearish";
  return "neutral";
}

function deriveIndexSessionPhase(snapshotAt: string) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(snapshotAt));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes < 10 * 60 + 30) {
    return "Opening drive" as const;
  }
  if (totalMinutes < 13 * 60 + 30) {
    return "Mid-session balance" as const;
  }
  return "Closing push" as const;
}

function summarizeIndexMood(score: number) {
  if (score >= 0.45) return "Bullish" as const;
  if (score <= -0.45) return "Bearish" as const;
  return "Mixed" as const;
}

function summarizeIndexDominance(positiveWeightShare: number, negativeWeightShare: number) {
  if (positiveWeightShare >= 60) return "Leaders are in control";
  if (negativeWeightShare >= 60) return "Draggers are dominating";
  return "Market tug-of-war";
}

function summarizeIndexTrend(movePercent: number) {
  if (movePercent >= 0.3) return "Improving through the session";
  if (movePercent <= -0.3) return "Weakening through the session";
  return "Balanced intraday tone";
}

const INDEX_ENDPOINT_ALIASES: Record<(typeof firstTrustedIndexTargets)[number]["slug"], string[]> = {
  nifty50: ["NIFTY 50"],
  sensex: ["SENSEX", "BSE SENSEX", "SP BSE SENSEX"],
  banknifty: ["NIFTY BANK"],
  finnifty: ["NIFTY FINANCIAL SERVICES", "NIFTY FIN SERVICE"],
};

const INDEX_SOURCE_CODE: Record<(typeof firstTrustedIndexTargets)[number]["slug"], string> = {
  nifty50: "nse_index",
  sensex: "bse_sensex",
  banknifty: "nse_bank_index",
  finnifty: "nse_financial_services_index",
};

const stockSlugBySymbol = new Map(firstTrustedStockTargets.map((target) => [target.symbol, target.slug]));

function extractCompositePayload(raw: unknown): MarketDataIngestionPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Provider payload must be a JSON object.");
  }

  const candidate = raw as Record<string, unknown>;
  if (candidate.payload && typeof candidate.payload === "object") {
    return candidate.payload as MarketDataIngestionPayload;
  }

  return candidate as MarketDataIngestionPayload;
}

function extractSegmentPayload(
  key: RefreshPayloadSegmentKey,
  raw: unknown,
): Partial<MarketDataIngestionPayload> {
  if (Array.isArray(raw)) {
    return { [key]: raw } as Partial<MarketDataIngestionPayload>;
  }

  if (!raw || typeof raw !== "object") {
    throw new Error(`${key} endpoint must return a JSON array or payload object.`);
  }

  const candidate = raw as Record<string, unknown>;
  if (Array.isArray(candidate[key])) {
    return { [key]: candidate[key] } as Partial<MarketDataIngestionPayload>;
  }

  if (candidate.payload && typeof candidate.payload === "object") {
    const payload = candidate.payload as Record<string, unknown>;
    if (Array.isArray(payload[key])) {
      return { [key]: payload[key] } as Partial<MarketDataIngestionPayload>;
    }
  }

  throw new Error(`${key} endpoint did not return a recognized ${key} payload.`);
}

async function fetchNseQuoteResponse(baseUrl: string, symbol: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("symbol", symbol);
  const raw = (await fetchJson(url.toString(), `NSE quote refresh for ${symbol}`)) as NseQuoteResponse;
  const lastPrice = raw.priceInfo?.lastPrice;
  const pChange = raw.priceInfo?.pChange;

  if (typeof lastPrice !== "number" || typeof pChange !== "number") {
    throw new Error(`NSE quote payload for ${symbol} did not include priceInfo.lastPrice and priceInfo.pChange.`);
  }

  return {
    symbol,
    companyName: raw.info?.companyName ?? symbol,
    lastUpdated: parseNseDateTime(raw.metadata?.lastUpdateTime, new Date().toISOString()),
    price: lastPrice,
    changePercent: pChange,
  };
}

async function fetchNseStockQuotePayloads(baseUrl: string) {
  const settledQuotes = await Promise.allSettled(
    firstTrustedStockTargets.map((target) => fetchNseQuoteResponse(baseUrl, target.symbol)),
  );
  const stockQuotes = settledQuotes
    .map((result, index) => {
      if (result.status !== "fulfilled") {
        return null;
      }

      const target = firstTrustedStockTargets[index];
      const quote = result.value;

      return {
        slug: target.slug,
        source: "NSE quote endpoint",
        sourceCode: "nse_equities",
        price: Number(quote.price.toFixed(2)),
        changePercent: Number(quote.changePercent.toFixed(2)),
        lastUpdated: quote.lastUpdated,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (stockQuotes.length === 0) {
    throw new Error("NSE quote refresh did not return any usable quote payloads.");
  }

  return { stockQuotes };
}

async function resolveFundNavSchemeCodes(directoryUrl: string) {
  const rawDirectory = (await fetchJson(directoryUrl, "MFAPI scheme directory")) as unknown;
  if (!Array.isArray(rawDirectory)) {
    throw new Error("MFAPI directory endpoint did not return an array of scheme rows.");
  }

  const directory = rawDirectory.filter(
    (row): row is MfApiDirectoryRow =>
      Boolean(
        row &&
          typeof row === "object" &&
          typeof (row as MfApiDirectoryRow).schemeCode === "number" &&
          typeof (row as MfApiDirectoryRow).schemeName === "string",
      ),
  );

  return firstTrustedFundTargets
    .map((target) => {
      const bestMatch = directory
        .map((candidate) => ({
          candidate,
          score: scoreFundSchemeMatch(target.name, candidate.schemeName),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)[0];

      return bestMatch
        ? {
            target,
            schemeCode: bestMatch.candidate.schemeCode,
            schemeName: bestMatch.candidate.schemeName,
          }
        : null;
    })
    .filter(
      (
        entry,
      ): entry is {
        target: (typeof firstTrustedFundTargets)[number];
        schemeCode: number;
        schemeName: string;
      } => Boolean(entry),
    );
}

async function fetchMfApiFundNavPayloads(directoryUrl: string) {
  const schemeMatches = await resolveFundNavSchemeCodes(directoryUrl);
  const now = new Date().toISOString();

  const settledNavs = await Promise.allSettled(
    schemeMatches.map(async ({ target, schemeCode }) => {
      const detailsUrl = new URL(directoryUrl);
      detailsUrl.pathname = `${detailsUrl.pathname.replace(/\/$/, "")}/${schemeCode}`;

      const raw = (await fetchJson(detailsUrl.toString(), `MFAPI NAV refresh for ${target.name}`)) as MfApiSchemeResponse;
      const latestNavRow = raw.data?.[0];
      const navValue =
        typeof latestNavRow?.nav === "number"
          ? latestNavRow.nav
          : typeof latestNavRow?.nav === "string"
            ? Number(latestNavRow.nav)
            : Number.NaN;

      if (!Number.isFinite(navValue)) {
        throw new Error(`MFAPI NAV payload for ${target.name} did not include a numeric latest NAV.`);
      }

      const navDate = parseNavDate(latestNavRow?.date, now);

      return {
        slug: target.slug,
        source: raw.meta?.fund_house?.trim() || "MFAPI",
        sourceCode: `mfapi:${schemeCode}`,
        nav: Number(navValue.toFixed(4)),
        navDate,
        lastUpdated: `${navDate}T15:30:00.000Z`,
        returns1Y: undefined,
      };
    }),
  );
  const fundNavs = settledNavs
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (schemeMatches.length > 0 && fundNavs.length === 0) {
    throw new Error("MFAPI NAV refresh did not return any usable fund NAV payloads.");
  }

  return { fundNavs };
}

async function fetchActiveIndexWeightRows() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    return new Map<string, IndexWeightRosterRow[]>();
  }

  const supabase = createSupabaseAdminClient();
  await ensureTrackedIndexFoundationData(supabase);
  const today = new Date().toISOString().slice(0, 10);
  const trackedSlugs = firstTrustedIndexTargets.map((target) => target.slug);
  const { data: trackedRows, error: trackedError } = await supabase
    .from("tracked_indexes")
    .select("id, slug")
    .in("slug", trackedSlugs);

  if (trackedError || !trackedRows || trackedRows.length === 0) {
    return new Map<string, IndexWeightRosterRow[]>();
  }

  const trackedIdBySlug = new Map(
    trackedRows
      .filter(
        (row): row is { id: string; slug: string } =>
          typeof row?.id === "string" && typeof row?.slug === "string",
      )
      .map((row) => [row.slug, row.id]),
  );
  const { data: rawWeights, error: weightError } = await supabase
    .from("index_component_weights")
    .select(
      "tracked_index_id, component_symbol, component_name, weight, effective_from, effective_to, source_code",
    )
    .in("tracked_index_id", Array.from(trackedIdBySlug.values()))
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .order("weight", { ascending: false });

  if (weightError || !rawWeights || rawWeights.length === 0) {
    return new Map<string, IndexWeightRosterRow[]>();
  }

  const slugByTrackedId = new Map(Array.from(trackedIdBySlug.entries()).map(([slug, id]) => [id, slug]));
  const deduped = new Map<string, IndexWeightRosterRow>();

  for (const row of rawWeights) {
    const trackedIndexId =
      typeof row?.tracked_index_id === "string" ? row.tracked_index_id : "";
    const slug = slugByTrackedId.get(trackedIndexId);
    const effectiveTo = typeof row?.effective_to === "string" ? row.effective_to : null;
    const weight = parseNumericValue(row?.weight);

    if (!slug || !weight || (effectiveTo && effectiveTo < today)) {
      continue;
    }

    const componentSymbol =
      typeof row?.component_symbol === "string" ? row.component_symbol.trim() : "";
    const componentName =
      typeof row?.component_name === "string" ? row.component_name.trim() : "";

    if (!componentSymbol || !componentName) {
      continue;
    }

    const key = `${slug}:${componentSymbol}`;
    if (deduped.has(key)) {
      continue;
    }

    deduped.set(key, {
      slug,
      componentSymbol,
      componentName,
      weight: Number(weight.toFixed(4)),
      sourceCode: typeof row?.source_code === "string" ? row.source_code : null,
    });
  }

  const rowsBySlug = new Map<string, IndexWeightRosterRow[]>();

  for (const row of deduped.values()) {
    const existing = rowsBySlug.get(row.slug) ?? [];
    existing.push(row);
    rowsBySlug.set(row.slug, existing);
  }

  for (const rows of rowsBySlug.values()) {
    rows.sort((left, right) => right.weight - left.weight);
  }

  return rowsBySlug;
}

async function fetchLatestDurableQuoteStatuses() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    return new Map<string, LatestQuoteStatusRow>();
  }

  const supabase = createSupabaseAdminClient();
  const trackedSlugs = firstTrustedStockTargets.map((target) => target.slug);
  const { data, error } = await supabase
    .from("market_series_status")
    .select("asset_slug, latest_change_percent, latest_point_at")
    .eq("series_type", "stock_quote")
    .eq("refresh_status", "live")
    .in("asset_slug", trackedSlugs);

  if (error || !data || data.length === 0) {
    return new Map<string, LatestQuoteStatusRow>();
  }

  return new Map(
    data
      .map((row) => {
        const assetSlug = typeof row?.asset_slug === "string" ? row.asset_slug : "";
        const changePercent = parseNumericValue(row?.latest_change_percent);
        const latestPointAt =
          typeof row?.latest_point_at === "string" ? row.latest_point_at : null;

        if (!assetSlug || changePercent === null) {
          return null;
        }

        return [
          assetSlug,
          {
            assetSlug,
            changePercent: Number(changePercent.toFixed(4)),
            latestPointAt,
          },
        ] as const;
      })
      .filter(
        (
          entry,
        ): entry is readonly [string, LatestQuoteStatusRow] => Boolean(entry),
      ),
  );
}

function buildIndexComponentsFromDurableQuotes(
  weightRows: IndexWeightRosterRow[],
  latestQuoteBySlug: Map<string, LatestQuoteStatusRow>,
) {
  return weightRows
    .map((row) => {
      const stockSlug = stockSlugBySymbol.get(row.componentSymbol);
      const latestQuote = stockSlug ? latestQuoteBySlug.get(stockSlug) : null;

      if (!latestQuote) {
        return null;
      }

      const contribution = Number(((row.weight * latestQuote.changePercent) / 100).toFixed(4));

      return {
        symbol: row.componentSymbol,
        name: row.componentName,
        weight: Number(row.weight.toFixed(4)),
        changePercent: latestQuote.changePercent,
        contribution,
        signal: normalizeComponentSignal(latestQuote.changePercent),
      } satisfies BuiltIndexComponent;
    })
    .filter((component): component is BuiltIndexComponent => Boolean(component));
}

function matchIndexRow(
  rows: NseAllIndicesRow[],
  slug: (typeof firstTrustedIndexTargets)[number]["slug"],
) {
  const aliases = new Set(INDEX_ENDPOINT_ALIASES[slug].map(normalizeIndexName));
  return rows.find((row) => {
    const indexName = normalizeIndexName(row.index);
    const indexSymbol = normalizeIndexName(row.indexSymbol);
    return aliases.has(indexName) || aliases.has(indexSymbol);
  });
}

async function fetchNseIndexSnapshotPayloads(baseUrl: string) {
  const raw = (await fetchJson(baseUrl, "Index refresh")) as NseAllIndicesResponse;
  const indexRows = Array.isArray(raw?.data) ? raw.data : [];
  const weightsBySlug = await fetchActiveIndexWeightRows();
  const latestQuoteBySlug = await fetchLatestDurableQuoteStatuses();
  const fallbackTimestamp = new Date().toISOString();
  const endpointTimestamp = parseNseDateTime(raw?.timestamp, fallbackTimestamp);

  const indexSnapshots = firstTrustedIndexTargets
    .map((target) => {
      const matchedEndpointRow = matchIndexRow(indexRows, target.slug);
      const weightRows = weightsBySlug.get(target.slug) ?? [];
      const liveComponents = buildIndexComponentsFromDurableQuotes(weightRows, latestQuoteBySlug);

      if (liveComponents.length === 0) {
        return null;
      }

      const coveredWeightShare = Number(
        liveComponents.reduce((total, component) => total + component.weight, 0).toFixed(2),
      );
      const positiveWeightShare = Number(
        liveComponents
          .filter((component) => component.changePercent > 0)
          .reduce((total, component) => total + component.weight, 0)
          .toFixed(2),
      );
      const negativeWeightShare = Number(
        liveComponents
          .filter((component) => component.changePercent < 0)
          .reduce((total, component) => total + component.weight, 0)
          .toFixed(2),
      );
      const weightedBreadthScore = Number(
        liveComponents.reduce((total, component) => total + component.contribution, 0).toFixed(2),
      );
      const coveredWeightBase = Math.max(coveredWeightShare, 1);
      const componentDerivedMove = Number(
        (
          liveComponents.reduce(
            (total, component) => total + component.changePercent * component.weight,
            0,
          ) / coveredWeightBase
        ).toFixed(2),
      );
      const movePercent = Number(
        (
          parseNumericValue(matchedEndpointRow?.percentChange) ?? componentDerivedMove
        ).toFixed(2),
      );
      const advancingCount =
        Number(parseNumericValue(matchedEndpointRow?.advances) ?? liveComponents.filter((component) => component.changePercent > 0).length);
      const decliningCount =
        Number(parseNumericValue(matchedEndpointRow?.declines) ?? liveComponents.filter((component) => component.changePercent < 0).length);
      const latestComponentPoint = liveComponents
        .map((component) => {
          const stockSlug = stockSlugBySymbol.get(component.symbol);
          return stockSlug ? latestQuoteBySlug.get(stockSlug)?.latestPointAt ?? null : null;
        })
        .find(Boolean);
      const snapshotAt = matchedEndpointRow
        ? endpointTimestamp
        : normalizeIsoTimestamp(latestComponentPoint, fallbackTimestamp);
      const partialCoverage = liveComponents.length < weightRows.length;
      const sourceLabel = matchedEndpointRow
        ? partialCoverage
          ? "NSE allIndices + partial durable component coverage"
          : "NSE allIndices + durable component coverage"
        : partialCoverage
          ? "Durable component coverage (partial)"
          : "Durable component coverage";

      return {
        slug: target.slug,
        source: sourceLabel,
        sourceCode: INDEX_SOURCE_CODE[target.slug],
        snapshotAt,
        sessionPhase: deriveIndexSessionPhase(snapshotAt),
        movePercent,
        weightedBreadthScore,
        advancingCount,
        decliningCount,
        positiveWeightShare,
        negativeWeightShare,
        marketMood: summarizeIndexMood(weightedBreadthScore),
        dominanceLabel: summarizeIndexDominance(positiveWeightShare, negativeWeightShare),
        trendLabel: summarizeIndexTrend(movePercent),
        components: liveComponents,
        metadata: {
          coverage: {
            matchedComponents: liveComponents.length,
            rosterComponents: weightRows.length,
            coveredWeightShare,
            aggregateSource: matchedEndpointRow ? "index_endpoint" : "durable_component_coverage",
          },
        },
      };
    })
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));

  if (indexSnapshots.length === 0) {
    throw new Error(
      "Index refresh did not produce any durable snapshots. Confirm tracked_indexes and index_component_weights are seeded, and confirm at least one tracked index component has live durable stock-quote coverage.",
    );
  }

  return { indexSnapshots };
}

function tryExtractSegmentPayload(
  key: RefreshPayloadSegmentKey,
  raw: unknown,
): Partial<MarketDataIngestionPayload> | null {
  try {
    return extractSegmentPayload(key, raw);
  } catch {
    return null;
  }
}

async function fetchSegmentedRefreshPayload() {
  const config = getRuntimeLaunchConfig();
  const payload: MarketDataIngestionPayload = {};
  const requestedSegments: RefreshPayloadSegmentKey[] = [];

  const segmentConfigs: Array<[RefreshPayloadSegmentKey, string, string]> = [
    ["stockQuotes", config.marketDataQuoteEndpoint, "Stock-quote refresh"],
    ["stockCharts", config.marketDataOhlcvEndpoint, "OHLCV refresh"],
    ["fundNavs", config.marketDataFundNavEndpoint, "Fund NAV refresh"],
    ["indexSnapshots", config.marketDataIndexEndpoint, "Index refresh"],
  ];

  for (const [key, url, label] of segmentConfigs) {
    if (!url) continue;
    let segmentPayload: Partial<MarketDataIngestionPayload> | null = null;

    if (key === "stockQuotes" && isNseUrl(url) && url.includes("/api/quote-equity")) {
      segmentPayload = await fetchNseStockQuotePayloads(url);
    } else if (key === "indexSnapshots" && isNseAllIndicesUrl(url)) {
      segmentPayload = await fetchNseIndexSnapshotPayloads(url);
    } else if (key === "fundNavs" && isMfApiDirectoryUrl(url)) {
      segmentPayload = await fetchMfApiFundNavPayloads(url);
    } else {
      const raw = await fetchJson(url, label);
      segmentPayload = tryExtractSegmentPayload(key, raw);
    }

    if (!segmentPayload) {
      continue;
    }

    Object.assign(payload, segmentPayload);
    const normalizedSegment = segmentPayload[key];
    if (Array.isArray(normalizedSegment) && normalizedSegment.length > 0) {
      requestedSegments.push(key);
    }
  }

  if (requestedSegments.length === 0) {
    throw new Error("No segmented market-data refresh endpoints are configured.");
  }

  return {
    payload,
    requestedSegments,
    sourceMode: "segmented_endpoints" as const,
  };
}

async function fetchProviderRefreshPayload() {
  const config = getRuntimeLaunchConfig();
  if (!config.marketDataProviderUrl) {
    throw new Error("MARKET_DATA_PROVIDER_URL is not configured.");
  }

  const raw = await fetchJson(config.marketDataProviderUrl, "Provider refresh");
  return {
    payload: extractCompositePayload(raw),
    requestedSegments: ["stockQuotes", "stockCharts", "fundNavs", "indexSnapshots"] as RefreshPayloadSegmentKey[],
    sourceMode: "provider_payload" as const,
  };
}

export function getMarketDataRefreshReadiness() {
  const config = getRuntimeLaunchConfig();
  const hostedRequirements = getHostedRuntimeRequirements();
  const segmentedEndpointCount = [
    config.marketDataQuoteEndpoint,
    config.marketDataOhlcvEndpoint,
    config.marketDataFundNavEndpoint,
    config.marketDataIndexEndpoint,
  ].filter(Boolean).length;

  return {
    adminSupabaseReady: hasRuntimeSupabaseAdminEnv(),
    refreshSecretReady: Boolean(config.marketDataRefreshSecret),
    providerUrlReady: Boolean(config.marketDataProviderUrl),
    providerTokenReady: Boolean(config.marketDataProviderToken),
    quoteEndpointReady: Boolean(config.marketDataQuoteEndpoint),
    ohlcvEndpointReady: Boolean(config.marketDataOhlcvEndpoint),
    fundNavEndpointReady: Boolean(config.marketDataFundNavEndpoint),
    indexEndpointReady: Boolean(config.marketDataIndexEndpoint),
    segmentedEndpointCount,
    sourceMode:
      segmentedEndpointCount > 0
        ? "segmented_endpoints"
        : config.marketDataProviderUrl
          ? "provider_payload"
          : "configuration_pending",
    mode:
      hasRuntimeSupabaseAdminEnv() && (segmentedEndpointCount > 0 || config.marketDataProviderUrl)
        ? "refresh_ready"
        : "configuration_pending",
    hostedMissingEnv: hostedRequirements.missingMarketData,
  };
}

export function getMarketDataRefreshProofStatus() {
  const readiness = getMarketDataRefreshReadiness();
  const exactMissing: string[] = [];
  const recommendedMissing: string[] = [];

  if (!readiness.adminSupabaseReady) {
    exactMissing.push("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!readiness.refreshSecretReady) {
    exactMissing.push("MARKET_DATA_REFRESH_SECRET");
  }

  if (readiness.sourceMode === "configuration_pending") {
    if (isHostedAppRuntime()) {
      exactMissing.push(
        "MARKET_DATA_PROVIDER_URL or the segmented endpoint env set (MARKET_DATA_QUOTE_ENDPOINT, MARKET_DATA_FUND_NAV_ENDPOINT, MARKET_DATA_INDEX_ENDPOINT)",
      );
    } else {
      if (!readiness.quoteEndpointReady) {
        exactMissing.push("marketData.quoteEndpoint");
      }
      if (!readiness.fundNavEndpointReady) {
        exactMissing.push("marketData.fundNavEndpoint");
      }
      if (!readiness.providerUrlReady) {
        recommendedMissing.push("marketData.providerUrl");
      }
    }
  }

  if (!readiness.indexEndpointReady) {
    recommendedMissing.push("marketData.indexEndpoint");
  }

  if (!readiness.ohlcvEndpointReady) {
    recommendedMissing.push("marketData.ohlcvEndpoint");
  }

  return {
    readiness,
    exactMissing,
    recommendedMissing,
    proofMode:
      readiness.mode === "refresh_ready" && readiness.refreshSecretReady
        ? "verification_ready"
        : "blocked",
    sourceLabel:
      readiness.sourceMode === "segmented_endpoints"
        ? "segmented refresh endpoints"
        : readiness.sourceMode === "provider_payload"
          ? "provider payload"
          : "not configured",
    proofRoute: "/api/market-data/refresh",
    proofPages: [
      "/admin/market-data",
      "/stocks/tata-motors",
      "/stocks/hdfc-bank",
      "/mutual-funds/hdfc-mid-cap-opportunities",
      "/nifty50",
      "/sensex",
    ],
    proofSqlTargets: [
      "public.market_refresh_runs",
      "public.market_series_status",
      "public.stock_quote_history",
      "public.stock_ohlcv_history",
      "public.fund_nav_history",
      "public.index_tracker_snapshots",
      "public.index_component_snapshots",
    ],
  };
}

export async function runMarketDataSnapshotRefresh() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are required for snapshot refresh.");
  }

  const readiness = getMarketDataRefreshReadiness();
  const refreshSource =
    readiness.sourceMode === "segmented_endpoints"
      ? await fetchSegmentedRefreshPayload()
      : readiness.sourceMode === "provider_payload"
        ? await fetchProviderRefreshPayload()
        : (() => {
            throw new Error("No durable market-data refresh source is configured yet.");
          })();

  const result = await ingestMarketDataPayload(refreshSource.payload, {
    triggerSource: "snapshot_refresh",
    requestedBy: "trigger_refresh",
    taskIdentifier: "market-data-snapshot-refresh",
    ingestMode: "refresh_pipeline",
  });

  if (!result.ok) {
    const summary = result.failures
      .map((failure) => `${failure.seriesType}:${failure.assetSlug}:${failure.message}`)
      .join(", ");
    throw new Error(`Durable market-data refresh completed with ${result.failures.length} series failures: ${summary}`);
  }

  return {
    sourceMode: refreshSource.sourceMode,
    requestedSegments: refreshSource.requestedSegments,
    ...result,
  };
}
