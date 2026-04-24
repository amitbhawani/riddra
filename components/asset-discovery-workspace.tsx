"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product-page-system";
import { rankSearchEntries } from "@/lib/search-ranking";

type DiscoveryMetric = {
  label: string;
  value: string;
};

export type AssetDiscoveryRow = {
  id: string;
  name: string;
  searchTokens: string[];
  category: string;
  categoryLabel: string;
  badge: string;
  badgeTone?: "aurora" | "white";
  summary: string;
  truthLabel: string;
  truthTone: "verified" | "managed" | "seeded";
  truthDetail: string;
  primaryMetric: DiscoveryMetric;
  metrics: DiscoveryMetric[];
  compareLabel?: string;
  compareDetail?: string;
  compareHref?: string;
  compareHighlight?: string;
  primaryHref: string;
  primaryHrefLabel: string;
  secondaryHref?: string;
  secondaryHrefLabel?: string;
  tertiaryHref?: string;
  tertiaryHrefLabel?: string;
  sortMetricValue?: number | null;
  truthScore: number;
};

type SortOption = {
  value: string;
  label: string;
};

const truthOptions = ["All truth states", "Verified routes", "Managed routes", "Seeded routes"] as const;

function matchesTruthFilter(row: AssetDiscoveryRow, truthFilter: string) {
  if (truthFilter === "Verified routes") {
    return row.truthTone === "verified";
  }

  if (truthFilter === "Managed routes") {
    return row.truthTone === "managed";
  }

  if (truthFilter === "Seeded routes") {
    return row.truthTone === "seeded";
  }

  return true;
}

type RankedDiscoveryMatch = {
  row: AssetDiscoveryRow;
  score: number;
  matchedTerms: string[];
};

function rankDiscoveryRows(rows: AssetDiscoveryRow[], query: string): RankedDiscoveryMatch[] {
  if (!query.trim()) {
    return [];
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));

  return rankSearchEntries(
    query,
    rows.map((row) => ({
      id: row.id,
      title: row.name,
      category: row.categoryLabel,
      query: [row.summary, row.truthLabel, row.truthDetail, row.compareLabel, row.compareDetail, ...row.searchTokens].filter(Boolean).join(" "),
    })),
    rows.length,
  )
    .map((item) => {
      const row = rowById.get(item.entry.id);

      if (!row) {
        return null;
      }

      return {
        row,
        score: item.score,
        matchedTerms: item.matchedTerms,
      };
    })
    .filter((item): item is RankedDiscoveryMatch => Boolean(item));
}

function badgeToneClasses(tone: AssetDiscoveryRow["badgeTone"] = "aurora") {
  return tone === "white"
    ? "border border-[rgba(221,215,207,0.96)] bg-white/92 text-[#111827]"
    : "border border-[rgba(27,58,107,0.16)] bg-[rgba(27,58,107,0.06)] text-[#1B3A6B]";
}

function truthToneClasses(tone: AssetDiscoveryRow["truthTone"]) {
  if (tone === "verified") return "border-emerald-600/16 bg-emerald-50 text-emerald-700";
  if (tone === "managed") return "border-amber-500/20 bg-amber-50 text-amber-700";
  return "border-[rgba(221,215,207,0.96)] bg-[rgba(248,246,243,0.9)] text-[rgba(75,85,99,0.9)]";
}

export function AssetDiscoveryWorkspace({
  title,
  description,
  searchPlaceholder,
  categoryLabel,
  rows,
  sortOptions,
  defaultSort,
}: {
  title: string;
  description: string;
  searchPlaceholder: string;
  categoryLabel: string;
  rows: AssetDiscoveryRow[];
  sortOptions: SortOption[];
  defaultSort: string;
}) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((row) => row.categoryLabel))).sort((left, right) => left.localeCompare(right))],
    [rows],
  );
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [truthFilter, setTruthFilter] = useState<(typeof truthOptions)[number]>("All truth states");
  const [compareOnly, setCompareOnly] = useState(false);
  const [sortBy, setSortBy] = useState(defaultSort);

  const { visibleRows, topMatch } = useMemo(() => {
    const filteredRows = rows.filter((row) => {
      if (categoryFilter !== "All" && row.categoryLabel !== categoryFilter) {
        return false;
      }

      if (!matchesTruthFilter(row, truthFilter)) {
        return false;
      }

      if (compareOnly && !row.compareHref) {
        return false;
      }

      return true;
    });

    const rankedSearchRows = rankDiscoveryRows(filteredRows, query);
    const rankedSearchMap = new Map(rankedSearchRows.map((item) => [item.row.id, item]));
    const searchedRows = query.trim() ? rankedSearchRows.map((item) => item.row) : filteredRows;
    const visibleRows = [...searchedRows].sort((left, right) => {
      if (query.trim()) {
        const scoreDelta = (rankedSearchMap.get(right.id)?.score ?? 0) - (rankedSearchMap.get(left.id)?.score ?? 0);
        if (scoreDelta !== 0) return scoreDelta;
      }

      if (sortBy === "metric") {
        return (right.sortMetricValue ?? Number.NEGATIVE_INFINITY) - (left.sortMetricValue ?? Number.NEGATIVE_INFINITY);
      }

      if (sortBy === "truth") {
        return right.truthScore - left.truthScore;
      }

      if (sortBy === "compare") {
        const leftReady = left.compareHref ? 1 : 0;
        const rightReady = right.compareHref ? 1 : 0;
        if (rightReady !== leftReady) return rightReady - leftReady;
      }

      return left.name.localeCompare(right.name);
    });

    return {
      visibleRows,
      topMatch: visibleRows[0] ? rankedSearchMap.get(visibleRows[0].id) ?? null : null,
    };
  }, [categoryFilter, compareOnly, query, rows, sortBy, truthFilter]);

  const compareReadyCount = visibleRows.filter((row) => row.compareHref).length;
  const verifiedCount = visibleRows.filter((row) => row.truthTone === "verified").length;
  const topRow = visibleRows[0] ?? null;

  return (
    <div className="space-y-6">
      <ProductCard tone="primary" className="space-y-5 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#111827]">{title}</h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[rgba(75,85,99,0.86)]">{description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.74)]">Visible routes</p>
              <p className="mt-1 text-[18px] font-semibold text-[#111827]">{visibleRows.length}</p>
            </div>
            <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.74)]">Compare-ready</p>
              <p className="mt-1 text-[18px] font-semibold text-[#111827]">{compareReadyCount}</p>
            </div>
            <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.74)]">Verified truth</p>
              <p className="mt-1 text-[18px] font-semibold text-[#111827]">{verifiedCount}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.85fr_0.85fr_0.9fr]">
          <label className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="mt-2 w-full border-0 bg-transparent text-[13px] text-[#111827] outline-none placeholder:text-[rgba(107,114,128,0.54)]"
            />
          </label>
          <label className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">{categoryLabel}</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="mt-2 w-full border-0 bg-transparent text-[13px] text-[#111827] outline-none"
            >
              {categories.map((category) => (
                <option key={category} value={category} className="bg-white text-[#111827]">
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Truth filter</span>
            <select
              value={truthFilter}
              onChange={(event) => setTruthFilter(event.target.value as (typeof truthOptions)[number])}
              className="mt-2 w-full border-0 bg-transparent text-[13px] text-[#111827] outline-none"
            >
              {truthOptions.map((option) => (
                <option key={option} value={option} className="bg-white text-[#111827]">
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="mt-2 w-full border-0 bg-transparent text-[13px] text-[#111827] outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-white text-[#111827]">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[rgba(75,85,99,0.86)]">
          <button
            type="button"
            onClick={() => setCompareOnly((value) => !value)}
            className={`rounded-full border px-4 py-2 transition ${
              compareOnly
                ? "border-[rgba(27,58,107,0.2)] bg-[rgba(27,58,107,0.06)] text-[#1B3A6B]"
                : "border-[rgba(221,215,207,0.96)] bg-white/92 hover:border-[rgba(27,58,107,0.18)] hover:text-[#111827]"
            }`}
          >
            {compareOnly ? "Showing compare-ready only" : "Filter to compare-ready"}
          </button>
          {(query || categoryFilter !== "All" || truthFilter !== "All truth states" || compareOnly) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryFilter("All");
                setTruthFilter("All truth states");
                setCompareOnly(false);
                setSortBy(defaultSort);
              }}
              className="rounded-full border border-[rgba(221,215,207,0.96)] bg-white/92 px-4 py-2 transition hover:border-[rgba(27,58,107,0.18)] hover:text-[#111827]"
            >
              Clear filters
            </button>
          )}
          {query.trim() && topRow ? (
            <span>
              Best match: <span className="text-[#111827]">{topRow.name}</span>
              {topMatch?.matchedTerms.length ? (
                <span className="text-[rgba(107,114,128,0.72)]"> via {topMatch.matchedTerms.join(", ")}</span>
              ) : null}
            </span>
          ) : null}
        </div>
      </ProductCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {visibleRows.length ? (
          visibleRows.map((row) => (
            <ProductCard key={row.id} tone="primary" className="h-full p-4 transition hover:border-[rgba(27,58,107,0.24)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] text-[rgba(107,114,128,0.74)]">{row.categoryLabel}</p>
                  <Link href={row.primaryHref} className="mt-1 block text-[18px] font-semibold text-[#111827] transition hover:text-[#1B3A6B]">
                    {row.name}
                  </Link>
                </div>
                <div className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${badgeToneClasses(row.badgeTone)}`}>
                  {row.badge}
                </div>
              </div>

              <p className="mt-4 text-[13px] leading-6 text-[rgba(75,85,99,0.86)]">{row.summary}</p>

              <div className="mt-4 rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">{row.primaryMetric.label}</p>
                <p className="mt-1 text-[18px] font-semibold text-[#111827]">{row.primaryMetric.value}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Decision metrics</p>
                  <div className="mt-2 grid gap-2 text-[13px] text-[rgba(75,85,99,0.84)]">
                    {row.metrics.map((metric) => (
                      <p key={metric.label} className="flex items-center justify-between gap-3">
                        <span>{metric.label}</span>
                        <span className="text-right font-medium text-[#111827]">{metric.value}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Truth posture</p>
                    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${truthToneClasses(row.truthTone)}`}>
                      {row.truthLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-[rgba(75,85,99,0.82)]">{row.truthDetail}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.05)] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Best compare route</p>
                  <span className="rounded-full bg-[rgba(27,58,107,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#1B3A6B]">
                    {row.compareHighlight ?? (row.compareHref ? "Compare-ready" : "Route pending")}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium text-[#111827]">{row.compareLabel ?? "Peer handoff still pending"}</p>
                <p className="mt-1 text-[12px] leading-6 text-[rgba(75,85,99,0.82)]">
                  {row.compareDetail ?? "This route still needs a stronger matched peer before the hub should imply a default comparison."}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-[rgba(75,85,99,0.84)]">
                <Link href={row.primaryHref} className="text-[#1B3A6B] transition hover:text-[#264a83]">
                  {row.primaryHrefLabel}
                </Link>
                {row.secondaryHref && row.secondaryHrefLabel ? (
                  <Link href={row.secondaryHref} className="transition hover:text-[#111827]">
                    {row.secondaryHrefLabel}
                  </Link>
                ) : null}
                {row.compareHref && (
                  <Link href={row.compareHref} className="transition hover:text-[#111827]">
                    Open compare
                  </Link>
                )}
                {row.tertiaryHref && row.tertiaryHrefLabel ? (
                  <Link href={row.tertiaryHref} className="transition hover:text-[#111827]">
                    {row.tertiaryHrefLabel}
                  </Link>
                ) : null}
              </div>
            </ProductCard>
          ))
        ) : (
          <ProductCard tone="secondary" className="p-4">
            <p className="text-[16px] font-semibold text-[#111827]">No routes match the current filters.</p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Clear the search, {categoryLabel.toLowerCase()}, truth, or compare-ready controls to broaden the current route-backed discovery set.
            </p>
          </ProductCard>
        )}
      </div>
    </div>
  );
}
