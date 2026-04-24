"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  doesRowMatchScreenerSectorFilter,
  getScreenerSectorFilterOptions,
  rankScreenerRows,
  screenerMetricGroupIds,
  screenerSortOptions,
  type ScreenerMetricGroupId,
  type ScreenerSectorFilter,
  type ScreenerSortOption,
} from "@/lib/screener-search";
import type { ScreenerRow } from "@/lib/screener";

type SavedStack = {
  title: string;
  summary: string;
  filters: string[];
};

type MetricGroup = {
  id: ScreenerMetricGroupId;
  title: string;
  items: string[];
};

type MetricColumnKey =
  | "name"
  | "sector"
  | "cmp"
  | "dayMove"
  | "roe"
  | "debtEquity"
  | "marketCap"
  | "routeState"
  | "position52W"
  | "truth"
  | "compare"
  | "pending"
  | "nextStep";

type MetricColumn = {
  key: MetricColumnKey;
  label: string;
};

const metricGroupViews: Record<ScreenerMetricGroupId, { description: string; columns: MetricColumn[] }> = {
  "route-backed-fundamentals": {
    description:
      "Keep the table centered on the honest route-backed fundamentals the product can already defend today.",
    columns: [
      { key: "name", label: "Name" },
      { key: "sector", label: "Sector" },
      { key: "cmp", label: "CMP" },
      { key: "roe", label: "ROE" },
      { key: "debtEquity", label: "Debt / Equity" },
      { key: "marketCap", label: "Market Cap" },
      { key: "position52W", label: "52W position" },
      { key: "truth", label: "Truth" },
      { key: "nextStep", label: "Next step" },
    ],
  },
  "market-snapshot": {
    description:
      "Use this view when the shortlist needs a faster tape-and-context read before deeper compare work starts.",
    columns: [
      { key: "name", label: "Name" },
      { key: "sector", label: "Sector" },
      { key: "cmp", label: "CMP" },
      { key: "dayMove", label: "1D Move" },
      { key: "routeState", label: "Route state" },
      { key: "position52W", label: "52W position" },
      { key: "truth", label: "Truth" },
      { key: "nextStep", label: "Next step" },
    ],
  },
  "decision-handoff": {
    description:
      "Keep the shortlist decision-ready by foregrounding route links, compare posture, and the narrative for why a name is worth opening next.",
    columns: [
      { key: "name", label: "Name" },
      { key: "sector", label: "Sector" },
      { key: "cmp", label: "CMP" },
      { key: "routeState", label: "Route state" },
      { key: "truth", label: "Truth" },
      { key: "compare", label: "Compare setup" },
      { key: "nextStep", label: "Next step" },
    ],
  },
  "pending-metric-lanes": {
    description:
      "This view stays explicit about what is still missing, so the screener never implies unsupported factor depth.",
    columns: [
      { key: "name", label: "Name" },
      { key: "sector", label: "Sector" },
      { key: "cmp", label: "CMP" },
      { key: "truth", label: "Truth" },
      { key: "pending", label: "Pending lanes" },
      { key: "nextStep", label: "Next step" },
    ],
  },
};

function getPendingLaneNote(row: ScreenerRow) {
  if (row.routeTruthState === "delayed_snapshot") {
    return "Delayed snapshots are active, so this name is ready for future factor and event-history enrichment once source jobs write deeper metrics.";
  }

  if (row.routeTruthState === "manual_close") {
    return "Manual last-close context keeps the route usable, but deeper factor claims should wait for automated market and source writes.";
  }

  return "Keep this name in discovery mode only until source-backed metrics replace the seeded fallback layer.";
}

const truthFilterOptions = [
  "All truth states",
  "Verified or managed only",
  "Delayed snapshots only",
  "Manual close only",
  "Seeded metrics only",
] as const;

type TruthFilterOption = (typeof truthFilterOptions)[number];

function getTruthPostureSummary(rows: ScreenerRow[]) {
  if (rows.length === 0) {
    return {
      label: "No active route truth",
      detail: "Broaden the stack or filters to bring route-backed names back into the current screener view.",
    };
  }

  const delayedCount = rows.filter((row) => row.routeTruthState === "delayed_snapshot").length;
  const managedCount = rows.filter((row) => row.routeTruthState === "manual_close").length;
  const seededCount = rows.filter((row) => row.routeTruthState === "seeded").length;

  if (seededCount === 0) {
    return {
      label: "Verified or managed shortlist",
      detail: `${delayedCount} delayed snapshots and ${managedCount} managed last-close routes remain in view, so this shortlist is suitable for a stronger demo or compare handoff.`,
    };
  }

  if (seededCount === rows.length) {
    return {
      label: "Seeded-only discovery lane",
      detail: "Every visible row is still using fallback route context, so use this screen for discovery and prioritization rather than hard conviction claims.",
    };
  }

  return {
    label: "Mixed truth shortlist",
    detail: `${delayedCount + managedCount} route-backed names and ${seededCount} seeded rows are visible, so keep the first click on the strongest verified or managed route before discussing the wider list.`,
  };
}

function getPendingLaneSummary(rows: ScreenerRow[], pendingIntentCount: number) {
  const seededCount = rows.filter((row) => row.routeTruthState === "seeded").length;

  if (pendingIntentCount > 0) {
    return "The current query is asking for still-pending factor lanes, so treat the results as a shortlist starter and shift to stock, chart, or compare routes for the real narrative.";
  }

  if (seededCount > 0) {
    return `${seededCount} visible names still rely on seeded fallback metrics, so the screener should narrow attention and hand users into route-level detail rather than imply full factor completeness.`;
  }

  return "This view is staying inside supported route-backed fields, so the next risk is not missing truth but failing to move quickly enough into the right stock or compare route.";
}

function getInitialStackTitle(savedStacks: SavedStack[], initialStack: string | null | undefined) {
  if (initialStack && savedStacks.some((stack) => stack.title === initialStack)) {
    return initialStack;
  }

  return savedStacks[0]?.title ?? "";
}

function getInitialSectorValue(rows: ScreenerRow[], initialSectorFilter: ScreenerSectorFilter | null | undefined) {
  const sectorOptions = getScreenerSectorFilterOptions(rows.map((row) => row.sector));

  if (initialSectorFilter && sectorOptions.includes(initialSectorFilter)) {
    return initialSectorFilter;
  }

  return "All sectors";
}

function getInitialTruthValue(initialTruthFilter: TruthFilterOption | null | undefined) {
  if (initialTruthFilter && truthFilterOptions.includes(initialTruthFilter)) {
    return initialTruthFilter;
  }

  return "All truth states";
}

export function ScreenerWorkspace({
  savedStacks,
  metricGroups,
  rows,
  initialSearchTerm = "",
  initialSectorFilter = null,
  initialTruthFilter = null,
  initialCompareOnly = false,
  initialStack = null,
  initialMetricGroup = null,
  initialSortBy = null,
}: {
  savedStacks: SavedStack[];
  metricGroups: MetricGroup[];
  rows: ScreenerRow[];
  initialSearchTerm?: string;
  initialSectorFilter?: ScreenerSectorFilter | null;
  initialTruthFilter?: TruthFilterOption | null;
  initialCompareOnly?: boolean;
  initialStack?: string | null;
  initialMetricGroup?: ScreenerMetricGroupId | null;
  initialSortBy?: ScreenerSortOption | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeStack, setActiveStack] = useState(getInitialStackTitle(savedStacks, initialStack));
  const [activeMetricGroup, setActiveMetricGroup] = useState(() => {
    if (initialMetricGroup) {
      const matchedGroup = metricGroups.find((group) => group.id === initialMetricGroup);

      if (matchedGroup) {
        return matchedGroup.title;
      }
    }

    return metricGroups[0]?.title ?? "";
  });
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sectorFilter, setSectorFilter] = useState(getInitialSectorValue(rows, initialSectorFilter));
  const [truthFilter, setTruthFilter] = useState<TruthFilterOption>(getInitialTruthValue(initialTruthFilter));
  const [sortBy, setSortBy] = useState<ScreenerSortOption>(initialSortBy ?? "Market cap");
  const [compareOnly, setCompareOnly] = useState(initialCompareOnly);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const availableSectors = useMemo(() => Array.from(new Set(rows.map((row) => row.sector))), [rows]);
  const sectorOptions = useMemo(() => getScreenerSectorFilterOptions(availableSectors), [availableSectors]);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  useEffect(() => {
    setSectorFilter(getInitialSectorValue(rows, initialSectorFilter));
  }, [initialSectorFilter, rows]);

  useEffect(() => {
    setTruthFilter(getInitialTruthValue(initialTruthFilter));
  }, [initialTruthFilter]);

  useEffect(() => {
    setCompareOnly(initialCompareOnly);
  }, [initialCompareOnly]);

  useEffect(() => {
    setActiveStack(getInitialStackTitle(savedStacks, initialStack));
  }, [initialStack, savedStacks]);

  useEffect(() => {
    if (!initialMetricGroup) {
      setActiveMetricGroup(metricGroups[0]?.title ?? "");
      return;
    }

    const matchedGroup = metricGroups.find((group) => group.id === initialMetricGroup);

    if (matchedGroup) {
      setActiveMetricGroup(matchedGroup.title);
    }
  }, [initialMetricGroup, metricGroups]);

  useEffect(() => {
    setSortBy(initialSortBy ?? "Market cap");
  }, [initialSortBy]);

  const filteredRows = useMemo(() => {
    const currentStack = savedStacks.find((item) => item.title === activeStack);

    return rows
      .filter((row) => {
        if (
          currentStack &&
          !currentStack.filters.every((filter) =>
            row.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase()),
          )
        ) {
          return false;
        }

        if (
          sectorFilter !== "All sectors" &&
          !doesRowMatchScreenerSectorFilter(row, sectorFilter, availableSectors)
        ) {
          return false;
        }

        if (truthFilter === "Verified or managed only" && row.routeTruthState === "seeded") {
          return false;
        }

        if (truthFilter === "Delayed snapshots only" && row.routeTruthState !== "delayed_snapshot") {
          return false;
        }

        if (truthFilter === "Manual close only" && row.routeTruthState !== "manual_close") {
          return false;
        }

        if (truthFilter === "Seeded metrics only" && row.routeTruthState !== "seeded") {
          return false;
        }

        if (compareOnly && !row.compareHref) {
          return false;
        }

        return true;
      });
  }, [activeStack, availableSectors, compareOnly, rows, savedStacks, sectorFilter, truthFilter]);

  const searchResult = useMemo(() => rankScreenerRows(filteredRows, searchTerm), [filteredRows, searchTerm]);
  const searchMatches = searchResult.matches;
  const searchIntents = searchResult.intents;

  const visibleRows = useMemo(() => {
    function compareRows(left: ScreenerRow, right: ScreenerRow) {
      switch (sortBy) {
        case "Day move":
          return (right.dayMoveValue ?? -Infinity) - (left.dayMoveValue ?? -Infinity) || left.name.localeCompare(right.name);
        case "ROE":
          return (right.roeValue ?? -Infinity) - (left.roeValue ?? -Infinity) || left.name.localeCompare(right.name);
        case "Debt / Equity":
          return (left.debtEquityValue ?? Infinity) - (right.debtEquityValue ?? Infinity) || left.name.localeCompare(right.name);
        case "Name":
          return left.name.localeCompare(right.name);
        case "Market cap":
        default:
          return (right.marketCapValue ?? -Infinity) - (left.marketCapValue ?? -Infinity) || left.name.localeCompare(right.name);
      }
    }

    if (searchTerm.trim()) {
      return searchMatches.map((item) => item.row).sort(compareRows).sort((left, right) => {
        const leftRank = searchMatches.findIndex((item) => item.row.id === left.id);
        const rightRank = searchMatches.findIndex((item) => item.row.id === right.id);

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return compareRows(left, right);
      });
    }

    return [...filteredRows].sort(compareRows);
  }, [filteredRows, searchMatches, searchTerm, sortBy]);

  const currentStack = savedStacks.find((item) => item.title === activeStack);
  const currentMetricGroup = metricGroups.find((item) => item.title === activeMetricGroup);
  const currentMetricView =
    (currentMetricGroup ? metricGroupViews[currentMetricGroup.id] : null) ??
    metricGroupViews["route-backed-fundamentals"];
  const topSearchMatch = searchMatches[0] ?? null;
  const hasVisibleRows = visibleRows.length > 0;
  const topRow = visibleRows[0] ?? null;
  const routeReadyCount = visibleRows.filter((row) => row.routeTruthState !== "seeded").length;
  const compareReadyCount = visibleRows.filter((row) => row.compareHref).length;
  const leadingRows = visibleRows.slice(0, 3);
  const activeSectorCount = new Set(visibleRows.map((row) => row.sector)).size;
  const topCompareRow = visibleRows.find((row) => row.compareHref && row.compareLabel) ?? null;
  const truthPostureSummary = getTruthPostureSummary(visibleRows);
  const pendingLaneSummary = getPendingLaneSummary(
    visibleRows,
    searchIntents.filter((intent) => intent.kind === "pending").length,
  );
  const currentMetricGroupId = (currentMetricGroup?.id ?? "route-backed-fundamentals") as ScreenerMetricGroupId;

  function clearDynamicFilters() {
    setSearchTerm("");
    setSectorFilter("All sectors");
    setTruthFilter("All truth states");
    setSortBy("Market cap");
    setCompareOnly(false);
  }

  useEffect(() => {
    const params = new URLSearchParams();

    if (deferredSearchTerm.trim()) {
      params.set("query", deferredSearchTerm.trim());
    }

    if (sectorFilter !== "All sectors") {
      params.set("sector", sectorFilter);
    }

    if (truthFilter !== "All truth states") {
      params.set("truth", truthFilter);
    }

    if (compareOnly) {
      params.set("compare", "1");
    }

    if (activeStack && activeStack !== savedStacks[0]?.title) {
      params.set("stack", activeStack);
    }

    if (currentMetricGroupId !== "route-backed-fundamentals") {
      params.set("metric", currentMetricGroupId);
    }

    if (sortBy !== "Market cap" && screenerSortOptions.includes(sortBy)) {
      params.set("sort", sortBy);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery) {
      return;
    }

    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextHref, { scroll: false });
  }, [
    activeStack,
    compareOnly,
    currentMetricGroupId,
    deferredSearchTerm,
    pathname,
    router,
    savedStacks,
    searchParams,
    sectorFilter,
    sortBy,
    truthFilter,
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">Saved stacks</h2>
            <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
              Click to apply
            </span>
          </div>
          <div className="mt-5 grid gap-4">
            {savedStacks.map((stack) => {
              const active = stack.title === activeStack;

              return (
                <button
                  key={stack.title}
                  type="button"
                  onClick={() => setActiveStack(stack.title)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    active
                      ? "border-aurora/35 bg-aurora/10"
                      : "border-white/8 bg-black/15 hover:border-white/16 hover:bg-white/[0.04]"
                  }`}
                >
                  <p className="text-lg font-semibold text-white">{stack.title}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{stack.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stack.filters.map((filter) => (
                      <div
                        key={filter}
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.14em] ${
                          active
                            ? "border border-aurora/30 bg-aurora/10 text-aurora"
                            : "border border-white/10 bg-white/[0.03] text-mist/74"
                        }`}
                      >
                        {filter}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">Metric groups</h2>
            <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
              Click to focus
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {metricGroups.map((group) => {
              const active = group.title === activeMetricGroup;

              return (
                <button
                  key={group.title}
                  type="button"
                  onClick={() => setActiveMetricGroup(group.title)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    active
                      ? "border-sky/35 bg-sky/10"
                      : "border-white/8 bg-black/15 hover:border-white/16 hover:bg-white/[0.04]"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{group.title}</p>
                  <div className="mt-4 grid gap-2">
                    {group.items.map((item) => (
                      <div
                        key={item}
                        className={`rounded-2xl border px-3 py-2 text-sm ${
                          active
                            ? "border-sky/25 bg-sky/10 text-sky-100"
                            : "border-white/8 bg-white/[0.03] text-mist/76"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Research-ready results</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
              Active stack: <span className="text-white">{currentStack?.title ?? "All ideas"}</span>. Focus metrics:{" "}
              <span className="text-white">{currentMetricGroup?.title ?? "All groups"}</span>.
            </p>
          </div>
          <div className="rounded-full bg-sky/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-sky">
            {visibleRows.length} results in current view
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_repeat(3,minmax(0,0.7fr))]">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-mist/56">Search inside this screen</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Company, sector, or intent like 'banking high roe low debt'"
              className="min-h-[48px] rounded-2xl border border-white/10 bg-black/15 px-4 text-sm text-white outline-none placeholder:text-mist/46"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-mist/56">Sector</span>
            <select
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value)}
              className="min-h-[48px] rounded-2xl border border-white/10 bg-black/15 px-4 text-sm text-white outline-none"
            >
              {sectorOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-950 text-white">
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-mist/56">Truth state</span>
            <select
              value={truthFilter}
              onChange={(event) => setTruthFilter(event.target.value as (typeof truthFilterOptions)[number])}
              className="min-h-[48px] rounded-2xl border border-white/10 bg-black/15 px-4 text-sm text-white outline-none"
            >
              {truthFilterOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-950 text-white">
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-mist/56">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as ScreenerSortOption)}
              className="min-h-[48px] rounded-2xl border border-white/10 bg-black/15 px-4 text-sm text-white outline-none"
            >
              {screenerSortOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-950 text-white">
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setCompareOnly((current) => !current)}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] transition ${
              compareOnly
                ? "border-aurora/35 bg-aurora/10 text-aurora"
                : "border-white/10 bg-black/15 text-mist/74 hover:border-white/18 hover:text-white"
            }`}
          >
            {compareOnly ? "Showing compare-ready only" : "Filter to compare-ready"}
          </button>
          <button
            type="button"
            onClick={clearDynamicFilters}
            className="rounded-full border border-white/10 bg-black/15 px-4 py-2 text-xs uppercase tracking-[0.16em] text-mist/74 transition hover:border-white/18 hover:text-white"
          >
            Clear dynamic filters
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/56">Route-backed now</p>
            <p className="mt-2 text-2xl font-semibold text-white">{routeReadyCount}</p>
            <p className="mt-2 text-sm leading-7 text-mist/74">
              Names already showing delayed or manually managed route context instead of pure seeded fallback.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/56">Compare-ready</p>
            <p className="mt-2 text-2xl font-semibold text-white">{compareReadyCount}</p>
            <p className="mt-2 text-sm leading-7 text-mist/74">
              Stocks in this view that can hand off into a ranked side-by-side route without rebuilding the shortlist.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/56">Stack posture</p>
            <p className="mt-2 text-base font-semibold text-white">{currentStack?.title ?? "All route-backed ideas"}</p>
            <p className="mt-2 text-sm leading-7 text-mist/74">
              Keep the saved-stack logic honest by using only the route-backed tags already visible on stock pages.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/56">Metric-group focus</p>
            <p className="mt-2 text-base font-semibold text-white">{currentMetricGroup?.title ?? "Route-backed fundamentals"}</p>
            <p className="mt-2 text-sm leading-7 text-mist/74">
              {currentMetricView.description}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <div className="rounded-[24px] border border-aurora/18 bg-aurora/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-aurora">Best route to open now</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {topSearchMatch?.row.name ?? topCompareRow?.name ?? topRow?.name ?? "No result in current view"}
            </p>
            <p className="mt-2 text-sm leading-7 text-mist/74">
              {topSearchMatch
                ? `${topSearchMatch.row.name} is first because ${topSearchMatch.reason.toLowerCase()}`
                : topRow
                  ? `${topRow.rationale}. Use the stock route first so the screener hands off into a fuller quote, chart, and research surface.`
                  : "Clear filters or switch stacks to recover a route-backed first click."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link
                href={topSearchMatch?.row.stockHref ?? topRow?.stockHref ?? "/stocks"}
                className="text-white transition hover:text-aurora"
              >
                {topRow ? "Open stock route" : "Browse stocks"}
              </Link>
              {topRow ? (
                <Link href={topRow.chartHref} className="text-mist/76 transition hover:text-white">
                  Open chart
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] border border-sky/20 bg-sky/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-100">Strongest compare handoff</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {topCompareRow?.compareLabel ?? "Compare route pending"}
            </p>
            <p className="mt-2 text-sm leading-7 text-mist/74">
              {topCompareRow?.compareRationale ??
                "The current filtered bench does not yet expose a clean peer route, so stay with the best stock page or widen the shortlist before forcing a compare story."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link
                href={topCompareRow?.compareHref ?? topRow?.stockHref ?? "/compare/stocks/tata-motors/reliance-industries"}
                className="text-white transition hover:text-aurora"
              >
                {topCompareRow ? "Open compare route" : "Open strongest stock route"}
              </Link>
              {topCompareRow ? (
                <Link href={topCompareRow.stockHref} className="text-mist/76 transition hover:text-white">
                  Open underlying stock
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/56">Truth posture of this view</p>
            <p className="mt-3 text-lg font-semibold text-white">{truthPostureSummary.label}</p>
            <p className="mt-2 text-sm leading-7 text-mist/74">{truthPostureSummary.detail}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-mist/52">
              {routeReadyCount} route-backed now • {visibleRows.length - routeReadyCount} seeded fallback
            </p>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/56">Do not over-claim</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {searchIntents.some((intent) => intent.kind === "pending")
                ? "Pending factor demand detected"
                : "Route-backed, not full factor parity"}
            </p>
            <p className="mt-2 text-sm leading-7 text-mist/74">{pendingLaneSummary}</p>
          </div>
        </div>

        {currentStack && currentStack.filters.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {currentStack.filters.map((filter) => (
              <div
                key={filter}
                className="rounded-full border border-aurora/30 bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-aurora"
              >
                {filter}
              </div>
            ))}
          </div>
        ) : null}

        {currentStack && currentStack.filters.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/74">
            This stack intentionally starts without preset filters so the first screener view reflects the full route-backed stock universe before you narrow into sector, truth, and compare filters.
          </div>
        ) : null}

        {currentMetricGroup ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {currentMetricGroup.items.map((item) => (
              <div
                key={item}
                className="rounded-full border border-sky/25 bg-sky/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-sky-100"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}

        {searchTerm || sectorFilter !== "All sectors" || truthFilter !== "All truth states" || compareOnly ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm ? (
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.14em] text-mist/74">
                Search: {searchTerm}
              </div>
            ) : null}
            {searchTerm && topSearchMatch ? (
              <div className="rounded-full border border-sky/30 bg-sky/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-sky-100">
                Top match: {topSearchMatch.row.name}
              </div>
            ) : null}
            {searchIntents.map((intent) => (
              <div
                key={`${intent.kind}-${intent.label}`}
                className="rounded-full border border-sky/25 bg-sky/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-sky-100"
              >
                {intent.kind}: {intent.label}
              </div>
            ))}
            {sectorFilter !== "All sectors" ? (
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.14em] text-mist/74">
                Sector: {sectorFilter}
              </div>
            ) : null}
            {truthFilter !== "All truth states" ? (
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.14em] text-mist/74">
                Truth: {truthFilter}
              </div>
            ) : null}
            {compareOnly ? (
              <div className="rounded-full border border-aurora/30 bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-aurora">
                Compare-ready only
              </div>
            ) : null}
          </div>
        ) : null}

        {searchTerm && topSearchMatch ? (
          <div className="mt-4 rounded-2xl border border-sky/20 bg-sky/10 px-4 py-4 text-sm leading-7 text-sky-50">
            <span className="font-semibold text-white">{topSearchMatch.row.name}</span> is currently first because {topSearchMatch.reason.toLowerCase()}
          </div>
        ) : null}

        {searchIntents.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/56">Detected query intent</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {searchIntents.map((intent) => (
                <div key={`${intent.kind}-${intent.label}-card`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm font-semibold text-white">{intent.label}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-mist/54">{intent.kind}</p>
                  <p className="mt-3 text-sm leading-7 text-mist/72">{intent.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
          {hasVisibleRows ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.04] text-mist/70">
                <tr>
                  {currentMetricView.columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-t border-white/8 text-white">
                    {currentMetricView.columns.map((column) => (
                      <td key={`${row.id}-${column.key}`} className="px-4 py-3 align-top text-mist/80">
                        {column.key === "name" ? (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Link href={row.stockHref} className="text-white transition hover:text-aurora">
                                {row.name}
                              </Link>
                              <p className="text-xs uppercase tracking-[0.16em] text-mist/54">{row.symbol}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {row.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={`${row.id}-${tag}`}
                                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-mist/72"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {column.key === "sector" ? row.sector : null}
                        {column.key === "cmp" ? row.cmp : null}
                        {column.key === "dayMove" ? row.dayMove : null}
                        {column.key === "roe" ? row.roe : null}
                        {column.key === "debtEquity" ? row.debtEquity : null}
                        {column.key === "marketCap" ? row.marketCap : null}
                        {column.key === "routeState" ? row.routeState : null}
                        {column.key === "position52W" ? row.position52W : null}
                        {column.key === "truth" ? (
                          <div className="space-y-2">
                            <p>{row.truthLabel}</p>
                            <p className="max-w-xs text-xs leading-6 text-mist/60">{row.truthDetail}</p>
                          </div>
                        ) : null}
                        {column.key === "compare" ? (
                          row.compareHref && row.compareLabel ? (
                            <div className="space-y-2">
                              <Link href={row.compareHref} className="text-white transition hover:text-aurora">
                                {row.compareLabel}
                              </Link>
                              <p className="text-xs uppercase tracking-[0.12em] text-mist/60">
                                {row.compareHighlight ?? "Compare-ready"}
                              </p>
                              {row.compareRationale ? (
                                <p className="max-w-xs text-xs leading-6 text-mist/60">{row.compareRationale}</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p>Compare route pending</p>
                              <p className="max-w-xs text-xs leading-6 text-mist/60">
                                The current seeded peer bench is still too thin to recommend a clean side-by-side handoff here.
                              </p>
                            </div>
                          )
                        ) : null}
                        {column.key === "pending" ? (
                          <div className="space-y-2">
                            <div className="flex max-w-xs flex-wrap gap-2">
                              {currentMetricGroup?.items.map((item) => (
                                <span
                                  key={`${row.id}-${item}`}
                                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-mist/72"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                            <p className="max-w-xs text-xs leading-6 text-mist/60">{getPendingLaneNote(row)}</p>
                          </div>
                        ) : null}
                        {column.key === "nextStep" ? (
                          <div className="flex flex-col gap-2">
                            <Link href={row.stockHref} className="text-white transition hover:text-aurora">
                              Open stock page
                            </Link>
                            <Link href={row.chartHref} className="transition hover:text-white">
                              Open chart
                            </Link>
                            {row.compareHref && row.compareLabel ? (
                              <Link href={row.compareHref} className="transition hover:text-white">
                                {row.compareLabel}
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-5 text-sm leading-7 text-mist/74">
              No stocks match the current combination of saved stack, search, sector, truth, and compare filters. Clear the dynamic filters or switch to a broader stack.
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {leadingRows.map((row) => (
            <div key={`${row.id}-rationale`} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={row.stockHref} className="text-sm font-semibold text-white transition hover:text-aurora">
                    {row.name}
                  </Link>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-mist/54">{row.symbol}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-mist/70">
                  {row.truthLabel}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-mist/74">{row.rationale}</p>
              <p className="mt-2 text-xs leading-6 text-mist/60">{row.truthDetail}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link href={row.stockHref} className="text-white transition hover:text-aurora">
                  Open stock page
                </Link>
                <Link href={row.chartHref} className="text-mist/76 transition hover:text-white">
                  Open chart
                </Link>
                {row.compareHref && row.compareLabel ? (
                  <Link href={row.compareHref} className="text-mist/76 transition hover:text-white">
                    {row.compareHighlight ? `${row.compareLabel} · ${row.compareHighlight}` : row.compareLabel}
                  </Link>
                ) : null}
              </div>
              {row.compareHref && row.compareRationale ? (
                <p className="mt-3 text-xs leading-6 text-mist/58">{row.compareRationale}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Link
            href={visibleRows[0]?.stockHref ?? "/stocks"}
            className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm text-white transition hover:border-white/16 hover:bg-white/[0.04]"
          >
            Open top result
          </Link>
          <Link
            href={visibleRows[0]?.compareHref ?? "/stocks"}
            className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm text-white transition hover:border-white/16 hover:bg-white/[0.04]"
          >
            {visibleRows[0]?.compareHref ? "Open best compare route" : "Browse stock routes"}
          </Link>
          <Link
            href="/charts"
            className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm text-white transition hover:border-white/16 hover:bg-white/[0.04]"
          >
            Open charts workflow
          </Link>
          <Link
            href="/account/screens"
            className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm text-white transition hover:border-white/16 hover:bg-white/[0.04]"
          >
            Open saved screens
          </Link>
        </div>
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/74">
          Current sector spread: <span className="text-white">{activeSectorCount}</span> sectors remain after the active stack, truth, compare, and search filters.
        </div>
      </div>
    </div>
  );
}
