import { getLaunchConfigStore } from "@/lib/launch-config-store";
import {
  normalizeSidebarMarketQuoteMode,
  type SidebarMarketQuoteMode,
  type SidebarMarketSnapshotItem,
} from "@/lib/sidebar-market-snapshot";

export const sharedSidebarPageCategoryOptions = [
  {
    label: "Markets",
    value: "markets",
    description: "Use the shared global sidebar on market overview and market board pages.",
  },
  {
    label: "Stocks",
    value: "stocks",
    description: "Use the shared global sidebar on stock detail pages and stock prototypes.",
  },
  {
    label: "Mutual Funds",
    value: "mutual_funds",
    description: "Use the shared global sidebar on mutual-fund routes.",
  },
  {
    label: "Indices",
    value: "indices",
    description: "Use the shared global sidebar on index pages.",
  },
  {
    label: "Search",
    value: "search",
    description: "Use the shared global sidebar on the public search experience.",
  },
  {
    label: "User Profiles",
    value: "user_profiles",
    description: "Use the shared global sidebar on public user profile pages.",
  },
  {
    label: "Account",
    value: "account",
    description: "Use the shared global sidebar on signed-in account dashboard pages.",
  },
  {
    label: "Portfolio",
    value: "portfolio",
    description: "Use the shared global sidebar on portfolio pages.",
  },
  {
    label: "IPO",
    value: "ipo",
    description: "Use the shared global sidebar on IPO pages.",
  },
  {
    label: "ETF",
    value: "etfs",
    description: "Use the shared global sidebar on ETF pages.",
  },
  {
    label: "PMS",
    value: "pms",
    description: "Use the shared global sidebar on PMS pages.",
  },
  {
    label: "AIF",
    value: "aif",
    description: "Use the shared global sidebar on AIF pages.",
  },
  {
    label: "SIF",
    value: "sif",
    description: "Use the shared global sidebar on SIF pages.",
  },
  {
    label: "Courses",
    value: "courses",
    description: "Use the shared global sidebar on course detail routes.",
  },
  {
    label: "Learn",
    value: "learn",
    description: "Use the shared global sidebar on learn and education pages.",
  },
  {
    label: "Webinars",
    value: "webinars",
    description: "Use the shared global sidebar on webinar pages.",
  },
  {
    label: "Newsletter",
    value: "newsletter",
    description: "Use the shared global sidebar on newsletter pages.",
  },
  {
    label: "Research Articles",
    value: "research_articles",
    description: "Use the shared global sidebar on research/article pages.",
  },
  {
    label: "Fallback / 404",
    value: "fallback",
    description: "Use the shared global sidebar on fallback, not-found, and recovery pages.",
  },
  {
    label: "Community",
    value: "community",
    description: "Use the shared global sidebar on community pages.",
  },
  {
    label: "Mentorship",
    value: "mentorship",
    description: "Use the shared global sidebar on mentorship pages.",
  },
] as const;

export type SharedSidebarPageCategory =
  (typeof sharedSidebarPageCategoryOptions)[number]["value"];

const defaultSharedSidebarPageCategories = sharedSidebarPageCategoryOptions.map(
  (option) => option.value,
);

export type SharedSidebarMover = {
  slug?: string;
  href?: string;
  name: string;
  price: string;
  change?: string;
};

export type SharedSidebarPopularStock = {
  href: string;
  label: string;
  price: string;
};

export type SharedSidebarRailData = {
  marketSnapshotMode: SidebarMarketQuoteMode;
  enabledPageCategories: SharedSidebarPageCategory[];
  enabledOnPageType: boolean;
  visibleBlocks: {
    marketSnapshot: boolean;
    topGainers: boolean;
    topLosers: boolean;
    popularStocks: boolean;
  };
  marketSnapshotItems: SidebarMarketSnapshotItem[];
  topGainers: SharedSidebarMover[];
  topLosers: SharedSidebarMover[];
  popularStocks: SharedSidebarPopularStock[];
};

type SharedSidebarRailDataOptions = {
  pageCategory?: SharedSidebarPageCategory | null;
  marketSnapshotItemsFallback?: SidebarMarketSnapshotItem[];
  topGainersFallback?: SharedSidebarMover[];
  topLosersFallback?: SharedSidebarMover[];
  popularStocksFallback?: SharedSidebarPopularStock[];
};

function parseEnabledPageCategories(raw: string): SharedSidebarPageCategory[] {
  const selected = String(raw ?? "")
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter((value): value is SharedSidebarPageCategory =>
      defaultSharedSidebarPageCategories.includes(value as SharedSidebarPageCategory),
    );

  return selected.length ? selected : defaultSharedSidebarPageCategories;
}

function parseLineParts(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()));
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStockHref(value: string | undefined, fallbackName: string) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  const slug = toSlug(normalized) || toSlug(fallbackName);
  return slug ? `/stocks/${slug}` : undefined;
}

function normalizeHref(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.startsWith("/") ? normalized : undefined;
}

function parseSnapshotItems(
  raw: string,
  defaultQuoteMode: SidebarMarketQuoteMode,
  fallback: SidebarMarketSnapshotItem[] = [],
): SidebarMarketSnapshotItem[] {
  const parsed = parseLineParts(raw).reduce<SidebarMarketSnapshotItem[]>((rows, parts) => {
    const [label, value, change, href, quoteKey, quoteMode] = parts;

    if (!label || !value) {
      return rows;
    }

    rows.push({
      label,
      value,
      change: change || "—",
      href: normalizeHref(href),
      quoteKey: quoteKey || label,
      quoteMode: normalizeSidebarMarketQuoteMode(quoteMode || defaultQuoteMode),
    });

    return rows;
  }, []);

  return parsed.length > 0 ? parsed : fallback;
}

function parseSidebarMovers(
  raw: string,
  fallback: SharedSidebarMover[] = [],
): SharedSidebarMover[] {
  const parsed = parseLineParts(raw).reduce<SharedSidebarMover[]>((rows, parts) => {
    const [name, price, routeOrSlug] = parts;

    if (!name || !price) {
      return rows;
    }

    const href = normalizeStockHref(routeOrSlug, name);
    const slug = href?.startsWith("/stocks/") ? href.replace("/stocks/", "") : undefined;

    rows.push({
      name,
      price,
      href,
      slug,
      change: "",
    });

    return rows;
  }, []);

  return parsed.length > 0 ? parsed : fallback;
}

function parsePopularStocks(
  raw: string,
  fallback: SharedSidebarPopularStock[] = [],
): SharedSidebarPopularStock[] {
  const parsed = parseLineParts(raw).reduce<SharedSidebarPopularStock[]>((rows, parts) => {
    const [label, price, routeOrSlug] = parts;

    if (!label || !price) {
      return rows;
    }

    rows.push({
      label,
      price,
      href: normalizeStockHref(routeOrSlug, label) ?? "/stocks",
    });

    return rows;
  }, []);

  return parsed.length > 0 ? parsed : fallback;
}

export async function getSharedSidebarRailData(
  options: SharedSidebarRailDataOptions = {},
): Promise<SharedSidebarRailData> {
  const launchConfig = await getLaunchConfigStore();
  const experience = launchConfig.experience;
  const marketSnapshotMode = normalizeSidebarMarketQuoteMode(
    experience.sharedSidebarMarketDataMode,
  );
  const enabledPageCategories = parseEnabledPageCategories(
    experience.sharedSidebarEnabledPageCategories,
  );
  const selectedBlocks = new Set(
    String(experience.sharedSidebarVisibleBlocks ?? "")
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return {
    marketSnapshotMode,
    enabledPageCategories,
    enabledOnPageType: options.pageCategory
      ? enabledPageCategories.includes(options.pageCategory)
      : true,
    visibleBlocks: {
      marketSnapshot: selectedBlocks.has("market_snapshot"),
      topGainers: selectedBlocks.has("top_gainers"),
      topLosers: selectedBlocks.has("top_losers"),
      popularStocks: selectedBlocks.has("popular_stocks"),
    },
    marketSnapshotItems: parseSnapshotItems(
      [experience.sharedSidebarIndiaRows, experience.sharedSidebarGlobalRows]
        .filter(Boolean)
        .join("\n"),
      marketSnapshotMode,
      options.marketSnapshotItemsFallback,
    ),
    topGainers: parseSidebarMovers(
      experience.sharedSidebarTopGainersRows,
      options.topGainersFallback,
    ),
    topLosers: parseSidebarMovers(
      experience.sharedSidebarTopLosersRows,
      options.topLosersFallback,
    ),
    popularStocks: parsePopularStocks(
      experience.sharedSidebarPopularStocksRows,
      options.popularStocksFallback,
    ),
  };
}
