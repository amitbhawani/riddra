import type { MetadataRoute } from "next";

import { canonicalCompareCoverageRows } from "@/lib/canonical-compare-coverage";
import { canonicalCoverageRows } from "@/lib/canonical-coverage";
import { getFundCategoryHubs, getStockSectorHubs } from "@/lib/hubs";
import {
  getPublishedAdminManagedStockFallbackRecords,
  getRedirectingIpoSlugSet,
} from "@/lib/ipo-lifecycle";
import { getPublishedMarketNewsSitemapEntries } from "@/lib/market-news/queries";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const publicBetaRoutes = [
  "",
  "/get-started",
  "/pricing",
  "/login",
  "/signup",
  "/search",
  "/markets",
  "/indices",
  "/nifty50",
  "/sensex",
  "/banknifty",
  "/finnifty",
  "/stocks",
  "/ipo",
  "/ipo/sme",
  "/mutual-funds",
  "/wealth",
  "/etfs",
  "/pms",
  "/aif",
  "/sif",
  "/sectors",
  "/fund-categories",
  "/methodology",
  "/privacy",
  "/legal/privacy-policy",
  "/legal/tos",
  "/terms",
  "/contact",
  "/help",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();
  const [
    sectorHubs,
    fundCategoryHubs,
    stockSlugs,
    fundSlugs,
    ipoSlugs,
    redirectingIpoSlugs,
    adminStockFallbackRecords,
    etfSlugs,
    pmsSlugs,
    aifSlugs,
    sifSlugs,
    publishedMarketNewsEntries,
  ] = await Promise.all([
    getStockSectorHubs(),
    getFundCategoryHubs(),
    getPublishableCmsSlugSet("stock"),
    getPublishableCmsSlugSet("mutual_fund"),
    getPublishableCmsSlugSet("ipo"),
    getRedirectingIpoSlugSet(),
    getPublishedAdminManagedStockFallbackRecords(),
    getPublishableCmsSlugSet("etf"),
    getPublishableCmsSlugSet("pms"),
    getPublishableCmsSlugSet("aif"),
    getPublishableCmsSlugSet("sif"),
    getPublishedMarketNewsSitemapEntries(),
  ]);
  const mergedStockSlugs = new Set([
    ...stockSlugs,
    ...adminStockFallbackRecords.map((record) => record.slug),
  ]);
  const activeIpoSlugs = new Set(
    [...ipoSlugs].filter((slug) => !redirectingIpoSlugs.has(slug)),
  );
  const publishableSlugSets = {
    stock: mergedStockSlugs,
    mutual_fund: fundSlugs,
    ipo: activeIpoSlugs,
    etf: etfSlugs,
    pms: pmsSlugs,
    aif: aifSlugs,
    sif: sifSlugs,
  } as const;
  const publishableCoverageRows = canonicalCoverageRows.filter((row) =>
    publishableSlugSets[row.family].has(row.slug),
  );
  const publishableStockRows = publishableCoverageRows.filter((row) => row.family === "stock");
  const publishableCompareRows = canonicalCompareCoverageRows.filter((row) => {
    if (row.family === "stock_compare") {
      return mergedStockSlugs.has(row.leftSlug) && mergedStockSlugs.has(row.rightSlug);
    }

    return fundSlugs.has(row.leftSlug) && fundSlugs.has(row.rightSlug);
  });

  return [
    ...publicBetaRoutes.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
    })),
    ...publishableCoverageRows.map((row) => ({
      url: `${siteUrl}${row.route}`,
      lastModified: new Date(),
    })),
    ...publishableStockRows.map((row) => ({
      url: `${siteUrl}${row.route}/chart`,
      lastModified: new Date(),
    })),
    ...publishableCompareRows.map((row) => ({
      url: `${siteUrl}${row.route}`,
      lastModified: new Date(),
    })),
    ...sectorHubs.map((hub) => ({
      url: `${siteUrl}/sectors/${hub.slug}`,
      lastModified: new Date(),
    })),
    ...fundCategoryHubs.map((hub) => ({
      url: `${siteUrl}/fund-categories/${hub.slug}`,
      lastModified: new Date(),
    })),
    ...publishedMarketNewsEntries.map((article) => ({
      url: `${siteUrl}/markets/news/${article.slug}`,
      lastModified: new Date(article.updated_at || article.published_at),
    })),
  ];
}
