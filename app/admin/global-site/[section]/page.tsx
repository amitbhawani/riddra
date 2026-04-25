import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminGuidanceCard, AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminGlobalSiteEditorClient } from "@/components/admin/admin-global-site-editor-client";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { adminGlobalSiteSections } from "@/lib/admin-navigation";
import { getAdminGlobalRevisions, getAdminOperatorStore } from "@/lib/admin-operator-store";
import { getLaunchConfigStore } from "@/lib/launch-config-store";
import { sharedSidebarPageCategoryOptions } from "@/lib/shared-sidebar-config";

type Params = Promise<{ section: string }>;

const headerFields = [
  {
    key: "headerAnnouncement",
    label: "Header announcement",
    type: "textarea" as const,
    rows: 3,
    helper: "Short announcement or notice line shown above the public navigation when needed.",
  },
  {
    key: "headerBrandMark",
    label: "Logo mark",
    type: "text" as const,
    helper: "Short text used inside the square brand mark, such as R.",
  },
  {
    key: "headerLogoUrl",
    label: "Logo image",
    type: "image" as const,
    helper:
      "Upload a logo image or paste an existing logo URL. When this is set, it is shown before the site name instead of the square letter mark.",
  },
  {
    key: "headerLogoWidthPx",
    label: "Logo width (px)",
    type: "number" as const,
    helper: "Pixel width used for the logo image in the public header. Height scales automatically.",
  },
  {
    key: "headerBrandLabel",
    label: "Brand label",
    type: "text" as const,
    helper: "Main brand name shown beside the logo mark in the top menu.",
  },
  {
    key: "headerBrandHref",
    label: "Brand link",
    type: "text" as const,
    helper: "Route opened when someone clicks the logo or brand label.",
  },
  {
    key: "headerVisibleMenuGroups",
    label: "Top menu groups",
    type: "checkbox_group" as const,
    helper: "Choose which top-level groups are shown in the main desktop and mobile header navigation.",
    options: [
      {
        label: "Markets",
        value: "markets",
        description: "Show the markets group and its dropdown links.",
      },
      {
        label: "Stocks",
        value: "stocks",
        description: "Show the stocks group and its dropdown links.",
      },
      {
        label: "Funds",
        value: "funds",
        description: "Show the funds group and its dropdown links.",
      },
      {
        label: "Tools",
        value: "tools",
        description: "Show the tools group and its dropdown links.",
      },
      {
        label: "Learn",
        value: "learn",
        description: "Show the learn group and its dropdown links.",
      },
    ],
  },
  {
    key: "headerTickerRows",
    label: "Header ticker rows",
    type: "textarea" as const,
    rows: 10,
    helper:
      "One row per line using Label|Value|Change|/route. These rows currently act as the manual snapshot for the scrolling ticker beneath the main header and are ready to be replaced by backend-fed live or last-close data later.",
  },
  {
    key: "headerQuickLinks",
    label: "Quick links",
    type: "links" as const,
    helper: "One link per line using Label|/route format.",
  },
  {
    key: "headerMarketNav",
    label: "Market navigation",
    type: "links" as const,
    helper: "One link per line using Label|/route format.",
  },
  {
    key: "headerUtilityNav",
    label: "Utility navigation",
    type: "links" as const,
    helper: "One link per line using Label|/route format.",
  },
  {
    key: "headerPrimaryCtaLabel",
    label: "Primary CTA label",
    type: "text" as const,
  },
  {
    key: "headerPrimaryCtaHref",
    label: "Primary CTA href",
    type: "text" as const,
  },
  {
    key: "headerHeadCode",
    label: "Header code and analytics",
    type: "textarea" as const,
    rows: 8,
    helper:
      "Paste trusted <script> tags that should load globally across public pages, such as Google Analytics or Google Ads. This is a site-wide master setting, and local-only URLs or non-script markup are blocked.",
  },
] satisfies Array<{
  key: keyof Awaited<ReturnType<typeof getLaunchConfigStore>>["experience"];
  label: string;
  type: "text" | "textarea" | "links" | "checkbox_group" | "image" | "number";
  rows?: number;
  helper?: string;
  options?: Array<{ label: string; value: string; description?: string }>;
}>;

const footerFields = [
  {
    key: "footerSummary",
    label: "Footer summary",
    type: "textarea" as const,
    rows: 4,
    helper: "Main footer summary text shown across the public site.",
  },
  {
    key: "footerLinks",
    label: "Footer links",
    type: "links" as const,
    helper: "One link per line using Label|/route format.",
  },
] satisfies Array<{
  key: keyof Awaited<ReturnType<typeof getLaunchConfigStore>>["experience"];
  label: string;
  type: "text" | "textarea" | "links";
  rows?: number;
  helper?: string;
}>;

const pageSidebarFields = [
  {
    key: "sharedSidebarEnabledPageCategories",
    label: "Page categories that can use the global sidebar",
    type: "checkbox_group" as const,
    helper:
      "Turn the shared global sidebar on or off by major page category. This controls whether supported routes in these categories render the shared market/gainers/losers/popular sidebar at all.",
    options: [...sharedSidebarPageCategoryOptions],
  },
  {
    key: "sharedSidebarVisibleBlocks",
    label: "Shared page sidebar blocks",
    type: "checkbox_group" as const,
    helper:
      "These blocks appear only on pages that support them, so you can use one checklist here without breaking routes that do not have every block.",
    options: [
      {
        label: "Market snapshot",
        value: "market_snapshot",
        description: "Show the shared Stock Market India and Global Markets blocks.",
      },
      {
        label: "Top Gainers",
        value: "top_gainers",
        description: "Show the shared Top Gainers block.",
      },
      {
        label: "Top Losers",
        value: "top_losers",
        description: "Show the shared Top Losers block.",
      },
      {
        label: "Popular Stocks",
        value: "popular_stocks",
        description: "Show the shared Popular Stocks block.",
      },
      {
        label: "Page actions",
        value: "page_actions",
        description: "Show quick actions like imports, watchlists, alerts, or related helpers.",
      },
      {
        label: "Route links",
        value: "route_links",
        description: "Show related-route handoff cards in the sidebar.",
      },
      {
        label: "Short checklist",
        value: "workflow_checklist",
        description: "Show compact checklist or guidance cards when a page supplies them.",
      },
    ],
  },
  {
    key: "sharedSidebarMarketDataMode",
    label: "Sidebar market value policy",
    type: "select" as const,
    helper:
      "Choose how the backend should treat market values in the shared sidebar. Manual snapshot keeps today's typed values, last close prepares the sidebar for resolved closing values, and live when available prepares it for intraday feeds.",
    options: [
      {
        label: "Manual snapshot",
        value: "manual_snapshot",
        description: "Use the values typed into the admin rows until market feeds are connected.",
      },
      {
        label: "Last close when available",
        value: "last_close_when_available",
        description: "Prefer the latest resolved close once feeds are connected, with the manual rows as fallback.",
      },
      {
        label: "Live when available",
        value: "live_when_available",
        description: "Prefer intraday live prices once feeds are connected, with the manual rows as fallback.",
      },
    ],
  },
  {
    key: "sharedSidebarIndiaRows",
    label: "Stock Market India rows",
    type: "textarea" as const,
    rows: 7,
    helper:
      "One row per line using Name|Last|Chg%|/route. Optional future-safe format: Name|Last|Chg%|/route|quote-key|quote-mode.",
  },
  {
    key: "sharedSidebarGlobalRows",
    label: "Global Markets rows",
    type: "textarea" as const,
    rows: 7,
    helper:
      "One row per line using Name|Last|Chg%|/route. Optional future-safe format: Name|Last|Chg%|/route|quote-key|quote-mode. Use quote keys like gold, silver, usd/inr, brent, bitcoin, or ethereum for future feed mapping.",
  },
  {
    key: "sharedSidebarTopGainersRows",
    label: "Top Gainers rows",
    type: "textarea" as const,
    rows: 6,
    helper:
      "One row per line using Name|Price|stock-slug-or-route. These rows drive the shared Top Gainers card.",
  },
  {
    key: "sharedSidebarTopLosersRows",
    label: "Top Losers rows",
    type: "textarea" as const,
    rows: 6,
    helper:
      "One row per line using Name|Price|stock-slug-or-route. These rows drive the shared Top Losers card.",
  },
  {
    key: "sharedSidebarPopularStocksRows",
    label: "Popular Stocks rows",
    type: "textarea" as const,
    rows: 6,
    helper:
      "One row per line using Name|Price|stock-slug-or-route. These rows drive the shared Popular Stocks card.",
  },
] satisfies Array<{
  key: keyof Awaited<ReturnType<typeof getLaunchConfigStore>>["experience"];
  label: string;
  type: "text" | "textarea" | "links" | "checkbox_group" | "select";
  rows?: number;
  helper?: string;
  options?: Array<{ label: string; value: string; description?: string }>;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { section } = await params;
  const meta = adminGlobalSiteSections.find((item) => item.key === section);

  return {
    title: meta ? meta.label : "Global Site",
  };
}

export default async function AdminGlobalSiteSectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<{ create?: string; focus?: string }>;
}) {
  const { section } = await params;
  const resolvedSearchParams = await searchParams;
  const meta = adminGlobalSiteSections.find((item) => item.key === section);

  if (!meta) {
    notFound();
  }

  const [launchConfig, store, revisions] = await Promise.all([
    getLaunchConfigStore(),
    getAdminOperatorStore(),
    getAdminGlobalRevisions(
      section === "header" || section === "footer"
        ? section
        : section === "page-sidebar"
          ? "pageSidebar"
        : section === "shared-blocks"
          ? "sharedBlocks"
          : section === "banners"
            ? "banners"
            : section === "route-strips"
              ? "routeStrips"
              : "marketModules",
    ),
  ]);

  const isExperienceSection =
    section === "header" || section === "footer" || section === "page-sidebar";

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Global Site", href: "/admin/global-site" },
          { label: meta.label, href: meta.href },
        ]}
        eyebrow="Global site"
        title={meta.label}
        description={meta.description}
      />

      <AdminGuidanceCard
        title="What changes here affect"
        description="Global-site edits can influence many routes at once, so treat this as shared frontend content."
        items={[
          "Header and footer edits affect public navigation, trust copy, and shared calls to action across the site.",
          "Shared blocks, banners, route strips, and market modules are reusable frontend modules, not one-off record content.",
          "Save draft first when you want a review step, and publish only when the shared change is ready for every assigned route.",
        ]}
        links={[
          { href: "/admin/help", label: "Help", tone: "primary" },
          { href: "/admin/activity-log", label: "Activity log" },
        ]}
      />

      {isExperienceSection ? (
        <AdminGlobalSiteEditorClient
          mode="experience"
          title={meta.label}
          description={meta.description}
          fields={
            section === "header"
              ? headerFields
              : section === "footer"
                ? footerFields
                : pageSidebarFields
          }
          experience={launchConfig.experience}
          revisions={revisions.slice(0, 6)}
          focusField={resolvedSearchParams?.focus ?? null}
        />
      ) : (
        <AdminGlobalSiteEditorClient
          mode="collection"
          title={meta.label}
          description={meta.description}
          section={
            section === "shared-blocks"
              ? "sharedBlocks"
              : section === "banners"
                ? "banners"
                : section === "route-strips"
                  ? "routeStrips"
                  : "marketModules"
          }
          items={
            section === "shared-blocks"
              ? store.globalSite.sharedBlocks
              : section === "banners"
                ? store.globalSite.banners
                : section === "route-strips"
                  ? store.globalSite.routeStrips
                : store.globalSite.marketModules
          }
          revisions={revisions.slice(0, 6)}
          initialCreate={resolvedSearchParams?.create === "1"}
          defaultModuleType={
            section === "shared-blocks"
              ? "shared_support_block"
              : section === "banners"
                ? "banner"
                : section === "route-strips"
                  ? "route_strip"
                  : "market_module"
          }
        />
      )}

      <AdminStorageStatusCard scope="global-site editing" />
    </AdminPageFrame>
  );
}
