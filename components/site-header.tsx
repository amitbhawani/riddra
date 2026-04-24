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
      marketNav={siteChrome.headerMarketNav}
      utilityNav={siteChrome.headerUtilityNav}
      accountLabel={profile?.name || profile?.username || profile?.email || null}
      isSignedIn={Boolean(profile)}
    />
  );
}
