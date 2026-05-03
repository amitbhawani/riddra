import type { Metadata } from "next";

import { resolveCanonicalUrlForSeo } from "@/lib/generated-seo";
import { getLaunchConfigStore, type LaunchConfigStore } from "@/lib/launch-config-store";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export type SeoRoutePolicyKey =
  | "home"
  | "stocks_hub"
  | "stocks_detail"
  | "stock_chart"
  | "mutual_funds_hub"
  | "mutual_funds_detail"
  | "index_detail"
  | "indices_hub"
  | "markets_hub"
  | "search_hub"
  | "market_news_listing"
  | "market_news_detail"
  | "wealth_hub"
  | "user_profile"
  | "account"
  | "portfolio"
  | "admin"
  | "compare"
  | "api"
  | "draft";

export type SeoChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SeoPolicyRule = {
  indexable: boolean;
  follow: boolean;
  sitemapIncluded: boolean;
  priority: number;
  changefreq: SeoChangeFrequency;
  reason: string;
};

export type SeoPolicyResolution = SeoPolicyRule & {
  canonicalUrl: string;
  robotsDirective: string;
};

export type SeoRecordOverrides = {
  canonicalUrl?: string | null;
  noIndex?: string | boolean | null;
  noFollow?: string | boolean | null;
  sitemapInclude?: string | boolean | null;
};

const defaultSeoPolicyRules: Record<SeoRoutePolicyKey, SeoPolicyRule> = {
  home: {
    indexable: true,
    follow: true,
    sitemapIncluded: true,
    priority: 1,
    changefreq: "daily",
    reason: "Homepage is a core discovery surface and should stay indexable.",
  },
  stocks_hub: {
    indexable: true,
    follow: true,
    sitemapIncluded: false,
    priority: 0.6,
    changefreq: "daily",
    reason: "The stocks hub can be indexed, but sitemap discovery should stay focused on approved stock detail pages.",
  },
  stocks_detail: {
    indexable: true,
    follow: true,
    sitemapIncluded: true,
    priority: 0.9,
    changefreq: "daily",
    reason: "Published stock routes are primary SEO assets and should be indexable.",
  },
  stock_chart: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "Chart-first routes are utility surfaces and should not be indexed as standalone SEO destinations.",
  },
  mutual_funds_hub: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.2,
    changefreq: "weekly",
    reason: "The mutual funds hub is intentionally excluded from indexing for now.",
  },
  mutual_funds_detail: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.2,
    changefreq: "weekly",
    reason: "Mutual fund detail pages are intentionally excluded from indexing for now.",
  },
  index_detail: {
    indexable: true,
    follow: true,
    sitemapIncluded: true,
    priority: 0.8,
    changefreq: "daily",
    reason: "Benchmark and index detail pages are approved for discovery and indexing.",
  },
  indices_hub: {
    indexable: true,
    follow: true,
    sitemapIncluded: false,
    priority: 0.6,
    changefreq: "daily",
    reason: "The indices hub supports benchmark discovery, but sitemap discovery should stay focused on the benchmark detail pages.",
  },
  markets_hub: {
    indexable: true,
    follow: true,
    sitemapIncluded: true,
    priority: 0.8,
    changefreq: "daily",
    reason: "Markets hub is a core public discovery page and should be indexed.",
  },
  search_hub: {
    indexable: true,
    follow: true,
    sitemapIncluded: false,
    priority: 0.5,
    changefreq: "daily",
    reason: "Search can be indexed, but search-result URLs stay out of the sitemap.",
  },
  market_news_listing: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.2,
    changefreq: "daily",
    reason: "The market news listing is intentionally blocked from indexing and sitemap inclusion for now.",
  },
  market_news_detail: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.2,
    changefreq: "never",
    reason: "News detail pages are intentionally excluded from indexing and sitemap inclusion.",
  },
  wealth_hub: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.2,
    changefreq: "weekly",
    reason: "Wealth product routes are intentionally excluded from indexing for now.",
  },
  user_profile: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "User profile pages should never be indexed.",
  },
  account: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "Account pages should never be indexed.",
  },
  portfolio: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "Portfolio routes should never be indexed.",
  },
  admin: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "Admin routes must never be indexed.",
  },
  compare: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "Compare routes are intentionally excluded from indexing.",
  },
  api: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "API routes must never be indexed.",
  },
  draft: {
    indexable: false,
    follow: false,
    sitemapIncluded: false,
    priority: 0.1,
    changefreq: "never",
    reason: "Draft and preview routes must never be indexed.",
  },
};

export const seoRobotsAllowPaths = [
  "/",
  "/stocks/",
  "/nifty50",
  "/markets",
  "/search",
] as const;

export const seoRobotsDisallowPaths = [
  "/admin/",
  "/account/",
  "/portfolio/",
  "/user/",
  "/private-beta",
  "/news/",
  "/markets/news/",
  "/mutual-funds/",
  "/wealth/",
  "/compare/",
  "/api/",
  "/draft",
  "/preview/",
] as const;

function normalizeSeoPublicHref(path: string) {
  const trimmed = String(path).trim();
  if (!trimmed) {
    return "/";
  }

  if (trimmed === "/") {
    return "/";
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function isRobotsBlockedPublicHref(path: string) {
  const normalizedPath = normalizeSeoPublicHref(path);
  return seoRobotsDisallowPaths.some(
    (blockedPath) => normalizeSeoPublicHref(blockedPath) === normalizedPath,
  );
}

function normalizeBooleanFlag(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["yes", "true", "1", "on", "enabled"].includes(normalized)) {
    return true;
  }

  if (["no", "false", "0", "off", "disabled"].includes(normalized)) {
    return false;
  }

  return null;
}

function buildRobotsDirective(indexable: boolean, follow: boolean) {
  return `${indexable ? "index" : "noindex"}, ${follow ? "follow" : "nofollow"}`;
}

function resolveCanonicalHost(launchConfig: LaunchConfigStore) {
  return (
    launchConfig.content.canonicalHost.trim() ||
    launchConfig.basic.siteUrl.trim() ||
    getPublicSiteUrl()
  );
}

function applyGlobalSeoPolicyOverrides(
  policyKey: SeoRoutePolicyKey,
  baseRule: SeoPolicyRule,
  launchConfig: LaunchConfigStore,
) {
  const seo = launchConfig.seo;
  const nextRule = { ...baseRule };

  switch (policyKey) {
    case "home":
      nextRule.indexable = seo.indexHomepage;
      nextRule.sitemapIncluded = seo.includeHomepageInSitemap;
      break;
    case "stocks_hub":
    case "stocks_detail":
      nextRule.indexable = seo.indexStockPages;
      nextRule.sitemapIncluded =
        policyKey === "stocks_detail" ? seo.includeStockPagesInSitemap : false;
      break;
    case "mutual_funds_hub":
    case "mutual_funds_detail":
      nextRule.indexable = seo.indexMutualFundPages;
      nextRule.sitemapIncluded =
        policyKey === "mutual_funds_detail" ? seo.includeMutualFundPagesInSitemap : false;
      break;
    case "wealth_hub":
      nextRule.indexable = seo.indexWealthPages;
      nextRule.sitemapIncluded = seo.includeWealthPagesInSitemap;
      break;
    case "market_news_detail":
      nextRule.indexable = seo.indexNewsDetailPages;
      nextRule.sitemapIncluded = seo.includeNewsDetailPagesInSitemap;
      break;
    case "market_news_listing":
      nextRule.indexable = seo.indexNewsListingPage;
      nextRule.sitemapIncluded = seo.includeNewsListingPageInSitemap;
      break;
    case "markets_hub":
      nextRule.indexable = seo.indexMarketsPages;
      nextRule.sitemapIncluded = seo.includeMarketsPagesInSitemap;
      break;
    case "indices_hub":
      nextRule.indexable = seo.indexIndexPages;
      nextRule.sitemapIncluded = false;
      break;
    case "index_detail":
      nextRule.indexable = seo.indexIndexPages;
      nextRule.sitemapIncluded =
        policyKey === "index_detail" ? seo.includeIndexPagesInSitemap : false;
      break;
    case "search_hub":
      nextRule.indexable = seo.indexSearchPages;
      nextRule.sitemapIncluded = seo.includeSearchPagesInSitemap;
      break;
    default:
      break;
  }

  nextRule.follow = nextRule.indexable ? baseRule.follow : false;
  nextRule.sitemapIncluded = nextRule.indexable ? nextRule.sitemapIncluded : false;
  return nextRule;
}

function applyRecordSeoOverrides(
  rule: SeoPolicyRule,
  recordSeo: SeoRecordOverrides | null | undefined,
) {
  if (!recordSeo) {
    return rule;
  }

  const noIndex = normalizeBooleanFlag(recordSeo.noIndex);
  const noFollow = normalizeBooleanFlag(recordSeo.noFollow);
  const sitemapInclude = normalizeBooleanFlag(recordSeo.sitemapInclude);
  const nextRule = { ...rule };

  if (noIndex === true) {
    nextRule.indexable = false;
    nextRule.follow = false;
    nextRule.sitemapIncluded = false;
    nextRule.reason = `${nextRule.reason} Page-level noindex override is active.`;
  }

  if (noFollow === true) {
    nextRule.follow = false;
    nextRule.reason = `${nextRule.reason} Page-level nofollow override is active.`;
  }

  if (sitemapInclude === false) {
    nextRule.sitemapIncluded = false;
    nextRule.reason = `${nextRule.reason} Page-level sitemap exclusion is active.`;
  }

  return nextRule;
}

export function getBaseSeoRouteRule(policyKey: SeoRoutePolicyKey) {
  return defaultSeoPolicyRules[policyKey];
}

export async function resolveSeoRoutePolicy(input: {
  policyKey: SeoRoutePolicyKey;
  publicHref: string;
  launchConfig?: LaunchConfigStore;
  recordSeo?: SeoRecordOverrides | null;
}) {
  const launchConfig = input.launchConfig ?? (await getLaunchConfigStore());
  const baseRule = applyGlobalSeoPolicyOverrides(
    input.policyKey,
    getBaseSeoRouteRule(input.policyKey),
    launchConfig,
  );
  const recordAdjustedRule = applyRecordSeoOverrides(baseRule, input.recordSeo);
  const effectiveRule = isRobotsBlockedPublicHref(input.publicHref)
    ? {
        ...recordAdjustedRule,
        indexable: false,
        follow: false,
        sitemapIncluded: false,
        reason: `${recordAdjustedRule.reason} This path is blocked in robots.txt.`,
      }
    : recordAdjustedRule;
  const canonicalUrl = resolveCanonicalUrlForSeo(
    input.recordSeo?.canonicalUrl ?? null,
    input.publicHref,
    resolveCanonicalHost(launchConfig),
  );

  return {
    ...effectiveRule,
    canonicalUrl,
    robotsDirective: buildRobotsDirective(effectiveRule.indexable, effectiveRule.follow),
  } satisfies SeoPolicyResolution;
}

export async function buildSeoMetadata(input: {
  policyKey: SeoRoutePolicyKey;
  title: string;
  description: string;
  publicHref: string;
  ogImage?: string | null;
  recordSeo?: SeoRecordOverrides | null;
  openGraphType?: "website" | "article";
  launchConfig?: LaunchConfigStore;
}) {
  const launchConfig = input.launchConfig ?? (await getLaunchConfigStore());
  const policy = await resolveSeoRoutePolicy({
    policyKey: input.policyKey,
    publicHref: input.publicHref,
    launchConfig,
    recordSeo: input.recordSeo,
  });
  const brandName = launchConfig.content.schemaOrganizationName.trim() || "Riddra";
  const ogImage = String(input.ogImage ?? "").trim() || undefined;

  return {
    title: {
      absolute: input.title,
    },
    description: input.description,
    alternates: {
      canonical: policy.canonicalUrl,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: policy.canonicalUrl,
      type: input.openGraphType ?? "website",
      siteName: brandName,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: policy.indexable,
      follow: policy.follow,
    },
  } satisfies Metadata;
}
