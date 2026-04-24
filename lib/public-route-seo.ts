import type { Metadata } from "next";

import { getAdminManagedRecord } from "@/lib/admin-operator-store";
import { buildGeneratedSeoDefaults, pickFirstNonEmptySeoValue } from "@/lib/generated-seo";
import { getLaunchConfigStore } from "@/lib/launch-config-store";
import type { AdminFamilyKey } from "@/lib/admin-content-schema";

type SupportedSeoFamily = Extract<AdminFamilyKey, "stocks" | "mutual-funds" | "indices">;

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
  const noIndex = pickFirstNonEmptySeoValue(seoValues.noIndex) === "yes";

  return {
    title: {
      absolute: metaTitle,
    },
    description: metaDescription,
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl || input.publicHref,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}
