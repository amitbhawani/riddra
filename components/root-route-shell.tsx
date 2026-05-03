"use client";

import { usePathname } from "next/navigation";

import { SiteFooterClient } from "@/components/site-footer-client";
import { SiteHeaderNavClient } from "@/components/site-header-nav-client";
import { SystemHeadScripts } from "@/components/system-head-scripts";
import type { ManagedNavLink, ManagedTickerItem, HeaderMenuGroupKey } from "@/lib/site-experience";

type RootRouteShellProps = {
  children: React.ReactNode;
  publicHeadCode: string;
  launchLabel: string;
  siteChrome: {
    brand: {
      mark: string;
      logoUrl: string;
      logoWidthPx: number;
      label: string;
      href: string;
    };
    visibleMenuGroups: HeaderMenuGroupKey[];
    headerTickerItems: ManagedTickerItem[];
    headerMarketNav: ManagedNavLink[];
    headerUtilityNav: ManagedNavLink[];
    footerSummary: string;
    footerLinks: ManagedNavLink[];
  };
};

function isAdminSurfacePath(pathname: string | null) {
  return pathname === "/admin" || pathname?.startsWith("/admin/") || false;
}

export function RootRouteShell({
  children,
  publicHeadCode,
  launchLabel,
  siteChrome,
}: RootRouteShellProps) {
  const pathname = usePathname();
  const isAdminRoute = isAdminSurfacePath(pathname);

  if (isAdminRoute) {
    return <div className="min-h-screen bg-[#f3f4f6] text-[#111827]">{children}</div>;
  }

  return (
    <div className="public-site-shell relative min-h-screen overflow-hidden bg-ink text-white [--site-top-row-height:56px] [--site-ticker-row-height:24px] [--site-header-offset:calc(var(--site-top-row-height)+var(--site-ticker-row-height))]">
      {publicHeadCode ? <SystemHeadScripts code={publicHeadCode} /> : null}
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:42px_42px] opacity-[0.08]" />
      <SiteHeaderNavClient
        brand={siteChrome.brand}
        tickerItems={siteChrome.headerTickerItems}
        marketNav={siteChrome.headerMarketNav}
        utilityNav={siteChrome.headerUtilityNav}
        visibleMenuGroups={siteChrome.visibleMenuGroups}
        accountLabel={null}
        isSignedIn={false}
      />
      <main className="public-site-main relative pt-[var(--site-header-offset)]">{children}</main>
      <SiteFooterClient
        launchLabel={launchLabel}
        footerSummary={siteChrome.footerSummary}
        footerLinks={siteChrome.footerLinks}
      />
    </div>
  );
}
