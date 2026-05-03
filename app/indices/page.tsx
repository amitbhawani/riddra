import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { IndexLiveRefreshCard } from "@/components/index-live-refresh-card";
import { IndexWeightRosterCard } from "@/components/index-weight-roster-card";
import { IndexSubnav } from "@/components/index-subnav";
import { JsonLd } from "@/components/json-ld";
import { IndexAccessCard } from "@/components/index-access-card";
import { MarketDataUnavailableState } from "@/components/market-data-unavailable-state";
import { ManagedPageSidebarCard } from "@/components/managed-page-sidebar-card";
import {
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { TimelineBarStrip } from "@/components/timeline-bar-strip";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import { getIndexSnapshots, getIndexWeightRosters, type IndexWeightRoster } from "@/lib/index-content";
import { buildSeoMetadata } from "@/lib/seo-config";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    policyKey: "indices_hub",
    title: "Index Intelligence | Riddra",
    description:
      "Track Nifty 50, Bank Nifty, Fin Nifty, and Sensex using weighted component contribution, pullers, draggers, and market mood.",
    publicHref: "/indices",
  });
}

export default async function IndicesPage() {
  const sidebarPromise = getGlobalSidebarRail("indices");
  let snapshots: IndexSnapshot[] = [];
  let rosters: IndexWeightRoster[] = [];
  let readFailureDetail: string | null = null;

  try {
    snapshots = await getIndexSnapshots();
  } catch (error) {
    readFailureDetail =
      error instanceof Error ? error.message : "Unknown index snapshot cluster read failure.";
  }

  if (snapshots.length === 0) {
    try {
      rosters = await getIndexWeightRosters();
    } catch (error) {
      readFailureDetail ??=
        error instanceof Error ? error.message : "Unknown index roster cluster read failure.";
    }
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Indices", href: "/indices" },
  ];
  const liveRefreshFallbackState =
    snapshots.length > 0 ? null : readFailureDetail ? "read_failed" : "unavailable";
  const sidebar = await sidebarPromise;

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Index Intelligence",
          description:
            "Track Nifty 50, Bank Nifty, Fin Nifty, and Sensex using weighted component contribution, pullers, draggers, and market mood.",
          path: "/indices",
        })}
      />
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
        <div className="space-y-4">
          <Breadcrumbs items={breadcrumbs} />
          <ProductSectionTitle
            eyebrow="Index hub"
            title="Index intelligence hub"
            description="Follow Nifty 50, Sensex, Bank Nifty, and Fin Nifty through component weightage, pullers, draggers, and breadth so the move behind the headline becomes easier to read."
          />
          <IndexSubnav currentPath="/indices" />
          <IndexLiveRefreshCard
            initialSnapshot={snapshots[0] ?? null}
            fallbackState={liveRefreshFallbackState}
          />
        </div>

        <ProductCard tone="primary" className="grid gap-4 p-4 lg:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Index route truth</p>
            <h2 className="mt-1 text-[16px] font-semibold text-[#111827]">Benchmark pages stay explicit about coverage and freshness</h2>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Use the hub for benchmark context, breadth, and leadership without mixing in launch-status or operator guidance.
            </p>
          </div>
          <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white/92 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Coverage model</p>
            <p className="mt-1 text-[14px] font-semibold text-[#111827]">Retained snapshot first</p>
            <p className="mt-2 text-[12px] leading-6 text-[rgba(75,85,99,0.82)]">
              Breadth and benchmark moves use retained public index data where available and stay clearly labeled when partial.
            </p>
          </div>
          <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white/92 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Reading flow</p>
            <p className="mt-1 text-[14px] font-semibold text-[#111827]">Breadth, leadership, timeline, roster</p>
            <p className="mt-2 text-[12px] leading-6 text-[rgba(75,85,99,0.82)]">
              The hub is now aligned to the same benchmark-reading rhythm used on the detail pages.
            </p>
          </div>
        </ProductCard>

        {snapshots.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {snapshots.map((snapshot) => (
              <ProductCard key={snapshot.slug} tone="primary" className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#111827]">{snapshot.title}</h2>
                    <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">{snapshot.breadthLabel}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                      {snapshot.marketLabel} · updated {snapshot.lastUpdated}
                    </p>
                  </div>
                  <div className="rounded-full border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#1B3A6B]">
                    {snapshot.marketMood}
                  </div>
                </div>
                <div className="mt-4 rounded-[10px] border border-dashed border-[rgba(221,215,207,0.96)] bg-[rgba(248,246,243,0.86)] px-3 py-3 text-[12px] leading-6 text-[rgba(75,85,99,0.82)]">
                  {snapshot.marketDetail}
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3 text-[12px] text-[rgba(75,85,99,0.82)]">
                    Weighted breadth: <span className="text-[#111827]">{snapshot.weightedBreadthScore}</span>
                  </div>
                  <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3 text-[12px] text-[rgba(75,85,99,0.82)]">
                    Positive weight share: <span className="text-[#111827]">{snapshot.positiveWeightShare}%</span>
                  </div>
                  <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3 text-[12px] text-[rgba(75,85,99,0.82)]">
                    Dominance read: <span className="text-[#111827]">{snapshot.dominanceLabel}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <TimelineBarStrip
                    title="Breadth rhythm"
                    points={snapshot.timeline.map((point) => ({
                      label: point.timeLabel,
                      value: point.weightedBreadthScore,
                    }))}
                  />
                </div>
                <p className="mt-4 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">{snapshot.narrative}</p>
                <Link
                  href={`/${snapshot.slug}`}
                  className="mt-4 inline-flex rounded-full border border-[rgba(221,215,207,0.96)] bg-white/92 px-4 py-2 text-[12px] text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.04)]"
                >
                  Open {snapshot.title}
                </Link>
              </ProductCard>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <MarketDataUnavailableState
              state={readFailureDetail ? "read_failed" : "unavailable"}
              eyebrow="Index hub availability"
              title={readFailureDetail ? "Index data read failed" : "Index data not available yet"}
              description={
                readFailureDetail
                  ? "The retained index source could not be read right now, so the hub is staying explicit about the failure instead of guessing."
                  : "This hub only surfaces tracked index routes after retained benchmark snapshots are written for the public layer."
              }
              items={
                readFailureDetail
                  ? [
                      "Try this hub again after the retained index source reconnects.",
                      "Stored component rosters can still appear below when they already exist.",
                    ]
                  : [
                      "Tracked index pages appear here once retained benchmark snapshots exist.",
                      "Stored component rosters can still appear below when tracked index weights already exist.",
                    ]
              }
            />
            {rosters.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {rosters.map((roster) => (
                  <IndexWeightRosterCard key={roster.slug} roster={roster} />
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <ProductCard tone="primary" className="p-4">
            <h2 className="text-[16px] font-semibold text-[#111827]">Daily review lens</h2>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              These pages focus on daily mood, component contribution, pullers, draggers,
              and clear methodology so traders can review index structure quickly.
            </p>
          </ProductCard>
          <IndexAccessCard />
        </div>
        <ManagedPageSidebarCard family="index" assetName="Index intelligence hub" />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
