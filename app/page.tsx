import { MarketIntelligenceHomepage } from "@/components/market-intelligence-homepage";
import { getCommodityQuotes } from "@/lib/commodity-prices";
import { getIndexSnapshots } from "@/lib/index-content";
import { buildMarketSnapshotGroups } from "@/lib/market-snapshot-system";
import { getMarketOverview } from "@/lib/market-overview";

export default async function HomePage() {
  const [overview, indexSnapshots, commodityQuotes] = await Promise.all([
    getMarketOverview(),
    getIndexSnapshots(),
    getCommodityQuotes(),
  ]);
  const marketSnapshotGroups = await buildMarketSnapshotGroups(indexSnapshots, commodityQuotes);

  return (
    <MarketIntelligenceHomepage
      indexSnapshots={indexSnapshots}
      marketSnapshotGroups={marketSnapshotGroups}
      stats={overview.stats}
      discovery={overview.discovery}
      topStocks={overview.topGainers}
      topFunds={overview.topFundIdeas}
      topIpos={overview.topIpos}
    />
  );
}
