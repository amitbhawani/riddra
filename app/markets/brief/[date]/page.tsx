import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import {
  ProductBreadcrumbs,
  ProductCard,
} from "@/components/product-page-system";
import {
  getRiddraDailyBriefStorySummary,
  getRiddraDailyMarketBriefByDate,
  getRiddraDailyMarketBriefHistory,
} from "@/lib/market-news/brief";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

type PageProps = {
  params: Promise<{ date: string }>;
};

function getStoryNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const brief = await getRiddraDailyMarketBriefByDate(date).catch(() => null);

  if (!brief) {
    return {
      title: "Market Brief not found",
      description: "The requested Riddra Market Brief could not be found.",
    };
  }

  const canonicalUrl = `${getPublicSiteUrl()}${brief.href}`;

  return {
    title: brief.headline,
    description: brief.summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: brief.headline,
      description: brief.summary,
      url: canonicalUrl,
      type: "article",
    },
  };
}

export default async function MarketBriefArchiveDetailPage({ params }: PageProps) {
  const { date } = await params;
  const [brief, history] = await Promise.all([
    getRiddraDailyMarketBriefByDate(date).catch(() => null),
    getRiddraDailyMarketBriefHistory(7).catch(() => []),
  ]);

  if (!brief) {
    notFound();
  }

  const currentIndex = history.findIndex((entry) => entry.dateKey === brief.dateKey);
  const newerBrief = currentIndex > 0 ? history[currentIndex - 1] ?? null : null;
  const olderBrief =
    currentIndex >= 0 && currentIndex < history.length - 1 ? history[currentIndex + 1] ?? null : null;
  const archivedBriefs = history.filter((entry) => entry.dateKey !== brief.dateKey).slice(0, 4);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Markets", href: "/markets" },
    { label: "Market brief", href: "/markets/brief" },
    { label: brief.dateLabel, href: brief.href },
  ];

  return (
    <GlobalSidebarPageShell
      category="markets"
      className="space-y-4"
      leftClassName="riddra-legacy-light-surface"
    >
      <div className="w-full space-y-6">
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
            description: brief.summary,
            path: brief.href,
          })}
        />

        <ProductBreadcrumbs items={breadcrumbs} />

        <ProductCard tone="primary" className="space-y-6 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
              Market brief
            </p>
            <h1 className="riddra-product-body text-[32px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[38px]">
              {brief.headline}
            </h1>
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.86)]">
              by Riddra Markets Desk · {brief.dateLabel}
            </p>
          </div>

          {brief.articles.length ? (
            <>
              <div className="space-y-2">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]">
                  Key highlights
                </h2>
                <ul className="space-y-3">
                  {brief.articles.map((article, index) => (
                    <li
                      key={article.id}
                      className="rounded-[12px] border border-[rgba(226,222,217,0.78)] bg-white/88 px-4 py-3"
                    >
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

              <div className="space-y-5">
                {brief.articles.map((article, index) => (
                  <div
                    key={article.id}
                    className="border-b border-[rgba(226,222,217,0.82)] pb-5 last:border-b-0 last:pb-0"
                  >
                    <div className="grid gap-3 sm:grid-cols-[40px_minmax(0,1fr)]">
                      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]">
                        {getStoryNumber(index)}
                      </span>
                      <div className="space-y-2.5">
                        <Link
                          href={`/markets/news/${article.slug}`}
                          className="block text-[18px] font-semibold leading-[1.36] text-[#1B3A6B] transition hover:text-[#D4853B]"
                        >
                          {article.rewritten_title || article.original_title}
                        </Link>
                        <p className="text-[14px] leading-7 text-[rgba(75,85,99,0.86)]">
                          {getRiddraDailyBriefStorySummary(article)}
                        </p>
                        <Link
                          href={`/markets/news/${article.slug}`}
                          className="inline-flex text-[13px] font-semibold text-[#1B3A6B] transition hover:text-[#D4853B]"
                        >
                          Read article →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[rgba(221,215,207,0.94)] bg-white/75 px-4 py-5 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              This archived market brief is being prepared.
            </div>
          )}
        </ProductCard>

        <div className="flex items-center justify-between gap-3 border-y border-[rgba(226,222,217,0.82)] py-3 text-[13px]">
          {olderBrief ? (
            <Link href={olderBrief.href} className="font-medium text-[#1B3A6B] transition hover:text-[#D4853B]">
              ← Previous brief
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[rgba(75,85,99,0.84)]">{brief.dateLabel}</span>
          {newerBrief ? (
            <Link href={newerBrief.href} className="font-medium text-[#1B3A6B] transition hover:text-[#D4853B]">
              Next brief →
            </Link>
          ) : (
            <span className="text-[rgba(156,163,175,0.92)]">Next brief →</span>
          )}
        </div>

        {archivedBriefs.length ? (
          <section className="space-y-4">
            <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.06em] text-[rgba(107,114,128,0.78)]">
              Previous briefs
            </p>
            <div className="space-y-4">
              {archivedBriefs.map((archivedBrief) => (
                <ProductCard key={archivedBrief.dateKey} tone="secondary" className="space-y-4 p-5">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">
                      {archivedBrief.dateLabel}
                    </p>
                    <Link
                      href={archivedBrief.href}
                      className="block text-[22px] font-semibold tracking-[-0.02em] text-[#1B3A6B] transition hover:text-[#D4853B]"
                    >
                      {archivedBrief.headline}
                    </Link>
                  </div>

                  <ul className="grid gap-2">
                    {archivedBrief.highlights.slice(0, 3).map((highlight, index) => (
                      <li
                        key={`${archivedBrief.dateKey}-${index}-${highlight}`}
                        className="rounded-[12px] border border-[rgba(226,222,217,0.78)] bg-[rgba(248,246,243,0.88)] px-4 py-3 text-[14px] leading-7 text-[rgba(55,65,81,0.9)]"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <div>
                    <Link
                      href={archivedBrief.href}
                      className="inline-flex text-[13px] font-semibold text-[#1B3A6B] transition hover:text-[#D4853B]"
                    >
                      Read full brief →
                    </Link>
                  </div>
                </ProductCard>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </GlobalSidebarPageShell>
  );
}
