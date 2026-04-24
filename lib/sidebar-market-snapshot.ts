export type SidebarMarketSnapshotItem = {
  label: string;
  value: string;
  change: string;
  href?: string;
  quoteKey?: string;
  quoteMode?: SidebarMarketQuoteMode;
};

export const sidebarMarketQuoteModes = [
  "manual_snapshot",
  "last_close_when_available",
  "live_when_available",
] as const;

export type SidebarMarketQuoteMode = (typeof sidebarMarketQuoteModes)[number];

export type SidebarMarketSnapshotSection = {
  title: string;
  rows: SidebarMarketSnapshotItem[];
};

type SnapshotSectionConfig = {
  title: string;
  labels: string[];
};

const sectionOrder: SnapshotSectionConfig[] = [
  {
    title: "Stock Market India",
    labels: ["Nifty 50", "Nifty Bank", "Sensex", "Gift Nifty", "Gold", "Silver"],
  },
  {
    title: "Global Markets",
    labels: ["Dow Jones", "USD / INR", "Brent Oil", "Hang Seng", "Bitcoin", "Ethereum"],
  },
];

const staticFallbackRows: Record<string, SidebarMarketSnapshotItem> = {
  "gift nifty": { label: "Gift Nifty", value: "22,541.10", change: "+0.36%", href: "/markets" },
  "dow jones": { label: "Dow Jones", value: "38,944.20", change: "+0.31%", href: "/markets" },
  "brent oil": { label: "Brent Oil", value: "$87.42", change: "-0.22%", href: "/markets" },
  "hang seng": { label: "Hang Seng", value: "16,489.10", change: "+0.58%", href: "/markets" },
  "bitcoin": { label: "Bitcoin", value: "$77,533.95", change: "—", href: "/markets" },
  "ethereum": { label: "Ethereum", value: "$2,323.19", change: "—", href: "/markets" },
};

const aliasLookup: Record<string, string> = {
  "nifty 50": "nifty 50",
  "nifty50": "nifty 50",
  "bank nifty": "nifty bank",
  "nifty bank": "nifty bank",
  "banknifty": "nifty bank",
  "sensex": "sensex",
  "gift nifty": "gift nifty",
  "giftnifty": "gift nifty",
  "gold": "gold",
  "silver": "silver",
  "dow jones": "dow jones",
  "dji": "dow jones",
  "dj30.f": "dow jones",
  "usd / inr": "usd / inr",
  "usd/inr": "usd / inr",
  "brent oil": "brent oil",
  "brent": "brent oil",
  "hang seng": "hang seng",
  "bitcoin": "bitcoin",
  "btc": "bitcoin",
  "ethereum": "ethereum",
  "eth": "ethereum",
};

export function normalizeSidebarMarketQuoteMode(
  value: string | null | undefined,
): SidebarMarketQuoteMode {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "live_when_available") {
    return "live_when_available";
  }

  if (normalized === "last_close_when_available") {
    return "last_close_when_available";
  }

  return "manual_snapshot";
}

function normalizeSnapshotLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toCanonicalSnapshotKey(value: string) {
  const normalized = normalizeSnapshotLabel(value);
  return aliasLookup[normalized] ?? normalized;
}

function withSnapshotMeta(
  item: SidebarMarketSnapshotItem,
  fallbackLabel: string,
): SidebarMarketSnapshotItem {
  return {
    ...item,
    quoteKey: item.quoteKey?.trim() || toCanonicalSnapshotKey(fallbackLabel),
    quoteMode: normalizeSidebarMarketQuoteMode(item.quoteMode),
  };
}

export function buildSidebarMarketSnapshotSections(
  items: SidebarMarketSnapshotItem[],
): SidebarMarketSnapshotSection[] {
  const lookup = new Map<string, SidebarMarketSnapshotItem>();

  for (const item of items) {
    lookup.set(toCanonicalSnapshotKey(item.label), item);
  }

  return sectionOrder.map((section) => ({
    title: section.title,
    rows: section.labels.map((label) => {
      const key = toCanonicalSnapshotKey(label);
      return withSnapshotMeta(
        lookup.get(key) ?? staticFallbackRows[key] ?? { label, value: "—", change: "—" },
        label,
      );
    }),
  }));
}
