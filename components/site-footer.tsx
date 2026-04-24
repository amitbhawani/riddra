import { getLaunchState } from "@/lib/launch-state";
import { getSiteChromeConfig } from "@/lib/site-experience";
import { SiteFooterClient } from "@/components/site-footer-client";

export async function SiteFooter() {
  const launchState = getLaunchState();
  const siteChrome = getSiteChromeConfig();

  return (
    <SiteFooterClient
      launchLabel={launchState.label}
      footerSummary={siteChrome.footerSummary}
      footerLinks={siteChrome.footerLinks}
    />
  );
}
