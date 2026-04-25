export type ProductTruthState =
  | "verified"
  | "delayed_snapshot"
  | "partial"
  | "read_failed"
  | "unavailable";

export type PublicDataState =
  | "refreshing"
  | "delayed_snapshot"
  | "read_failed"
  | "unavailable"
  | "feature_pending";

export type ProductCardTone = "primary" | "secondary" | "compact" | "warning";

export type ProductMarketSnapshotFamily = "index" | "metal" | "currency";

export const productPageDesignSystem = {
  grid: {
    columns: 12,
    maxWidthPx: 1280,
    desktopSplit: "70/30",
    mobileBreakpointPx: 768,
  },
  spacing: {
    xxsPx: 4,
    xsPx: 8,
    smPx: 12,
    mdPx: 16,
    cardPaddingPx: 20,
    lgPx: 24,
    sectionGapPx: 32,
    xlPx: 40,
  },
  radii: {
    cardPx: 8,
    buttonPx: 6,
  },
  typography: {
    heading: {
      family: "Source Serif 4",
      weight: 600,
    },
    body: {
      family: "DM Sans",
      weight: 400,
    },
    number: {
      family: "JetBrains Mono",
      weight: 500,
    },
    caption: {
      family: "DM Sans",
      weight: 400,
      opacity: 0.8,
    },
  },
  colors: {
    pageBackground: "#FAFAFA",
    surface: "#FFFFFF",
    border: "#E2DED9",
    primaryAccent: "#1B3A6B",
    secondaryAccent: "#D4853B",
    positive: "#1A7F4B",
    negative: "#C0392B",
    neutral: "#6B7280",
    valuation: ["#1A7F4B", "#52B788", "#6B7280", "#E07B54", "#C0392B"],
  },
  chart: {
    line: "#1B3A6B",
    fillFrom: "rgba(27, 58, 107, 0.08)",
    fillTo: "rgba(27, 58, 107, 0)",
    tooltipBackground: "#1B3A6B",
    tooltipForeground: "#FFFFFF",
    tooltipRadiusPx: 8,
    gridLine: "#E2DED9",
  },
  tabs: {
    heightPx: 48,
    labels: [
      "Summary",
      "Performance",
      "Portfolio",
      "Risk",
      "Fees & Docs",
      "Fund Manager",
    ],
  },
  truthStates: {
    verified: {
      label: "Verified",
      color: "#1A7F4B",
      summary: "Verified source-backed market or product data.",
    },
    delayed_snapshot: {
      label: "Delayed Snapshot",
      color: "#D4853B",
      summary: "Retained delayed market snapshot with timestamped source context.",
    },
    partial: {
      label: "Partial coverage",
      color: "#6B7280",
      summary: "Some route coverage is visible, but the current read is not complete.",
    },
    read_failed: {
      label: "Read Failed",
      color: "#C0392B",
      summary: "The source read failed and the page should say so explicitly.",
    },
    unavailable: {
      label: "Data pending",
      color: "#6B7280",
      summary: "The required source data has not been written for this block yet.",
    },
  },
} as const;

const publicDataStateMeta: Record<
  PublicDataState,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  refreshing: {
    label: "Refreshing",
    title: "Refresh in progress",
    description: "The latest retained values are being refreshed. Keep the current view visible while the next read arrives.",
  },
  delayed_snapshot: {
    label: "Delayed Snapshot",
    title: "Delayed snapshot available",
    description: "A retained delayed snapshot is available for this block. It is useful for context, but it is not a live read.",
  },
  read_failed: {
    label: "Read Failed",
    title: "Source read failed",
    description: "The source could not be read for this block, so the page is staying explicit about the failure instead of guessing.",
  },
  unavailable: {
    label: "Data pending",
    title: "Data not available yet",
    description: "This block stays withheld until the source data exists in the retained public layer.",
  },
  feature_pending: {
    label: "Not Available Yet",
    title: "Feature not enabled yet",
    description: "This surface is part of the product direction, but the public feature itself is not enabled yet.",
  },
};

const inrCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const compactNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function parseDesignNumericValue(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.+-]/g, "");
    const parsed = Number(cleaned);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function formatProductCurrency(
  value: number | string | null | undefined,
  fallback = "Data pending",
) {
  const parsed = parseDesignNumericValue(value);

  if (parsed === null) {
    return fallback;
  }

  return inrCurrencyFormatter.format(parsed);
}

export function formatProductNumber(
  value: number | string | null | undefined,
  fallback = "Data pending",
) {
  const parsed = parseDesignNumericValue(value);

  if (parsed === null) {
    return fallback;
  }

  return compactNumberFormatter.format(parsed);
}

export function formatProductPercent(
  value: number | string | null | undefined,
  digits = 2,
  fallback = "Data pending",
) {
  const parsed = parseDesignNumericValue(value);

  if (parsed === null) {
    return fallback;
  }

  return `${parsed >= 0 ? "+" : ""}${parsed.toFixed(digits)}%`;
}

export function formatProductDate(
  value: string | number | Date | null | undefined,
  fallback = "Data pending",
) {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatProductDateTime(
  value: string | number | Date | null | undefined,
  fallback = "Data pending",
) {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getTruthStateMeta(state: ProductTruthState) {
  return productPageDesignSystem.truthStates[state];
}

export function getPublicDataStateMeta(state: PublicDataState) {
  return publicDataStateMeta[state];
}

export function isPositiveDisplay(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    return value.trim().startsWith("+");
  }

  return false;
}

export function isNegativeDisplay(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value < 0;
  }

  if (typeof value === "string") {
    return value.trim().startsWith("-");
  }

  return false;
}

export function getTrendColor(value: string | number | null | undefined) {
  if (isPositiveDisplay(value)) {
    return productPageDesignSystem.colors.positive;
  }

  if (isNegativeDisplay(value)) {
    return productPageDesignSystem.colors.negative;
  }

  return productPageDesignSystem.colors.neutral;
}

export function getMarketSnapshotFamilyLabel(family: ProductMarketSnapshotFamily) {
  if (family === "metal") {
    return "Metals";
  }

  if (family === "currency") {
    return "Currency";
  }

  return "Indices";
}
