import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";

import { JsonLd } from "@/components/json-ld";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { getRiddraDailyMarketBrief } from "@/lib/market-news/brief";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

const getCachedDailyBrief = cache(() => getRiddraDailyMarketBrief());

export async function generateMetadata(): Promise<Metadata> {
  const brief = await getCachedDailyBrief();
  const canonicalUrl = `${getPublicSiteUrl()}/markets/brief`;
  const title = brief.headline;
  const description =
    brief.articles.length > 0
      ? `Daily roundup of the top ${brief.articles.length} Riddra market stories from the past 24 hours.`
      : "Daily roundup of the most important Riddra market stories from the past 24 hours.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
    },
  };
}

export default async function MarketBriefPage() {
  const brief = await getCachedDailyBrief();
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Markets", href: "/markets" },
    { label: "Daily Brief", href: "/markets/brief" },
  ];

  return (
    <GlobalSidebarPageShell
      category="markets"
      className="space-y-4"
      leftClassName="riddra-legacy-light-surface space-y-5"
    >
      <JsonLd
        data={buildBreadcrumbSchema(
          breadcrumbs.map((item) => ({
            name: item.label,
            href: item.href,
          })),
        )}
      />
      <JsonLd
        data={buildWebPageSchema({
          title: brief.headline,
          description:
            "Deterministic daily roundup of the top Riddra market stories from the past 24 hours.",
          path: "/markets/brief",
        })}
      />

      <ProductBreadcrumbs items={breadcrumbs} />

      <ProductCard tone="primary" className="space-y-5 p-5 sm:p-6">
        <ProductSectionTitle
          eyebrow="Daily briefing"
          title={brief.headline}
          description={brief.summary}
        />

        {brief.articles.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]">
                Key Highlights:
              </h2>
              <ul className="space-y-3">
                {brief.articles.map((article, index) => (
                  <li key={article.id} className="rounded-[12px] border border-[rgba(226,222,217,0.78)] bg-white/88 px-4 py-3">
                    <Link
                      href={`/markets/news/${article.slug}`}
                      className="text-[15px] font-medium leading-7 text-[#1B3A6B] transition hover:text-[#D4853B]"
                    >
                      {brief.highlights[index] ?? article.rewritten_title ?? article.original_title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-[rgba(221,215,207,0.94)] bg-white/75 px-4 py-5 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
            Today&apos;s market brief is being prepared. Check back after the next market news run to see the latest five-story roundup.
          </div>
        )}
      </ProductCard>
    </GlobalSidebarPageShell>
  );
}
