import type { Metadata } from "next";
import Link from "next/link";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { getMarketEvents } from "@/lib/learn";
import { getPublicTruthCopy } from "@/lib/public-route-truth";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Results Calendar",
  description: "Riddra event and results calendar for market-following users.",
};

export default async function ResultsCalendarPage() {
  const truthCopy = getPublicTruthCopy({
    continuitySubject: "event-calendar usage",
    handoffLabel: "calendar-to-account handoff",
    billingSubject: "premium event-calendar workflow language",
    supportSubject: "event-driven users who convert into assisted workflows",
  });
  const events = await getMarketEvents();
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Reports", href: "/reports" },
    { label: "Results Calendar", href: "/reports/results-calendar" },
  ];
  const breadcrumbSchemaItems = breadcrumbs.map((item) => ({ name: item.label, href: item.href }));

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbSchemaItems)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Results Calendar",
          description: "Riddra event and results calendar for market-following users.",
          path: "/reports/results-calendar",
        })}
      />
      <GlobalSidebarPageShell
        category="reports"
        className="space-y-3.5 sm:space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <ProductBreadcrumbs items={breadcrumbs} />

        <ProductCard tone="primary" className="p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
              <ProductSectionTitle
                eyebrow="Event-led discovery"
                title="Results and event calendar"
                description="Follow results windows, IPO milestones, and recurring market events from one place, then move quickly into the related stocks, funds, and learning routes."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Tracked events</p>
                  <p className="mt-1 text-[20px] font-semibold text-[#111827]">{events.length}</p>
                </div>
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Primary use</p>
                  <p className="mt-1 text-[15px] font-semibold text-[#111827]">Calendar-led follow-through</p>
                </div>
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Connected routes</p>
                  <p className="mt-1 text-[15px] font-semibold text-[#111827]">Reports, stocks, learn</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Reading flow</p>
                <p className="mt-2 text-[15px] font-semibold text-[#1B3A6B]">Event first, then asset follow-through</p>
                <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                  This page now opens with the same public research shell as the rest of the product instead of the older report-only wrapper.
                </p>
              </div>
            </div>
          </div>
        </ProductCard>

              <PublicSurfaceTruthSection
                eyebrow="Results-calendar truth"
                title="This report route is useful for public event discovery right now, but saved continuity still depends on launch activation"
                description="Use the results calendar confidently for public event discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
                authReady={truthCopy.authReady}
                authPending={truthCopy.authPending}
                billingReady={truthCopy.billingReady}
                billingPending={truthCopy.billingPending}
                supportReady={truthCopy.supportReady}
                supportPending={truthCopy.supportPending}
                href="/launch-readiness"
                hrefLabel="Open launch readiness"
                secondaryHref="/account/support"
                secondaryHrefLabel="Open support continuity"
              />

        <div className="grid gap-6">
          {events.map((event) => (
            <ProductCard key={event.slug} tone="secondary" className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-semibold text-[#1B3A6B]">{event.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{event.summary}</p>
                </div>
                <div className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#1B3A6B]">
                  {event.eventType}
                </div>
              </div>
              <p className="text-sm text-[rgba(107,114,128,0.78)]">Window: {event.dateLabel}</p>
              <p className="text-sm text-[rgba(107,114,128,0.78)]">Status: {event.status}</p>
              <p className="text-sm text-[rgba(107,114,128,0.78)]">Asset reference: {event.assetRef}</p>
              <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">{event.archiveNote}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/learn/events/${event.slug}`}
                  className="inline-flex rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
                >
                  Open event page
                </Link>
                {event.followUpRoutes.slice(0, 2).map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="inline-flex rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-[rgba(27,58,107,0.03)] px-4 py-2 text-sm text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.05)]"
                  >
                    {route.label}
                  </Link>
                ))}
              </div>
            </ProductCard>
          ))}
        </div>
      </GlobalSidebarPageShell>
    </>
  );
}
