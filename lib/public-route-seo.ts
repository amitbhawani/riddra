import type { Metadata } from "next";

import { getAdminManagedRecord } from "@/lib/admin-operator-store";
import { buildGeneratedSeoDefaults, pickFirstNonEmptySeoValue } from "@/lib/generated-seo";
import { getLaunchConfigStore } from "@/lib/launch-config-store";
import type { AdminFamilyKey } from "@/lib/admin-content-schema";
import { buildSeoMetadata, type SeoRoutePolicyKey } from "@/lib/seo-config";

type SupportedSeoFamily = Extract<AdminFamilyKey, "stocks" | "mutual-funds" | "indices">;

const seoRoutePolicyByFamily: Record<SupportedSeoFamily, SeoRoutePolicyKey> = {
  stocks: "stocks_detail",
  "mutual-funds": "mutual_funds_detail",
  indices: "index_detail",
};

export async function buildManagedRouteMetadata(input: {
  family: SupportedSeoFamily;
  slug: string;
  title: string;
  summary: string;
  symbol: string | null;
  publicHref: string;
  benchmarkMapping: string | null;
  seoContext?: {
    price?: string | null;
    sector?: string | null;
    category?: string | null;
    benchmark?: string | null;
  };
}): Promise<Metadata> {
  const [launchConfig, record] = await Promise.all([
    getLaunchConfigStore(),
    getAdminManagedRecord(input.family, input.slug, null),
  ]);

  const generatedSeo = buildGeneratedSeoDefaults({
    family: input.family,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    symbol: input.symbol,
    publicHref: input.publicHref,
    benchmarkMapping: input.benchmarkMapping,
    launchConfig,
    seoContext: input.seoContext,
  });

  const seoValues =
    record?.status === "published" ? record.sections.seo?.values ?? {} : {};
  const metaTitle =
    pickFirstNonEmptySeoValue(seoValues.metaTitle) || generatedSeo.metaTitle;
  const metaDescription =
    pickFirstNonEmptySeoValue(seoValues.metaDescription) ||
    generatedSeo.metaDescription;
  const canonicalUrl =
    pickFirstNonEmptySeoValue(seoValues.canonicalUrl) ||
    generatedSeo.canonicalUrl;
  const ogImage =
    pickFirstNonEmptySeoValue(seoValues.ogImage) || generatedSeo.ogImage;
  return buildSeoMetadata({
    policyKey: seoRoutePolicyByFamily[input.family],
    title: metaTitle,
    description: metaDescription,
    publicHref: input.publicHref,
    ogImage,
    launchConfig,
    recordSeo: {
      canonicalUrl,
      noIndex: seoValues.noIndex,
      noFollow: seoValues.noFollow,
      sitemapInclude: seoValues.sitemapInclude,
    },
  });
}
