const STOCK_ROUTE_BUILD_WARM_SLUGS = [
  "reliance-industries",
  "tcs",
  "infosys",
  "hdfc-bank",
  "icici-bank",
  "20-microns-limited",
  "alankit-limited",
  "axita-cotton-limited",
  "capillary-techno-india-l",
  "dev-information-technology-limited",
  "force-motors-limited",
  "hardwyn-india-limited",
] as const;

export function getStockRouteBuildWarmSlugs(): string[] {
  return Array.from(new Set(STOCK_ROUTE_BUILD_WARM_SLUGS)).sort((left, right) =>
    left.localeCompare(right),
  );
}
