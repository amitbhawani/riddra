import { unstable_noStore as noStore } from "next/cache";

import {
  type IndexComponent,
  type IndexSnapshot,
  type IndexTimelinePoint,
} from "@/lib/index-intelligence";
import { getBenchmarkHistory, getBenchmarkReturns } from "@/lib/benchmark-history";
import { getDurableIndexComponentSnapshots } from "@/lib/index-component-store";
import { getIndexSnapshotPresentation } from "@/lib/market-session";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { getSourceEntryStore } from "@/lib/source-entry-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const TRACKED_INDEX_SLUGS = ["nifty50", "sensex", "banknifty", "finnifty"] as const;
const INDEX_READ_CACHE_TTL_MS = 30_000;

export class IndexDataReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexDataReadError";
  }
}

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const indexSnapshotCache = new Map<string, TimedCacheEntry<IndexSnapshot | null>>();
const indexSnapshotsCache = new Map<string, TimedCacheEntry<IndexSnapshot[]>>();
const indexWeightRosterCache = new Map<string, TimedCacheEntry<IndexWeightRoster | null>>();
const indexWeightRostersCache = new Map<string, TimedCacheEntry<IndexWeightRoster[]>>();

function normalizeTrackedIndexSlugs(slugs: readonly string[]) {
  return [...new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean))].filter((slug) =>
    TRACKED_INDEX_SLUGS.includes(slug as (typeof TRACKED_INDEX_SLUGS)[number]),
  );
}

function readTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string) {
  const cached = cache.get(key);

  if (!cached) {
    return { hit: false as const, value: null };
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return { hit: false as const, value: null };
  }

  return { hit: true as const, value: cached.value };
}

function writeTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + INDEX_READ_CACHE_TTL_MS,
  });
}

const INDEX_ROUTE_META: Record<
  (typeof TRACKED_INDEX_SLUGS)[number],
  {
    title: string;
    shortName: string;
    sourceCode: string;
  }
> = {
  nifty50: {
    title: "Nifty 50",
    shortName: "Nifty50",
    sourceCode: "nse_index",
  },
  sensex: {
    title: "Sensex",
    shortName: "Sensex",
    sourceCode: "bse_sensex",
  },
  banknifty: {
    title: "Bank Nifty",
    shortName: "BankNifty",
    sourceCode: "nse_bank_index",
  },
  finnifty: {
    title: "Fin Nifty",
    shortName: "FinNifty",
    sourceCode: "nse_financial_services_index",
  },
};

function summarizeMood(score: number): IndexSnapshot["marketMood"] {
  if (score >= 0.45) return "Bullish";
  if (score <= -0.45) return "Bearish";
  return "Mixed";
}

function summarizeBreadth(score: number) {
  if (score >= 0.45) return "Broad-based strength";
  if (score <= -0.45) return "Broad-based weakness";
  return "Mixed breadth";
}

function summarizeDominance(positiveWeightShare: number, negativeWeightShare: number) {
  if (positiveWeightShare >= 60) return "Leaders are in control";
  if (negativeWeightShare >= 60) return "Draggers are dominating";
  return "Market tug-of-war";
}

function summarizeTrend(timeline: IndexTimelinePoint[]) {
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  if (!first || !last) return "Flat intraday tone";

  const delta = Number((last.weightedBreadthScore - first.weightedBreadthScore).toFixed(2));

  if (delta >= 0.25) return "Improving through the session";
  if (delta <= -0.25) return "Weakening through the session";
  return "Balanced intraday tone";
}

function sortPullers(components: IndexComponent[]) {
  return [...components]
    .filter((item) => item.contribution > 0)
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 3);
}

function sortDraggers(components: IndexComponent[]) {
  return [...components]
    .filter((item) => item.contribution < 0)
    .sort((left, right) => left.contribution - right.contribution)
    .slice(0, 3);
}

function computeComponentContribution(weight: number, changePercent: number) {
  return Number(((weight * changePercent) / 100).toFixed(2));
}

function buildConcentrationLabel(topFiveWeight: number, coveredWeightShare: number) {
  if (topFiveWeight >= 55 || coveredWeightShare >= 75) {
    return "Highly concentrated visible set";
  }

  if (topFiveWeight >= 40 || coveredWeightShare >= 60) {
    return "Moderately concentrated visible set";
  }

  return "Broader visible mix";
}

function buildConcentrationSummary(visibleCount: number, indexSize: number | undefined, coveredWeightShare: number) {
  if (indexSize && visibleCount < indexSize) {
    return `Top ${visibleCount} visible constituents currently represent ${coveredWeightShare.toFixed(2)}% of the index weight.`;
  }

  return `Visible constituents currently represent ${coveredWeightShare.toFixed(2)}% of the index weight.`;
}

type SnapshotRow = {
  session_phase: string | null;
  move_percent: number | null;
  weighted_breadth_score: number | null;
  advancing_count: number | null;
  declining_count: number | null;
  positive_weight_share: number | null;
  negative_weight_share: number | null;
  market_mood: string | null;
  dominance_label: string | null;
  trend_label: string | null;
  snapshot_at: string;
  source_code: string | null;
  source_label?: string | null;
  ingest_mode?: string | null;
  component_count?: number | null;
  payload?:
    | {
        coverage?: {
          matchedComponents?: number;
          rosterComponents?: number;
          coveredWeightShare?: number;
        };
      }
    | null;
};

type ComponentRow = {
  component_symbol: string;
  component_name: string;
  weight: number | null;
  change_percent: number | null;
  contribution: number | null;
  signal: string | null;
};

type IndexRow = {
  id?: string;
  slug: string;
  title: string;
  primary_source_code: string | null;
  status?: string | null;
};

type WeightRow = {
  component_symbol: string;
  component_name: string;
  weight: number | null;
  effective_from: string;
  effective_to: string | null;
  source_code: string | null;
};

export type IndexWeightRoster = {
  slug: IndexSnapshot["slug"];
  title: string;
  shortName: string;
  sourceCode: string;
  lastUpdated: string;
  note: string;
  components: Array<{
    symbol: string;
    name: string;
    weight: number;
  }>;
};

function formatRosterDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function mapSignal(value: string | null): IndexComponent["signal"] {
  if (value === "bullish" || value === "bearish" || value === "neutral") return value;
  return "neutral";
}

async function createSupabaseIndexReadClient() {
  if (hasRuntimeSupabaseAdminEnv()) {
    return createSupabaseAdminClient();
  }

  return createSupabaseServerClient();
}

function buildIndexReadError(message: string, error?: unknown) {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown index read failure.";

  return new IndexDataReadError(`${message} ${detail}`.trim());
}

function deriveIndexSnapshot(
  indexRow: IndexRow,
  latestSnapshot: SnapshotRow,
  timelineRows: SnapshotRow[],
  componentRows: ComponentRow[],
): IndexSnapshot {
  const coverage = latestSnapshot.payload?.coverage;
  const partialCoverage =
    typeof coverage?.matchedComponents === "number" &&
    typeof coverage?.rosterComponents === "number" &&
    coverage.matchedComponents < coverage.rosterComponents;
  const dataMode =
    latestSnapshot.ingest_mode === "admin_source_entry" || latestSnapshot.ingest_mode === "manual_entry"
      ? "manual"
      : indexRow.status === "live"
        ? "verified"
        : "seeded";
  const marketPresentation = getIndexSnapshotPresentation(dataMode);
  const components: IndexComponent[] = componentRows.map((row) => ({
    symbol: row.component_symbol,
    name: row.component_name,
    weight: Number((row.weight ?? 0).toFixed(2)),
    changePercent: Number((row.change_percent ?? 0).toFixed(2)),
    contribution: Number((row.contribution ?? 0).toFixed(2)),
    signal: mapSignal(row.signal),
  }));

  const timeline: IndexTimelinePoint[] = [...timelineRows]
    .sort((left, right) => left.snapshot_at.localeCompare(right.snapshot_at))
    .map((row) => ({
      timeLabel: new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }).format(new Date(row.snapshot_at)),
      weightedBreadthScore: Number((row.weighted_breadth_score ?? 0).toFixed(2)),
      marketMood: summarizeMood(Number((row.weighted_breadth_score ?? 0).toFixed(2))),
      movePercent: Number((row.move_percent ?? 0).toFixed(2)),
    }));

  const weightedBreadthScore = Number((latestSnapshot.weighted_breadth_score ?? 0).toFixed(2));
  const positiveWeightShare = Number((latestSnapshot.positive_weight_share ?? 0).toFixed(2));
  const negativeWeightShare = Number((latestSnapshot.negative_weight_share ?? 0).toFixed(2));

  return {
    slug: indexRow.slug as IndexSnapshot["slug"],
    title: indexRow.title,
    shortName: indexRow.title.replace(/\s+/g, ""),
    sourceCode: latestSnapshot.source_code ?? indexRow.primary_source_code ?? "nse_index",
    lastUpdated: new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(latestSnapshot.snapshot_at)),
    movePercent: Number((latestSnapshot.move_percent ?? 0).toFixed(2)),
    weightedBreadthScore,
    breadthLabel: summarizeBreadth(weightedBreadthScore),
    marketMood:
      latestSnapshot.market_mood === "Bullish" ||
      latestSnapshot.market_mood === "Bearish" ||
      latestSnapshot.market_mood === "Mixed"
        ? latestSnapshot.market_mood
        : summarizeMood(weightedBreadthScore),
    advancingCount: latestSnapshot.advancing_count ?? 0,
    decliningCount: latestSnapshot.declining_count ?? 0,
    positiveWeightShare,
    negativeWeightShare,
    dominanceLabel:
      latestSnapshot.dominance_label ?? summarizeDominance(positiveWeightShare, negativeWeightShare),
    trendLabel: latestSnapshot.trend_label ?? summarizeTrend(timeline),
    sessionPhase:
      latestSnapshot.session_phase === "Opening drive" ||
      latestSnapshot.session_phase === "Mid-session balance" ||
      latestSnapshot.session_phase === "Closing push"
        ? latestSnapshot.session_phase
        : "Mid-session balance",
    dataMode,
    marketLabel: marketPresentation.marketLabel,
    marketDetail: marketPresentation.marketDetail,
    narrative:
      dataMode === "manual"
        ? "This tracker is using retained manual index rows while the automated source path is still being hardened."
        : partialCoverage
          ? "This tracker is reading a durable delayed index snapshot with partial live component coverage. Missing constituents stay hidden until their durable stock quotes are written."
        : indexRow.status === "live"
          ? "This tracker is reading persisted index snapshots from the configured source path."
          : "This tracker can read stored snapshot history, but the current seed remains a planned intelligence layer until the licensed refresh pipeline is activated.",
    topPullers: sortPullers(components),
    topDraggers: sortDraggers(components),
    timeline,
    components,
    officialSyncNote:
      partialCoverage
        ? `This index snapshot is durable, but the visible constituent list only reflects ${coverage?.matchedComponents ?? components.length}/${coverage?.rosterComponents ?? components.length} components with live durable stock-quote coverage (${coverage?.coveredWeightShare ?? 0}% weight). Missing constituents are intentionally omitted until their delayed quotes are written.`
        : "Component weights and direction should be reviewed against the official index source every trading day before the verified public layer is treated as authoritative.",
  };
}

async function applyBenchmarkHistoryToSnapshot(snapshot: IndexSnapshot): Promise<IndexSnapshot> {
  const historyBars = await getBenchmarkHistory(snapshot.slug);

  if (historyBars.length < 2) {
    return snapshot;
  }

  const benchmarkReturns = await getBenchmarkReturns(snapshot.slug);
  const latestDailyMove = benchmarkReturns["1D"];

  return {
    ...snapshot,
    movePercent:
      typeof latestDailyMove === "number" && Number.isFinite(latestDailyMove)
        ? Number(latestDailyMove.toFixed(2))
        : snapshot.movePercent,
    historyBars,
  };
}

async function applyDurableCompositionSnapshot(snapshot: IndexSnapshot): Promise<IndexSnapshot> {
  const durableSnapshots = await getDurableIndexComponentSnapshots();
  const durableSnapshot = durableSnapshots.find((entry) => entry.indexSlug === snapshot.slug);

  if (!durableSnapshot?.rows.length) {
    return snapshot;
  }

  const existingBySymbol = new Map(snapshot.components.map((component) => [component.symbol, component]));
  const components: IndexComponent[] = durableSnapshot.rows.map((row) => {
    const existing = existingBySymbol.get(row.symbol);
    const changePercent =
      typeof row.dailyReturnPercent === "number"
        ? Number(row.dailyReturnPercent.toFixed(2))
        : existing?.changePercent ?? 0;
    const contribution =
      typeof row.contribution === "number"
        ? Number(row.contribution.toFixed(2))
        : computeComponentContribution(row.weight, changePercent);

    return {
      symbol: row.symbol,
      name: row.name,
      weight: Number(row.weight.toFixed(2)),
      changePercent,
      contribution,
      signal: changePercent > 0 ? "bullish" : changePercent < 0 ? "bearish" : "neutral",
    };
  });

  const topFiveWeight = components.slice(0, 5).reduce((sum, item) => sum + item.weight, 0);
  const coveredWeightShare = Number(
    components.reduce((sum, item) => sum + item.weight, 0).toFixed(2),
  );
  const concentrationLabel = buildConcentrationLabel(topFiveWeight, coveredWeightShare);
  const concentrationSummary = buildConcentrationSummary(
    components.length,
    durableSnapshot.indexSize,
    coveredWeightShare,
  );

  return {
    ...snapshot,
    components,
    topPullers: sortPullers(components),
    topDraggers: sortDraggers(components),
    compositionMeta: {
      sourceLabel: durableSnapshot.sourceLabel,
      sourceDate: durableSnapshot.sourceDate,
      referenceUrl: durableSnapshot.referenceUrl,
      visibleCount: components.length,
      indexSize: durableSnapshot.indexSize,
      coveredWeightShare,
      concentrationLabel,
      concentrationSummary,
    },
    officialSyncNote: `${snapshot.officialSyncNote} ${concentrationSummary}`.trim(),
  };
}

async function applyManualSourceEntries(snapshot: IndexSnapshot): Promise<IndexSnapshot> {
  const store = await getSourceEntryStore();
  const matchingEntries = store.indexEntries
    .filter((entry) => entry.indexSlug === snapshot.slug)
    .sort((left, right) => right.weightPercent - left.weightPercent);

  if (matchingEntries.length === 0) {
    return snapshot;
  }

  const components: IndexComponent[] = matchingEntries.map((entry) => ({
    symbol: entry.symbol,
    name: entry.companyName,
    weight: Number(entry.weightPercent.toFixed(2)),
    changePercent: Number(entry.dailyMovePercent.toFixed(2)),
    contribution: Number(((entry.weightPercent * entry.dailyMovePercent) / 100).toFixed(2)),
    signal: entry.dailyMovePercent > 0 ? "bullish" : entry.dailyMovePercent < 0 ? "bearish" : "neutral",
  }));

  const weightedBreadthScore = Number(
    (
      components.reduce((total, component) => total + component.contribution, 0) /
      Math.max(components.length, 1)
    ).toFixed(2),
  );

  const positiveWeightShare = Number(
    components
      .filter((component) => component.changePercent > 0)
      .reduce((total, component) => total + component.weight, 0)
      .toFixed(2),
  );
  const negativeWeightShare = Number(
    components
      .filter((component) => component.changePercent < 0)
      .reduce((total, component) => total + component.weight, 0)
      .toFixed(2),
  );
  const advancingCount = components.filter((component) => component.changePercent > 0).length;
  const decliningCount = components.filter((component) => component.changePercent < 0).length;
  const latestSourceDate = matchingEntries[0]?.sourceDate ?? snapshot.lastUpdated;

  return {
    ...snapshot,
    lastUpdated: `Manual source entry · ${latestSourceDate}`,
    dataMode: "manual",
    weightedBreadthScore,
    breadthLabel: summarizeBreadth(weightedBreadthScore),
    marketMood: summarizeMood(weightedBreadthScore),
    advancingCount,
    decliningCount,
    positiveWeightShare,
    negativeWeightShare,
    dominanceLabel: summarizeDominance(positiveWeightShare, negativeWeightShare),
    trendLabel: summarizeTrend(snapshot.timeline),
    marketLabel: "Manual source-backed roster",
    marketDetail:
      "This page is currently using the latest admin-entered component rows while the official automated source path is still being hardened.",
    narrative:
      "This index is temporarily being driven by admin-entered source rows so the public page can stay useful during launch cleanup without pretending the automated official refresh is already complete.",
    components,
    topPullers: sortPullers(components),
    topDraggers: sortDraggers(components),
    officialSyncNote:
      "This index is currently using the latest admin-entered source rows. Review those rows against the official factsheet before treating the public roster as final.",
  };
}

async function buildManualSourceEntrySnapshot(slug: string): Promise<IndexSnapshot | null> {
  if (!TRACKED_INDEX_SLUGS.includes(slug as (typeof TRACKED_INDEX_SLUGS)[number])) {
    return null;
  }

  const store = await getSourceEntryStore();
  const matchingEntries = store.indexEntries
    .filter((entry) => entry.indexSlug === slug)
    .sort((left, right) => right.weightPercent - left.weightPercent);

  if (matchingEntries.length === 0) {
    return null;
  }

  const components: IndexComponent[] = matchingEntries.map((entry) => ({
    symbol: entry.symbol,
    name: entry.companyName,
    weight: Number(entry.weightPercent.toFixed(2)),
    changePercent: Number(entry.dailyMovePercent.toFixed(2)),
    contribution: Number(((entry.weightPercent * entry.dailyMovePercent) / 100).toFixed(2)),
    signal: entry.dailyMovePercent > 0 ? "bullish" : entry.dailyMovePercent < 0 ? "bearish" : "neutral",
  }));

  const weightedBreadthScore = Number(
    (
      components.reduce((total, component) => total + component.contribution, 0) /
      Math.max(components.length, 1)
    ).toFixed(2),
  );
  const positiveWeightShare = Number(
    components
      .filter((component) => component.changePercent > 0)
      .reduce((total, component) => total + component.weight, 0)
      .toFixed(2),
  );
  const negativeWeightShare = Number(
    components
      .filter((component) => component.changePercent < 0)
      .reduce((total, component) => total + component.weight, 0)
      .toFixed(2),
  );
  const timeline: IndexTimelinePoint[] = [
    {
      timeLabel: "Manual",
      weightedBreadthScore,
      marketMood: summarizeMood(weightedBreadthScore),
      movePercent: Number(
        (
          components.reduce((total, component) => total + component.changePercent * component.weight, 0) /
          Math.max(
            components.reduce((total, component) => total + component.weight, 0),
            1,
          )
        ).toFixed(2),
      ),
    },
  ];
  const latestSourceDate = matchingEntries[0]?.sourceDate ?? new Date().toISOString().slice(0, 10);
  const marketPresentation = getIndexSnapshotPresentation("manual");
  const meta = INDEX_ROUTE_META[slug as (typeof TRACKED_INDEX_SLUGS)[number]];

  return {
    slug: slug as IndexSnapshot["slug"],
    title: meta.title,
    shortName: meta.shortName,
    sourceCode: meta.sourceCode,
    lastUpdated: `Manual source entry · ${latestSourceDate}`,
    movePercent: timeline[0]?.movePercent ?? 0,
    weightedBreadthScore,
    breadthLabel: summarizeBreadth(weightedBreadthScore),
    marketMood: summarizeMood(weightedBreadthScore),
    advancingCount: components.filter((component) => component.changePercent > 0).length,
    decliningCount: components.filter((component) => component.changePercent < 0).length,
    positiveWeightShare,
    negativeWeightShare,
    dominanceLabel: summarizeDominance(positiveWeightShare, negativeWeightShare),
    trendLabel: summarizeTrend(timeline),
    sessionPhase: "Mid-session balance",
    dataMode: "manual",
    marketLabel: marketPresentation.marketLabel,
    marketDetail: marketPresentation.marketDetail,
    narrative:
      "This index route is currently using retained source-entry component rows because a verified delayed snapshot has not been written yet.",
    topPullers: sortPullers(components),
    topDraggers: sortDraggers(components),
    timeline,
    components,
    officialSyncNote:
      "This index is currently using retained source-entry rows. Review those rows against the official index source before treating the public roster as final.",
  };
}

async function getPersistedIndexSnapshotsForSlugs(slugs: readonly string[]) {
  const normalizedSlugs = normalizeTrackedIndexSlugs(slugs);

  if (!normalizedSlugs.length || !hasRuntimeSupabaseEnv()) {
    return new Map<string, IndexSnapshot>();
  }

  const supabase = await createSupabaseIndexReadClient();
  const { data: indexRows, error: indexError } = await supabase
    .from("tracked_indexes")
    .select("id, slug, title, primary_source_code, status")
    .in("slug", normalizedSlugs);

  if (indexError) {
    throw buildIndexReadError("Tracked index cluster lookup failed.", indexError);
  }

  if (!indexRows?.length) {
    return new Map<string, IndexSnapshot>();
  }

  const trackedIndexes = indexRows as IndexRow[];
  const trackedIndexIds = trackedIndexes.map((row) => row.id).filter(Boolean) as string[];

  const { data: snapshotRows, error: snapshotsError } = await supabase
    .from("index_tracker_snapshots")
    .select(
      "id, tracked_index_id, session_phase, move_percent, weighted_breadth_score, advancing_count, declining_count, positive_weight_share, negative_weight_share, market_mood, dominance_label, trend_label, snapshot_at, source_code, source_label, ingest_mode, component_count, payload",
    )
    .in("tracked_index_id", trackedIndexIds)
    .order("snapshot_at", { ascending: false });

  if (snapshotsError) {
    throw buildIndexReadError("Index snapshot cluster read failed.", snapshotsError);
  }

  if (!snapshotRows?.length) {
    return new Map<string, IndexSnapshot>();
  }

  const groupedSnapshots = new Map<string, Array<SnapshotRow & { id?: string | null; tracked_index_id?: string | null }>>();

  for (const row of snapshotRows as Array<SnapshotRow & { id?: string | null; tracked_index_id?: string | null }>) {
    const trackedIndexId = row.tracked_index_id ?? "";
    const existing = groupedSnapshots.get(trackedIndexId) ?? [];
    if (existing.length < 5) {
      existing.push(row);
      groupedSnapshots.set(trackedIndexId, existing);
    }
  }

  const latestSnapshotIds = [...groupedSnapshots.values()]
    .map((rows) => rows[0]?.id)
    .filter(Boolean) as string[];
  const componentRowsBySnapshotId = new Map<string, ComponentRow[]>();

  if (latestSnapshotIds.length > 0) {
    const { data: componentRows, error: componentError } = await supabase
      .from("index_component_snapshots")
      .select("index_snapshot_id, component_symbol, component_name, weight, change_percent, contribution, signal")
      .in("index_snapshot_id", latestSnapshotIds)
      .order("contribution", { ascending: false });

    if (componentError) {
      throw buildIndexReadError("Index component cluster read failed.", componentError);
    }

    for (const row of (componentRows ?? []) as Array<ComponentRow & { index_snapshot_id: string }>) {
      const existing = componentRowsBySnapshotId.get(row.index_snapshot_id) ?? [];
      existing.push({
        component_symbol: row.component_symbol,
        component_name: row.component_name,
        weight: row.weight,
        change_percent: row.change_percent,
        contribution: row.contribution,
        signal: row.signal,
      });
      componentRowsBySnapshotId.set(row.index_snapshot_id, existing);
    }
  }

  const snapshots = new Map<string, IndexSnapshot>();

  for (const indexRow of trackedIndexes) {
    const grouped = groupedSnapshots.get(indexRow.id ?? "");

    if (!grouped?.length) {
      continue;
    }

    const latestSnapshot = grouped[0];
    const components = latestSnapshot.id
      ? componentRowsBySnapshotId.get(latestSnapshot.id) ?? []
      : [];

    snapshots.set(
      indexRow.slug,
      deriveIndexSnapshot(
        {
          id: indexRow.id,
          slug: indexRow.slug,
          title: indexRow.title,
          primary_source_code: indexRow.primary_source_code,
          status: indexRow.status,
        },
        latestSnapshot,
        grouped,
        components,
      ),
    );
  }

  return snapshots;
}

async function getPersistedIndexSnapshot(slug: string): Promise<IndexSnapshot | null> {
  const snapshots = await getPersistedIndexSnapshotsForSlugs([slug]);
  return snapshots.get(slug) ?? null;
}

async function getPersistedIndexWeightRostersForSlugs(slugs: readonly string[]) {
  const normalizedSlugs = normalizeTrackedIndexSlugs(slugs);

  if (!normalizedSlugs.length || !hasRuntimeSupabaseEnv()) {
    return new Map<string, IndexWeightRoster>();
  }

  const supabase = await createSupabaseIndexReadClient();
  const { data: trackedIndexes, error: trackedIndexError } = await supabase
    .from("tracked_indexes")
    .select("id, slug, title, primary_source_code")
    .in("slug", normalizedSlugs);

  if (trackedIndexError) {
    throw buildIndexReadError("Tracked index roster cluster lookup failed.", trackedIndexError);
  }

  if (!trackedIndexes?.length) {
    return new Map<string, IndexWeightRoster>();
  }

  const today = new Date().toISOString().slice(0, 10);
  const trackedIndexIds = trackedIndexes.map((row) => row.id).filter(Boolean) as string[];
  const { data: weightRows, error: weightsError } = await supabase
    .from("index_component_weights")
    .select("tracked_index_id, component_symbol, component_name, weight, effective_from, effective_to, source_code")
    .in("tracked_index_id", trackedIndexIds)
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .order("weight", { ascending: false });

  if (weightsError) {
    throw buildIndexReadError("Index roster weight cluster read failed.", weightsError);
  }

  const groupedWeights = new Map<string, WeightRow[]>();

  for (const row of (weightRows ?? []) as Array<WeightRow & { tracked_index_id: string }>) {
    const existing = groupedWeights.get(row.tracked_index_id) ?? [];
    existing.push({
      component_symbol: row.component_symbol,
      component_name: row.component_name,
      weight: row.weight,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      source_code: row.source_code,
    });
    groupedWeights.set(row.tracked_index_id, existing);
  }

  const rosters = new Map<string, IndexWeightRoster>();

  for (const trackedIndex of trackedIndexes as Array<IndexRow & { id?: string | null }>) {
    const grouped = groupedWeights.get(trackedIndex.id ?? "") ?? [];
    const activeRows = grouped.filter((row) => !row.effective_to || row.effective_to >= today);

    if (!activeRows.length) {
      continue;
    }

    const dedupedRows: WeightRow[] = [];
    const seenSymbols = new Set<string>();

    for (const row of activeRows) {
      if (seenSymbols.has(row.component_symbol)) {
        continue;
      }

      seenSymbols.add(row.component_symbol);
      dedupedRows.push(row);
    }

    if (!dedupedRows.length) {
      continue;
    }

    const latestEffectiveFrom = dedupedRows.reduce(
      (latest, row) => (row.effective_from > latest ? row.effective_from : latest),
      dedupedRows[0].effective_from,
    );
    const meta =
      INDEX_ROUTE_META[trackedIndex.slug as (typeof TRACKED_INDEX_SLUGS)[number]] ??
      INDEX_ROUTE_META.nifty50;

    rosters.set(trackedIndex.slug, {
      slug: trackedIndex.slug as IndexSnapshot["slug"],
      title: trackedIndex.title,
      shortName: meta.shortName,
      sourceCode: trackedIndex.primary_source_code ?? meta.sourceCode,
      lastUpdated: `Reference roster · ${formatRosterDate(latestEffectiveFrom)}`,
      note:
        "This page is using the stored component-weight roster from Supabase. Live breadth, pullers, draggers, and market mood still wait for a persisted index snapshot.",
      components: dedupedRows.map((row) => ({
        symbol: row.component_symbol,
        name: row.component_name,
        weight: Number((row.weight ?? 0).toFixed(2)),
      })),
    });
  }

  return rosters;
}

async function getPersistedIndexWeightRoster(slug: string): Promise<IndexWeightRoster | null> {
  const rosters = await getPersistedIndexWeightRostersForSlugs([slug]);
  return rosters.get(slug) ?? null;
}

export async function getIndexSnapshot(slug: string): Promise<IndexSnapshot | null> {
  noStore();
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const cached = readTimedCache(indexSnapshotCache, normalizedSlug);
  if (cached.hit) {
    return cached.value;
  }

  const persisted = await getPersistedIndexSnapshot(normalizedSlug);
  if (persisted) {
    const snapshot = await applyDurableCompositionSnapshot(
      await applyBenchmarkHistoryToSnapshot(await applyManualSourceEntries(persisted)),
    );
    writeTimedCache(indexSnapshotCache, normalizedSlug, snapshot);
    return snapshot;
  }

  const manualSnapshot = await buildManualSourceEntrySnapshot(normalizedSlug);
  const snapshot = manualSnapshot
    ? await applyDurableCompositionSnapshot(await applyBenchmarkHistoryToSnapshot(manualSnapshot))
    : null;
  writeTimedCache(indexSnapshotCache, normalizedSlug, snapshot);
  return snapshot;
}

export async function getIndexSnapshots(): Promise<IndexSnapshot[]> {
  noStore();
  const cached = readTimedCache(indexSnapshotsCache, "all");
  if (cached.hit) {
    return cached.value;
  }

  const persistedSnapshots = await getPersistedIndexSnapshotsForSlugs(TRACKED_INDEX_SLUGS);
  const resolved = await Promise.all(
    TRACKED_INDEX_SLUGS.map(async (slug) => {
      const snapshot = persistedSnapshots.get(slug);
      if (snapshot) {
        return applyDurableCompositionSnapshot(
          await applyBenchmarkHistoryToSnapshot(await applyManualSourceEntries(snapshot)),
        );
      }

      const manualSnapshot = await buildManualSourceEntrySnapshot(slug);
      return manualSnapshot
        ? applyDurableCompositionSnapshot(await applyBenchmarkHistoryToSnapshot(manualSnapshot))
        : null;
    }),
  );

  const snapshots = resolved.filter((snapshot): snapshot is IndexSnapshot => Boolean(snapshot));
  writeTimedCache(indexSnapshotsCache, "all", snapshots);
  return snapshots;
}

export async function getIndexWeightRoster(slug: string): Promise<IndexWeightRoster | null> {
  noStore();
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const cached = readTimedCache(indexWeightRosterCache, normalizedSlug);
  if (cached.hit) {
    return cached.value;
  }

  const snapshot = await getIndexSnapshot(normalizedSlug);
  if (snapshot) {
    writeTimedCache(indexWeightRosterCache, normalizedSlug, null);
    return null;
  }

  const roster = await getPersistedIndexWeightRoster(normalizedSlug);
  writeTimedCache(indexWeightRosterCache, normalizedSlug, roster);
  return roster;
}

export async function getIndexWeightRosters(): Promise<IndexWeightRoster[]> {
  noStore();
  const cached = readTimedCache(indexWeightRostersCache, "all");
  if (cached.hit) {
    return cached.value;
  }

  const persistedSnapshots = await getPersistedIndexSnapshotsForSlugs(TRACKED_INDEX_SLUGS);
  const missingSnapshotSlugs = TRACKED_INDEX_SLUGS.filter((slug) => !persistedSnapshots.has(slug));
  const persistedRosters = await getPersistedIndexWeightRostersForSlugs(missingSnapshotSlugs);
  const resolved = missingSnapshotSlugs
    .map((slug) => persistedRosters.get(slug) ?? null)
    .filter((roster): roster is IndexWeightRoster => Boolean(roster));
  writeTimedCache(indexWeightRostersCache, "all", resolved);
  return resolved;
}
