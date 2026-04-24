import { cache } from "react";

import { getFunds, getStocks } from "@/lib/content";

export type StockSectorHub = {
  slug: string;
  name: string;
  description: string;
  itemCount: number;
};

export type FundCategoryHub = {
  slug: string;
  name: string;
  description: string;
  itemCount: number;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const getStockSectorHubs = cache(async (): Promise<StockSectorHub[]> => {
  const stocks = await getStocks();
  const grouped = new Map<string, typeof stocks>();

  for (const stock of stocks) {
    const current = grouped.get(stock.sector) ?? [];
    current.push(stock);
    grouped.set(stock.sector, current);
  }

  return [...grouped.entries()]
    .map(([sector, items]) => ({
      slug: slugify(sector),
      name: sector,
      description: `${sector} stocks hub for grouped research, comparisons, and future screener overlays.`,
      itemCount: items.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const getFundCategoryHubs = cache(async (): Promise<FundCategoryHub[]> => {
  const funds = await getFunds();
  const grouped = new Map<string, typeof funds>();

  for (const fund of funds) {
    const current = grouped.get(fund.category) ?? [];
    current.push(fund);
    grouped.set(fund.category, current);
  }

  return [...grouped.entries()]
    .map(([category, items]) => ({
      slug: slugify(category),
      name: category,
      description: `${category} hub for category-level discovery, comparisons, and investor research flows.`,
      itemCount: items.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const getStocksBySectorSlug = cache(async (slug: string) => {
  const stocks = await getStocks();
  const sectors = await getStockSectorHubs();
  const sector = sectors.find((item) => item.slug === slug);

  if (!sector) {
    return null;
  }

  return {
    hub: sector,
    items: stocks.filter((stock) => slugify(stock.sector) === slug),
  };
});

export const getFundsByCategorySlug = cache(async (slug: string) => {
  const funds = await getFunds();
  const categories = await getFundCategoryHubs();
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    return null;
  }

  return {
    hub: category,
    items: funds.filter((fund) => slugify(fund.category) === slug),
  };
});
