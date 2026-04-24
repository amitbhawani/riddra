import type { FundSnapshot } from "@/lib/mock-data";

type AllocationRow = {
  name: string;
  weight: string;
};

type HoldingOverlapRow = {
  name: string;
  leftWeight: string;
  rightWeight: string;
  overlapWeight: string;
};

type SectorOverlapRow = {
  name: string;
  leftWeight: string;
  rightWeight: string;
  sharedWeight: string;
};

export type FundPortfolioLens = {
  topHoldingsConcentration: string;
  dominantSector: string;
  dominantSectorWeight: string;
  sectorBreadth: string;
  concentrationLabel: string;
};

export type FundOverlapLens = {
  sharedHoldingsCount: number;
  holdingOverlapWeight: string;
  sharedSectorWeight: string;
  dominantSharedSector: string | null;
  holdingRows: HoldingOverlapRow[];
  sectorRows: SectorOverlapRow[];
  posture: string;
};

export type FundRollingReturnWindow = {
  label: string;
  value: string;
  detail: string;
  tone: "leader" | "steady" | "watch";
};

export type FundRollingReturnLens = {
  bestWindowLabel: string;
  bestWindowValue: string;
  weakestWindowLabel: string;
  weakestWindowValue: string;
  consistencySpread: string;
  consistencyLabel: string;
  summary: string;
  windows: FundRollingReturnWindow[];
};

export function getFundReturnValue(fund: FundSnapshot, targetLabel: string) {
  const exactMatch = fund.returnsTable.find((item) => item.label === targetLabel);

  if (exactMatch) {
    return exactMatch.value;
  }

  const normalizedTarget = normalizeLabel(targetLabel);
  const partialMatch = fund.returnsTable.find((item) => normalizeLabel(item.label).startsWith(normalizedTarget));

  return partialMatch?.value ?? "Pending";
}

export function getFundPortfolioLens(fund: FundSnapshot): FundPortfolioLens {
  const sortedSectors = [...fund.sectorAllocation].sort((left, right) => {
    return (parseWeight(right.weight) ?? 0) - (parseWeight(left.weight) ?? 0);
  });
  const dominantSector = sortedSectors[0];
  const topHoldingsConcentrationValue = fund.holdings.reduce((sum, item) => sum + (parseWeight(item.weight) ?? 0), 0);
  const sectorBreadth = new Set(fund.holdings.map((item) => item.sector)).size;

  return {
    topHoldingsConcentration: formatWeight(topHoldingsConcentrationValue),
    dominantSector: dominantSector?.name ?? "Awaiting allocation mix",
    dominantSectorWeight: dominantSector?.weight ?? "Pending",
    sectorBreadth: `${sectorBreadth} sectors across top holdings`,
    concentrationLabel:
      topHoldingsConcentrationValue >= 35
        ? "Higher conviction tilt"
        : topHoldingsConcentrationValue >= 25
          ? "Balanced conviction"
          : "Broadly spread top book",
  };
}

export function getFundOverlapLens(left: FundSnapshot, right: FundSnapshot): FundOverlapLens {
  const leftHoldings = buildWeightMap(left.holdings);
  const rightHoldings = buildWeightMap(right.holdings);
  const leftSectors = buildWeightMap(left.sectorAllocation);
  const rightSectors = buildWeightMap(right.sectorAllocation);

  const holdingRows = Array.from(new Set([...leftHoldings.keys(), ...rightHoldings.keys()]))
    .map((name) => {
      const leftWeight = leftHoldings.get(name) ?? 0;
      const rightWeight = rightHoldings.get(name) ?? 0;
      const overlapWeight = Math.min(leftWeight, rightWeight);

      return {
        name,
        leftWeight: formatWeight(leftWeight),
        rightWeight: formatWeight(rightWeight),
        overlapWeight: formatWeight(overlapWeight),
        overlapValue: overlapWeight,
      };
    })
    .filter((item) => item.overlapValue > 0)
    .sort((leftItem, rightItem) => rightItem.overlapValue - leftItem.overlapValue)
    .map(({ overlapValue, ...item }) => item);

  const sectorRows = Array.from(new Set([...leftSectors.keys(), ...rightSectors.keys()]))
    .map((name) => {
      const leftWeight = leftSectors.get(name) ?? 0;
      const rightWeight = rightSectors.get(name) ?? 0;
      const sharedWeight = Math.min(leftWeight, rightWeight);

      return {
        name,
        leftWeight: formatWeight(leftWeight),
        rightWeight: formatWeight(rightWeight),
        sharedWeight: formatWeight(sharedWeight),
        sharedValue: sharedWeight,
      };
    })
    .filter((item) => item.sharedValue > 0)
    .sort((leftItem, rightItem) => rightItem.sharedValue - leftItem.sharedValue)
    .map(({ sharedValue, ...item }) => item);

  const holdingOverlapValue = holdingRows.reduce((sum, item) => sum + (parseWeight(item.overlapWeight) ?? 0), 0);
  const sharedSectorValue = sectorRows.reduce((sum, item) => sum + (parseWeight(item.sharedWeight) ?? 0), 0);
  const dominantSharedSector = sectorRows[0]?.name ?? null;

  return {
    sharedHoldingsCount: holdingRows.length,
    holdingOverlapWeight: formatWeight(holdingOverlapValue),
    sharedSectorWeight: formatWeight(sharedSectorValue),
    dominantSharedSector,
    holdingRows,
    sectorRows,
    posture:
      holdingOverlapValue >= 15
        ? "High portfolio overlap"
        : holdingOverlapValue >= 5
          ? "Moderate portfolio overlap"
          : sharedSectorValue >= 35
            ? "Low name overlap but similar sector stance"
            : "Distinct portfolio posture",
  };
}

export function getFundRollingReturnLens(fund: FundSnapshot): FundRollingReturnLens {
  const windows = [
    {
      label: "1Y",
      value: getFundReturnValue(fund, "1Y"),
      detail: "Shows how the current cycle has treated the fund recently.",
    },
    {
      label: "3Y",
      value: getFundReturnValue(fund, "3Y"),
      detail: "Useful for judging whether the recent outcome also holds across a medium-term SIP window.",
    },
    {
      label: "5Y",
      value: getFundReturnValue(fund, "5Y"),
      detail: "Helpful when you want to avoid overreacting to the latest one-year burst or slump.",
    },
  ];
  const numericWindows = windows
    .map((window) => ({
      ...window,
      numericValue: parsePercent(window.value),
    }))
    .filter((window) => window.numericValue !== null);

  if (!numericWindows.length) {
    return {
      bestWindowLabel: "Pending return history",
      bestWindowValue: "Pending",
      weakestWindowLabel: "Pending return history",
      weakestWindowValue: "Pending",
      consistencySpread: "Pending",
      consistencyLabel: "Rolling-return history still needs source depth",
      summary: "The route has point-in-time return values, but the rolling-return read still needs more durable history.",
      windows: windows.map((window) => ({
        ...window,
        tone: "watch",
      })),
    };
  }

  const sortedWindows = [...numericWindows].sort((left, right) => (right.numericValue ?? 0) - (left.numericValue ?? 0));
  const bestWindow = sortedWindows[0]!;
  const weakestWindow = sortedWindows[sortedWindows.length - 1]!;
  const spreadValue = (bestWindow.numericValue ?? 0) - (weakestWindow.numericValue ?? 0);
  const consistencyLabel =
    spreadValue <= 3
      ? "Consistent across visible return windows"
      : spreadValue <= 8
        ? "Healthy medium-term spread"
        : "Recent-performance gap worth validating";

  return {
    bestWindowLabel: bestWindow.label,
    bestWindowValue: bestWindow.value,
    weakestWindowLabel: weakestWindow.label,
    weakestWindowValue: weakestWindow.value,
    consistencySpread: `${spreadValue.toFixed(1)} pts`,
    consistencyLabel,
    summary:
      spreadValue <= 3
        ? `${fund.name} looks relatively even across the visible 1Y, 3Y, and 5Y windows, which makes the current return story easier to trust.`
        : spreadValue <= 8
          ? `${fund.name} still shows a usable long-term track record, but the gap between the strongest and weakest visible windows should stay part of the shortlist conversation.`
          : `${fund.name} has a wider return spread across visible windows, so the latest standout period should be checked against the longer holding experience before it becomes the whole story.`,
    windows: windows.map((window) => {
      const numericValue = parsePercent(window.value);

      return {
        ...window,
        tone:
          numericValue === null
            ? "watch"
            : numericValue === bestWindow.numericValue
              ? "leader"
              : numericValue === weakestWindow.numericValue
                ? "watch"
                : "steady",
      };
    }),
  };
}

function buildWeightMap(rows: AllocationRow[]) {
  return new Map(rows.map((item) => [item.name, parseWeight(item.weight) ?? 0]));
}

function parseWeight(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatWeight(value: number) {
  return `${value.toFixed(1)}%`;
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
