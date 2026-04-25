import { getSiteChromeConfig } from "@/lib/site-experience";
import { getCurrentUser } from "@/lib/auth";
import { getUserProductProfile } from "@/lib/user-product-store";
import { SiteHeaderNavClient } from "@/components/site-header-nav-client";

export async function SiteHeader() {
  const siteChrome = getSiteChromeConfig();
  const user = await getCurrentUser();
  const profile = user ? await getUserProductProfile(user) : null;

  return (
    <SiteHeaderNavClient
      brand={siteChrome.brand}
      tickerItems={siteChrome.headerTickerItems}
      marketNav={siteChrome.headerMarketNav}
      utilityNav={siteChrome.headerUtilityNav}
      visibleMenuGroups={siteChrome.visibleMenuGroups}
      accountLabel={profile?.name || profile?.username || profile?.email || null}
      isSignedIn={Boolean(profile)}
    />
  );
}
