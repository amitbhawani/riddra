import type { Metadata } from "next";

import { MarketIntelligenceHomepage } from "@/components/market-intelligence-homepage";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { getRiddraDailyMarketBrief } from "@/lib/market-news/brief";
import { getTopMarketNewsArticles } from "@/lib/market-news/queries";
import { getCommodityQuotes } from "@/lib/commodity-prices";
import { getIndexSnapshots } from "@/lib/index-content";
import { buildMarketSnapshotGroups } from "@/lib/market-snapshot-system";
import { getMarketOverview } from "@/lib/market-overview";
import { buildSeoMetadata } from "@/lib/seo-config";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    policyKey: "home",
    title: "Riddra | Market Intelligence Platform",
    description: "Riddra gives investors clean market discovery across stocks, indices, market news, and decision workflows.",
    publicHref: "/",
  });
}

export default async function HomePage() {
  const [overview, indexSnapshots, commodityQuotes, sidebar, dailyBrief, topStories] = await Promise.all([
    getMarketOverview(),
    getIndexSnapshots().catch(() => []),
    getCommodityQuotes(),
    getGlobalSidebarRail("home"),
    getRiddraDailyMarketBrief().catch(() => null),
    getTopMarketNewsArticles({ limit: 3 }).catch(() => []),
  ]);
  const marketSnapshotGroups = await buildMarketSnapshotGroups(indexSnapshots, commodityQuotes);

  return (
    <MarketIntelligenceHomepage
      dailyBrief={dailyBrief}
      indexSnapshots={indexSnapshots}
      marketSnapshotGroups={marketSnapshotGroups}
      stats={overview.stats}
      discovery={overview.discovery}
      topStocks={overview.topGainers}
      topLosers={overview.topLosers}
      topFunds={overview.topFundIdeas}
      topIpos={overview.topIpos}
      topMarketNewsStories={topStories}
      sidebar={sidebar}
    />
  );
}
