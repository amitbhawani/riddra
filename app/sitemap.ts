import type { MetadataRoute } from "next";

import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { getPublicStockDiscoverySlugs } from "@/lib/content";
import { getPublishedAdminManagedStockFallbackRecords } from "@/lib/ipo-lifecycle";
import { getLaunchConfigStore } from "@/lib/launch-config-store";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { resolveSeoRoutePolicy } from "@/lib/seo-config";

export const revalidate = 300;

const indexRoutes = [
  "/indices",
  "/nifty50",
  "/sensex",
  "/banknifty",
  "/finnifty",
] as const;

const CANONICAL_STOCK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function buildSitemapEntry(
  siteUrl: string,
  path: string,
  lastModified: string | Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(lastModified),
    priority,
    changeFrequency,
  };
}

function sanitizeCanonicalStockSlug(value: string | null | undefined) {
  const slug = String(value ?? "").trim().toLowerCase();
  return CANONICAL_STOCK_SLUG_PATTERN.test(slug) ? slug : null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();
  const [launchConfig, adminStore, stockSlugs, adminStockFallbackRecords] = await Promise.all([
    getLaunchConfigStore(),
    getAdminOperatorStore(),
    getPublicStockDiscoverySlugs(),
    getPublishedAdminManagedStockFallbackRecords(),
  ]);
  const publishedStockRecords = adminStore.records.filter(
    (record) => record.family === "stocks" && record.status === "published",
  );
  const publishedStockRecordBySlug = new Map(
    publishedStockRecords
      .map((record) => {
        const slug = sanitizeCanonicalStockSlug(record.slug);
        return slug ? [slug, record] : null;
      })
      .filter((entry): entry is [string, (typeof publishedStockRecords)[number]] => Boolean(entry)),
  );
  const canonicalStockSlugSet = new Set(
    stockSlugs
      .map((slug) => sanitizeCanonicalStockSlug(slug))
      .filter((slug): slug is string => Boolean(slug)),
  );
  const mergedStockSlugs = new Set([
    ...canonicalStockSlugSet,
    ...adminStockFallbackRecords
      .map((record) => sanitizeCanonicalStockSlug(record.slug))
      .filter((slug): slug is string => Boolean(slug)),
  ]);

  const [
    homePolicy,
    marketsPolicy,
    newsListingPolicy,
  ] = await Promise.all([
    resolveSeoRoutePolicy({ policyKey: "home", publicHref: "/", launchConfig }),
    resolveSeoRoutePolicy({ policyKey: "markets_hub", publicHref: "/markets", launchConfig }),
    resolveSeoRoutePolicy({
      policyKey: "market_news_listing",
      publicHref: "/markets/news",
      launchConfig,
    }),
  ]);

  const sitemapEntries: MetadataRoute.Sitemap = [];

  if (homePolicy.sitemapIncluded) {
    sitemapEntries.push(
      buildSitemapEntry(siteUrl, "/", new Date(), homePolicy.priority, homePolicy.changefreq),
    );
  }

  if (marketsPolicy.sitemapIncluded) {
    sitemapEntries.push(
      buildSitemapEntry(
        siteUrl,
        "/markets",
        new Date(),
        marketsPolicy.priority,
        marketsPolicy.changefreq,
      ),
    );
  }

  if (newsListingPolicy.sitemapIncluded) {
    sitemapEntries.push(
      buildSitemapEntry(
        siteUrl,
        "/markets/news",
        new Date(),
        newsListingPolicy.priority,
        newsListingPolicy.changefreq,
      ),
    );
  }

  const indexPolicies = await Promise.all(
    indexRoutes
      .filter((route) => route !== "/indices")
      .map(async (route) => ({
        route,
        policy: await resolveSeoRoutePolicy({
          policyKey: "index_detail",
          publicHref: route,
          launchConfig,
        }),
      })),
  );

  for (const item of indexPolicies) {
    if (!item.policy.sitemapIncluded) {
      continue;
    }

    sitemapEntries.push(
      buildSitemapEntry(
        siteUrl,
        item.route,
        new Date(),
        item.policy.priority,
        item.policy.changefreq,
      ),
    );
  }

  const stockPolicies = await Promise.all(
    Array.from(mergedStockSlugs)
      .sort()
      .map(async (slug) => {
        const record = publishedStockRecordBySlug.get(slug) ?? null;
        const isCanonicalStockSlug = canonicalStockSlugSet.has(slug);
        const policy = await resolveSeoRoutePolicy({
          policyKey: "stocks_detail",
          publicHref: `/stocks/${slug}`,
          launchConfig,
          // Canonical stocks should stay authoritative from stocks_master.
          // Admin record SEO overrides are only allowed to suppress fallback-only
          // records that exist outside the canonical stock catalog.
          recordSeo: isCanonicalStockSlug
            ? null
            : {
                canonicalUrl: record?.sections.seo?.values.canonicalUrl ?? record?.canonicalRoute,
                noIndex: record?.sections.seo?.values.noIndex,
                noFollow: record?.sections.seo?.values.noFollow,
                sitemapInclude: record?.sections.seo?.values.sitemapInclude,
              },
        });

        return {
          slug,
          policy,
          lastModified: record?.updatedAt ?? new Date().toISOString(),
        };
      }),
  );

  for (const item of stockPolicies) {
    if (!item.policy.sitemapIncluded) {
      continue;
    }

    sitemapEntries.push(
      buildSitemapEntry(
        siteUrl,
        `/stocks/${item.slug}`,
        item.lastModified,
        item.policy.priority,
        item.policy.changefreq,
      ),
    );
  }

  return sitemapEntries;
}
