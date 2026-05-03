"use client";

import { useState, useTransition } from "react";

import { AdminBadge, AdminCard, AdminSectionCard } from "@/components/admin/admin-primitives";
import type { LaunchConfigStore } from "@/lib/launch-config-store";

type SeoSettings = LaunchConfigStore["seo"];

const seoFieldGroups: Array<{
  title: string;
  description: string;
  fields: Array<{
    key: keyof SeoSettings;
    label: string;
    helper: string;
  }>;
}> = [
  {
    title: "Indexing policy",
    description: "Decide which public route families are allowed to be indexed at all.",
    fields: [
      {
        key: "indexHomepage",
        label: "Index homepage",
        helper: "Keep the homepage indexable as the primary discovery route.",
      },
      {
        key: "indexStockPages",
        label: "Index stock pages",
        helper: "Published stock pages remain the main SEO asset family.",
      },
      {
        key: "indexMutualFundPages",
        label: "Index mutual fund pages",
        helper: "Leave this off until the fund experience is fully launch-ready.",
      },
      {
        key: "indexWealthPages",
        label: "Index wealth pages",
        helper: "Leave this off while wealth routes stay discovery-only.",
      },
      {
        key: "indexNewsListingPage",
        label: "Index main news listing page",
        helper: "Keep the main market-news listing indexable.",
      },
      {
        key: "indexNewsDetailPages",
        label: "Index news detail pages",
        helper: "Keep this off to prevent article detail pages from being indexed.",
      },
      {
        key: "indexMarketsPages",
        label: "Index markets pages",
        helper: "Allow the main markets overview page to index.",
      },
      {
        key: "indexSearchPages",
        label: "Index search page",
        helper: "Search may be indexable even if search-result URLs stay out of the sitemap.",
      },
      {
        key: "indexIndexPages",
        label: "Index benchmark/index pages",
        helper: "Allow Nifty 50 and related index routes to be indexed.",
      },
    ],
  },
  {
    title: "Sitemap inclusion",
    description: "Only include routes here when they are clean enough for deliberate crawl discovery.",
    fields: [
      {
        key: "includeHomepageInSitemap",
        label: "Homepage in sitemap",
        helper: "Homepage stays in the main sitemap.",
      },
      {
        key: "includeStockPagesInSitemap",
        label: "Stock pages in sitemap",
        helper: "Published stock pages appear in the main sitemap.",
      },
      {
        key: "includeMutualFundPagesInSitemap",
        label: "Mutual funds in sitemap",
        helper: "Keep off until fund pages are intentionally indexable.",
      },
      {
        key: "includeWealthPagesInSitemap",
        label: "Wealth pages in sitemap",
        helper: "Keep off while wealth routes are not indexable.",
      },
      {
        key: "includeNewsListingPageInSitemap",
        label: "Main news listing in sitemap",
        helper: "Only the news listing page should appear here for now.",
      },
      {
        key: "includeNewsDetailPagesInSitemap",
        label: "News detail pages in sitemap",
        helper: "Keep off to exclude article detail pages from sitemap discovery.",
      },
      {
        key: "includeMarketsPagesInSitemap",
        label: "Markets page in sitemap",
        helper: "Include the main markets page.",
      },
      {
        key: "includeSearchPagesInSitemap",
        label: "Search page in sitemap",
        helper: "Usually off even when search itself is indexable.",
      },
      {
        key: "includeIndexPagesInSitemap",
        label: "Benchmark/index pages in sitemap",
        helper: "Include the approved benchmark pages such as Nifty 50.",
      },
    ],
  },
];

export function AdminSeoSettingsClient({
  initialSettings,
}: {
  initialSettings: SeoSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      setBanner(null);

      try {
        const response = await fetch("/api/admin/launch-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "seo",
            data: settings,
            mode: "publish",
          }),
        });
        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
              store?: LaunchConfigStore;
            }
          | null;

        if (!response.ok || !data?.store) {
          setBanner({
            tone: "danger",
            text: data?.error ?? "Could not save the SEO controls right now.",
          });
          return;
        }

        setSettings(data.store.seo);
        setBanner({
          tone: "success",
          text: "SEO controls saved. Robots, sitemap, and page-level metadata now read this same policy.",
        });
      } catch (error) {
        setBanner({
          tone: "danger",
          text:
            error instanceof Error
              ? error.message
              : "Could not save the SEO controls right now.",
        });
      }
    });
  }

  const activeIndexFamilies = [
    settings.indexHomepage && "Homepage",
    settings.indexStockPages && "Stocks",
    settings.indexIndexPages && "Indices",
    settings.indexMarketsPages && "Markets",
    settings.indexSearchPages && "Search",
    settings.indexNewsListingPage && "News listing",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "primary" : "warning"}>
          <div className="space-y-1">
            <AdminBadge
              label={banner.tone === "success" ? "Saved" : "Error"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm leading-6 text-[#4b5563]">{banner.text}</p>
          </div>
        </AdminCard>
      ) : null}

      <AdminSectionCard
        title="SEO policy summary"
        description="Treat this as the master crawl policy. Per-page SEO fields can narrow the page behavior, but should not loosen these route-family rules."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
              Indexed families
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[#111827]">
              {activeIndexFamilies.length
                ? activeIndexFamilies.join(", ")
                : "No public route families are currently indexable."}
            </p>
          </div>
          <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
              Explicitly blocked
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[#111827]">
              Mutual funds, wealth, news details, user pages, account, portfolio, compare, admin, drafts, and APIs.
            </p>
          </div>
          <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
              Internal process
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[#111827]">
              CSV upload today. Google Sheet and provider sync can be connected later.
            </p>
          </div>
        </div>
      </AdminSectionCard>

      {seoFieldGroups.map((group) => (
        <AdminSectionCard
          key={group.title}
          title={group.title}
          description={group.description}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {group.fields.map((field) => (
              <label
                key={field.key}
                className="flex items-start gap-3 rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-3"
              >
                <input
                  type="checkbox"
                  checked={settings[field.key]}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      [field.key]: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border border-[#cbd5e1]"
                />
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-[#111827]">{field.label}</p>
                  <p className="text-[12px] leading-5 text-[#6b7280]">{field.helper}</p>
                </div>
              </label>
            ))}
          </div>
        </AdminSectionCard>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white"
        >
          {isPending ? "Saving SEO controls..." : "Save SEO controls"}
        </button>
      </div>
    </div>
  );
}

