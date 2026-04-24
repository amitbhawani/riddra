import { cache } from "react";

import { getMutualFundNavHistoryLookup, type MutualFundNavHistoryPoint } from "@/lib/mutual-fund-nav-history-store";

export const SCHEME_HISTORY_AVAILABLE = "Scheme history available";
export const AWAITING_EXTENDED_HISTORY = "Awaiting extended history";
export const SCHEME_HISTORY_NOT_CONNECTED = "Scheme history not connected yet";
export const SCHEME_HISTORY_READ_FAILED = "Scheme history read failed";
export const AWAITING_ANNUAL_HISTORY = "Awaiting annual history";

export type FundHistoryTimeframeId = "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";
export type FundHistoryReturnLabel = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";
export type FundHistoryState = "real_history_available" | "awaiting_extended_history" | "source_read_failed" | "not_connected";

export type FundHistoryTimeframeOption = {
  id: FundHistoryTimeframeId;
  label: string;
};

export type FundHistoryReturnMap = Partial<Record<FundHistoryReturnLabel, number | null>>;

export type FundAnnualReturnRow = {
  year: string;
  value: number;
};

export type FundHistoryChartPoint = {
  label: string;
  value: number;
  changeFromStart: number;
};

export type FundPerformanceContext = {
  sourceLabel: string;
  sourceDate: string | null;
  referenceUrl?: string | null;
  latestNav: number | null;
  latestDate: string | null;
  chartState: FundHistoryState;
  chartPoints: FundHistoryChartPoint[];
  availableReturns: FundHistoryReturnMap;
  annualReturns: FundAnnualReturnRow[];
  statusLabel: string;
  annualReturnsEmptyLabel: string | null;
};

const FUND_HISTORY_TIMEFRAMES: FundHistoryTimeframeOption[] = [
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1Y" },
  { id: "3Y", label: "3Y" },
  { id: "5Y", label: "5Y" },
];

const RETURN_WINDOWS: Array<{ label: FundHistoryReturnLabel; years?: number; months?: number }> = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", years: 1 },
  { label: "3Y", years: 3 },
  { label: "5Y", years: 5 },
];

export function getFundHistoryTimeframes() {
  return FUND_HISTORY_TIMEFRAMES;
}

export function normalizeFundHistoryTimeframe(value: string | null | undefined): FundHistoryTimeframeId {
  const normalized = value?.trim().toUpperCase();
  return FUND_HISTORY_TIMEFRAMES.find((timeframe) => timeframe.id === normalized)?.id ?? "1Y";
}

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function shiftHistoryDate(value: string, window: { years?: number; months?: number; days?: number }) {
  const date = toUtcDate(value);
  const shifted = new Date(date);

  if (typeof window.years === "number") {
    shifted.setUTCFullYear(shifted.getUTCFullYear() - window.years);
  }

  if (typeof window.months === "number") {
    shifted.setUTCMonth(shifted.getUTCMonth() - window.months);
  }

  if (typeof window.days === "number") {
    shifted.setUTCDate(shifted.getUTCDate() - window.days);
  }

  return shifted.toISOString().slice(0, 10);
}

function findPointOnOrBefore(points: MutualFundNavHistoryPoint[], targetDate: string) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];

    if (point.date <= targetDate) {
      return point;
    }
  }

  return null;
}

function calculateWindowReturn(points: MutualFundNavHistoryPoint[], window: { years?: number; months?: number; days?: number }) {
  if (points.length < 2) {
    return null;
  }

  const latest = points[points.length - 1];

  if (!latest) {
    return null;
  }

  const baseline = findPointOnOrBefore(points, shiftHistoryDate(latest.date, window));

  if (!baseline || baseline.date === latest.date || baseline.nav <= 0) {
    return null;
  }

  return latest.nav / baseline.nav - 1;
}

function getChartWindow(timeframe: FundHistoryTimeframeId) {
  return timeframe === "1W"
    ? { days: 7 }
    : timeframe === "1M"
      ? { months: 1 }
      : timeframe === "3M"
        ? { months: 3 }
        : timeframe === "6M"
          ? { months: 6 }
          : timeframe === "1Y"
            ? { years: 1 }
            : timeframe === "3Y"
              ? { years: 3 }
              : { years: 5 };
}

function mapChartPoints(points: MutualFundNavHistoryPoint[], baselineNav: number) {
  return points.map((point) => ({
    label: point.date,
    value: Number(point.nav.toFixed(4)),
    changeFromStart: Number((((point.nav / baselineNav) - 1) * 100).toFixed(2)),
  }));
}

function buildChartWindow(points: MutualFundNavHistoryPoint[], timeframe: FundHistoryTimeframeId) {
  if (points.length < 2) {
    return {
      state: "awaiting_extended_history" as FundHistoryState,
      points: [] as FundHistoryChartPoint[],
    };
  }

  const latest = points[points.length - 1];

  if (!latest) {
    return {
      state: "awaiting_extended_history" as FundHistoryState,
      points: [] as FundHistoryChartPoint[],
    };
  }

  const baseline = findPointOnOrBefore(points, shiftHistoryDate(latest.date, getChartWindow(timeframe)));
  const fallbackBaseline = points[0];

  if (!fallbackBaseline || fallbackBaseline.nav <= 0) {
    return {
      state: "awaiting_extended_history" as FundHistoryState,
      points: [] as FundHistoryChartPoint[],
    };
  }

  if (!baseline || baseline.nav <= 0) {
    return {
      state: "awaiting_extended_history" as FundHistoryState,
      points: mapChartPoints(points, fallbackBaseline.nav),
    };
  }

  const visiblePoints = points.filter((point) => point.date >= baseline.date);

  if (visiblePoints.length < 2) {
    return {
      state: "awaiting_extended_history" as FundHistoryState,
      points: mapChartPoints(points, fallbackBaseline.nav),
    };
  }

  return {
    state: "real_history_available" as FundHistoryState,
    points: mapChartPoints(visiblePoints, baseline.nav),
  };
}

function buildAnnualReturnRows(points: MutualFundNavHistoryPoint[]) {
  const byYear = new Map<string, MutualFundNavHistoryPoint[]>();

  for (const point of points) {
    const year = point.date.slice(0, 4);
    const existing = byYear.get(year) ?? [];
    existing.push(point);
    byYear.set(year, existing);
  }

  return Array.from(byYear.entries())
    .map(([year, rows]) => {
      const sortedRows = [...rows].sort((left, right) => left.date.localeCompare(right.date));
      const first = sortedRows[0];
      const last = sortedRows[sortedRows.length - 1];

      if (!first || !last || first.date === last.date || first.nav <= 0) {
        return null;
      }

      return {
        year,
        value: Number((((last.nav / first.nav) - 1) * 100).toFixed(2)),
      };
    })
    .filter((row): row is FundAnnualReturnRow => row !== null)
    .sort((left, right) => left.year.localeCompare(right.year))
    .slice(-7);
}

function mapHistoryStatusToChartState(status: ReturnType<typeof getHistoryStatusLabel>["chartState"]) {
  return status;
}

function getHistoryStatusLabel(status: "available" | "insufficient" | "not_connected" | "read_failed") {
  if (status === "available") {
    return {
      statusLabel: SCHEME_HISTORY_AVAILABLE,
      chartState: "real_history_available" as FundHistoryState,
    };
  }

  if (status === "insufficient") {
    return {
      statusLabel: AWAITING_EXTENDED_HISTORY,
      chartState: "awaiting_extended_history" as FundHistoryState,
    };
  }

  if (status === "not_connected") {
    return {
      statusLabel: SCHEME_HISTORY_NOT_CONNECTED,
      chartState: "not_connected" as FundHistoryState,
    };
  }

  return {
    statusLabel: SCHEME_HISTORY_READ_FAILED,
    chartState: "source_read_failed" as FundHistoryState,
  };
}

export const getFundPerformanceContext = cache(async (fundSlug: string, timeframe: FundHistoryTimeframeId) => {
  const historyLookup = await getMutualFundNavHistoryLookup(fundSlug);
  const baseState = getHistoryStatusLabel(historyLookup.status);

  if (!historyLookup.entry) {
    return {
      sourceLabel: baseState.statusLabel,
      sourceDate: null,
      referenceUrl: null,
      latestNav: null,
      latestDate: null,
      chartState: mapHistoryStatusToChartState(baseState.chartState),
      chartPoints: [],
      availableReturns: {},
      annualReturns: [],
      statusLabel: baseState.statusLabel,
      annualReturnsEmptyLabel: AWAITING_ANNUAL_HISTORY,
    };
  }

  const entry = historyLookup.entry;
  const latestPoint = entry.points[entry.points.length - 1] ?? null;
  const availableReturns = RETURN_WINDOWS.reduce<FundHistoryReturnMap>((accumulator, window) => {
    accumulator[window.label] = calculateWindowReturn(entry.points, window);
    return accumulator;
  }, {});
  const chartWindow = buildChartWindow(entry.points, timeframe);
  const annualReturns = buildAnnualReturnRows(entry.points);
  const effectiveChartState =
    baseState.chartState === "real_history_available"
      ? chartWindow.state
      : baseState.chartState;

  return {
    sourceLabel: entry.sourceLabel,
    sourceDate: entry.sourceDate,
    referenceUrl: entry.referenceUrl ?? null,
    latestNav: latestPoint ? Number(latestPoint.nav.toFixed(4)) : null,
    latestDate: latestPoint?.date ?? null,
    chartState: effectiveChartState,
    chartPoints: chartWindow.points,
    availableReturns,
    annualReturns,
    statusLabel:
      effectiveChartState === "awaiting_extended_history" && historyLookup.status === "available"
        ? AWAITING_EXTENDED_HISTORY
        : baseState.statusLabel,
    annualReturnsEmptyLabel: annualReturns.length > 0 ? null : AWAITING_ANNUAL_HISTORY,
  };
});
