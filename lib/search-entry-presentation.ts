import { getFundTruthLabel, getStockTruthLabel } from "@/lib/market-truth";
import type { FundSnapshot, IpoSnapshot, StockSnapshot } from "@/lib/mock-data";
import { wealthProducts } from "@/lib/wealth-products";

type SearchLikeEntry = {
  title: string;
  href: string;
  category: string;
};

export type SearchEntryPresentation = {
  context: string;
  truthLabel?: string;
};

function joinContext(parts: Array<string | null | undefined>) {
  return parts.filter((part) => typeof part === "string" && part.trim().length > 0).join(" • ");
}

function sanitizeContextPart(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();

  if (
    lower === "unclassified" ||
    lower === "unavailable" ||
    lower.includes("awaiting") ||
    lower.includes("pending")
  ) {
    return null;
  }

  return normalized;
}

function getStockSlugFromHref(href: string) {
  const match = href.match(/^\/stocks\/([^/]+)/);
  return match?.[1] ?? null;
}

function getFundSlugFromHref(href: string) {
  const match = href.match(/^\/mutual-funds\/([^/]+)/);
  return match?.[1] ?? null;
}

function getWealthProductByHref(href: string) {
  const match = href.match(/^\/(etfs|pms|aif|sif)\/([^/]+)/);

  if (!match) {
    return null;
  }

  const [, familySegment, slug] = match;
  const family = familySegment === "etfs" ? "etf" : familySegment;

  return wealthProducts.find((item) => item.family === family && item.slug === slug) ?? null;
}

function formatIndexContext(href: string) {
  const lookup: Record<string, string> = {
    "/nifty50": "Benchmark tracker • breadth, mood, and leader context",
    "/sensex": "Benchmark tracker • breadth, mood, and leader context",
    "/banknifty": "Banking index tracker • breadth and sector leadership",
    "/finnifty": "Financial index tracker • breadth and sector leadership",
  };

  return lookup[href] ?? "Index tracker route";
}

export function buildSearchEntryPresentation(
  entry: SearchLikeEntry,
  options: {
    stocks: StockSnapshot[];
    funds: FundSnapshot[];
    ipos: IpoSnapshot[];
  },
): SearchEntryPresentation {
  const stockSlug = getStockSlugFromHref(entry.href);

  if (stockSlug) {
    const stock = options.stocks.find((item) => item.slug === stockSlug);

    if (stock) {
      return {
        context:
          entry.category === "Chart"
            ? joinContext([sanitizeContextPart(stock.symbol), sanitizeContextPart(stock.sector), sanitizeContextPart(stock.price), "Chart"])
            : joinContext([sanitizeContextPart(stock.symbol), sanitizeContextPart(stock.sector), sanitizeContextPart(stock.price), sanitizeContextPart(stock.change)]),
        truthLabel: getStockTruthLabel(stock),
      };
    }
  }

  const fundSlug = getFundSlugFromHref(entry.href);

  if (fundSlug) {
    const fund = options.funds.find((item) => item.slug === fundSlug);

    if (fund) {
      return {
        context: joinContext([
          sanitizeContextPart(fund.category),
          sanitizeContextPart(`NAV ${fund.nav}`),
          sanitizeContextPart(`1Y ${fund.returns1Y}`),
        ]),
        truthLabel: getFundTruthLabel(fund),
      };
    }
  }

  const wealthProduct = getWealthProductByHref(entry.href);

  if (wealthProduct) {
    return {
      context: joinContext([entry.category, wealthProduct.category, wealthProduct.benchmark, wealthProduct.minimumTicket]),
      truthLabel: "Identity ready",
    };
  }

  if (entry.href.startsWith("/compare/stocks/")) {
    const [, , , leftSlug, rightSlug] = entry.href.split("/");
    const left = options.stocks.find((item) => item.slug === leftSlug);
    const right = options.stocks.find((item) => item.slug === rightSlug);

    if (left && right) {
      return {
        context: joinContext([`${left.symbol} vs ${right.symbol}`, left.sector, "Peer comparison"]),
      };
    }
  }

  if (entry.href.startsWith("/compare/mutual-funds/")) {
    const [, , , leftSlug, rightSlug] = entry.href.split("/");
    const left = options.funds.find((item) => item.slug === leftSlug);
    const right = options.funds.find((item) => item.slug === rightSlug);

    if (left && right) {
      return {
        context: joinContext([`${left.name} vs ${right.name}`, left.category, "Fund comparison"]),
      };
    }
  }

  if (entry.href.startsWith("/sectors/")) {
    const sectorName = entry.title.replace(/\s+sector$/i, "");
    const stockCount = options.stocks.filter((item) => item.sector === sectorName).length;

    return {
      context: joinContext([`${stockCount} stock routes`, "Sector research hub"]),
    };
  }

  if (entry.href.startsWith("/fund-categories/")) {
    const categoryName = entry.title.replace(/\s+funds$/i, "");
    const fundCount = options.funds.filter((item) => item.category === categoryName).length;

    return {
      context: joinContext([`${fundCount} fund routes`, "Category shortlist hub"]),
    };
  }

  if (entry.href === "/wealth") {
    return {
      context: joinContext([`${wealthProducts.length} wealth routes`, "ETF, PMS, AIF, and SIF hub"]),
    };
  }

  if (["/etfs", "/pms", "/aif", "/sif"].includes(entry.href)) {
    const familyKey = entry.href === "/etfs" ? "etf" : entry.href.replace(/^\//, "");
    const familyProducts = wealthProducts.filter((item) => item.family === familyKey);

    return {
      context: joinContext([`${familyProducts.length} product routes`, "Wealth family hub"]),
    };
  }

  if (entry.href.startsWith("/ipo/")) {
    const ipoSlug = entry.href.split("/")[2];
    const ipo = options.ipos.find((item) => item.slug === ipoSlug);

    if (ipo) {
      return {
        context: joinContext([ipo.status, ipo.priceBand, `Allotment ${ipo.allotmentDate}`]),
      };
    }
  }

  if (entry.category === "Index") {
    return {
      context: formatIndexContext(entry.href),
    };
  }

  if (entry.category === "Workflow") {
    return {
      context: "Workflow handoff",
    };
  }

  if (entry.category === "Hub") {
    return {
      context: "Discovery hub",
    };
  }

  if (entry.category === "Tool") {
    return {
      context: "Interactive tool",
    };
  }

  if (entry.category === "Learn" || entry.category === "Course") {
    return {
      context: "Learning route",
    };
  }

  return {
    context: `${entry.category}`,
  };
}
