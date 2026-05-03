import { getSiteChromeConfig } from "@/lib/site-experience";
import { SiteHeaderNavClient } from "@/components/site-header-nav-client";

export async function SiteHeader() {
  const siteChrome = getSiteChromeConfig();

  return (
    <SiteHeaderNavClient
      brand={siteChrome.brand}
      tickerItems={siteChrome.headerTickerItems}
      marketNav={siteChrome.headerMarketNav}
      utilityNav={siteChrome.headerUtilityNav}
      visibleMenuGroups={siteChrome.visibleMenuGroups}
      accountLabel={null}
      isSignedIn={false}
    />
  );
}
