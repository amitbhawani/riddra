import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import {
  parsePositiveStocksPage,
  STOCKS_PAGE_SIZE,
  StocksIndexPageServer,
} from "@/components/stocks-index-page-server";
import { getPublicStockDiscoveryPage } from "@/lib/content";
import { buildSeoMetadata } from "@/lib/seo-config";

export const revalidate = 300;

type PageProps = {
  params: Promise<{
    page: string;
  }>;
};

export async function generateStaticParams() {
  const firstPage = await getPublicStockDiscoveryPage(1, STOCKS_PAGE_SIZE).catch(() => null);
  const totalPages = firstPage?.totalPages ?? 1;

  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const currentPage = parsePositiveStocksPage(resolvedParams.page);

  if (currentPage <= 1) {
    return buildSeoMetadata({
      policyKey: "stocks_hub",
      title: "Indian Stocks | Riddra",
      description:
        "Browse Indian stocks with quote snapshots, sector context, and direct links into detailed research pages.",
      publicHref: "/stocks",
    });
  }

  return buildSeoMetadata({
    policyKey: "stocks_hub",
    title: `Indian Stocks | Page ${currentPage} | Riddra`,
    description:
      "Browse Indian stocks with quote snapshots, sector context, and direct links into detailed research pages.",
    publicHref: `/stocks/page/${currentPage}`,
  });
}

export default async function StocksPagedIndexPage({ params }: PageProps) {
  const resolvedParams = await params;
  const currentPage = parsePositiveStocksPage(resolvedParams.page);

  if (currentPage <= 1) {
    permanentRedirect("/stocks");
  }

  const stockPage = await getPublicStockDiscoveryPage(currentPage, STOCKS_PAGE_SIZE);

  if (stockPage.total > 0 && currentPage > stockPage.totalPages) {
    notFound();
  }

  return <StocksIndexPageServer currentPage={currentPage} />;
}
