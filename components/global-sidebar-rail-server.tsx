import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import {
  getSharedSidebarRailData,
  type SharedSidebarPageCategory,
} from "@/lib/shared-sidebar-config";

export async function getGlobalSidebarRail(pageCategory: SharedSidebarPageCategory) {
  const sharedSidebarRailData = await getSharedSidebarRailData({ pageCategory });

  if (!sharedSidebarRailData.enabledOnPageType) {
    return null;
  }

  return (
    <SharedMarketSidebarRail
      visibleBlocks={sharedSidebarRailData.visibleBlocks}
      marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
      topGainers={sharedSidebarRailData.topGainers}
      topLosers={sharedSidebarRailData.topLosers}
      popularStocks={sharedSidebarRailData.popularStocks}
    />
  );
}
