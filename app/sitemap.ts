import type { MetadataRoute } from "next";

import { canonicalCompareCoverageRows } from "@/lib/canonical-compare-coverage";
import { canonicalCoverageRows } from "@/lib/canonical-coverage";
import { getFundCategoryHubs, getStockSectorHubs } from "@/lib/hubs";
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
  const [sectorHubs, fundCategoryHubs] = await Promise.all([
    getStockSectorHubs(),
    getFundCategoryHubs(),
  ]);

  return [
    ...publicBetaRoutes.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
    })),
    ...canonicalCoverageRows.map((row) => ({
      url: `${siteUrl}${row.route}`,
      lastModified: new Date(),
    })),
    ...canonicalCoverageRows
      .filter((row) => row.family === "stock")
      .map((row) => ({
        url: `${siteUrl}${row.route}/chart`,
        lastModified: new Date(),
      })),
    ...canonicalCompareCoverageRows.map((row) => ({
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
  ];
}
