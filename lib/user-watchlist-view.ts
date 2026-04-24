import { getFund, getStock } from "@/lib/content";
import type { UserWatchlistItem } from "@/lib/user-product-store";

function readStockStatLabel(item: Awaited<ReturnType<typeof getStock>>, label: string) {
  return (
    item?.stats.find(
      (entry) => entry.label.trim().toLowerCase() === label.trim().toLowerCase(),
    )?.value ?? null
  );
}

function splitRangeValue(value: string | null | undefined) {
  if (!value) {
    return { low: null, high: null };
  }

  const normalized = value.trim();
  const parts = normalized
    .split(/\s*[-–—]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      low: parts[0] ?? null,
      high: parts[parts.length - 1] ?? null,
    };
  }

  return {
    low: normalized,
    high: normalized,
  };
}

async function enrichStockItem(item: UserWatchlistItem) {
  try {
    const stock = await getStock(item.stockSlug || item.slug);

    if (!stock) {
      return item;
    }

    const week52Range = splitRangeValue(readStockStatLabel(stock, "52W Range"));

    return {
      ...item,
      livePrice: stock.price,
      dayChange: stock.change,
      week52Low: week52Range.low,
      week52High: week52Range.high,
      sectorLabel: stock.sector,
    };
  } catch {
    return item;
  }
}

async function enrichFundItem(item: UserWatchlistItem) {
  try {
    const fund = await getFund(item.slug);

    if (!fund) {
      return item;
    }

    return {
      ...item,
      nav: fund.nav,
      returns1Y: fund.returns1Y,
      categoryLabel: fund.category,
      benchmarkLabel: fund.benchmark,
    };
  } catch {
    return item;
  }
}

export async function buildWatchlistDisplayItems(items: UserWatchlistItem[]) {
  return Promise.all(
    items.map((item) =>
      item.pageType === "stock" ? enrichStockItem(item) : enrichFundItem(item),
    ),
  );
}
