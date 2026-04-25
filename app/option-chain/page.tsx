import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getDerivativesMemory } from "@/lib/derivatives-memory-store";
import { getPlaceholderHonestyRowByHref } from "@/lib/placeholder-honesty-registry";
import { requirePlanTier } from "@/lib/plan-gating";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import {
  optionAnalyticsCards,
  optionChainRules,
  optionChainLayoutColumns,
  optionWorkflowLanes,
} from "@/lib/option-chain";

export const metadata: Metadata = {
  title: "Option Chain",
  description: "Option-chain workstation surface for strike context, OI framing, and derivatives direction planning.",
};

export const dynamic = "force-dynamic";

export default async function OptionChainPage() {
  await requirePlanTier("pro", "/option-chain");
  const truth = getSubscriberSurfaceTruth();
  const derivativesMemory = await getDerivativesMemory();
  const placeholderTruth = getPlaceholderHonestyRowByHref("/option-chain");

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Trader Workstation", href: "/trader-workstation" },
    { name: "Option Chain", href: "/option-chain" },
  ];

  return (
      <GlobalSidebarPageShell
        category="charts"
        className="space-y-3.5 sm:space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Premium preview</Eyebrow>
          <SectionHeading
            title="Option chain"
            description="Track active strikes, open-interest pressure, and directional positioning from one fast options workspace."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Derivatives truth"
          title="This route is now a clean derivatives preview, not a live chain"
          description="This page is useful as a workflow preview, but it is not yet a live NSE open-interest surface. Until derivatives data is wired properly, the route should stay explicit about being a premium preview rather than a finished options terminal."
          items={[
            "The fake strike rows have been removed, so the route now shows layout and interpretation depth without pretending seeded OI data is real.",
            truth.hasMarketDataProvider
              ? "A broader market-data provider exists, but the derivatives leg still needs its own verified source and refresh discipline."
              : "Derivatives source activation is still pending, so live OI and change-in-OI should not be implied yet.",
          ]}
          currentState={placeholderTruth?.currentState}
          expectedState={placeholderTruth?.expectedState}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
          secondaryHref="/admin/public-launch-qa"
          secondaryHrefLabel="Open placeholder honesty"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Current mode</p>
            <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.currentMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Derivatives feed</p>
            <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.derivativesFeed}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Next activation</p>
            <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.nextActivation}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Retained snapshots</p>
            <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.retainedSnapshots}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Planned chain layout</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            {truth.usesPreviewMode
              ? "The hardcoded strike rows have been removed on purpose. This route now shows the layout and interpretation model without pretending seeded rows are real derivatives values."
              : "This route is ready to accept verified option-chain payloads once the derivatives source is connected."}
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {optionChainLayoutColumns.map((column) => (
              <div key={column.title} className="rounded-[24px] border border-white/10 bg-black/15 px-5 py-5">
                <p className="text-xs uppercase tracking-[0.18em] text-mist/56">Preview module</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{column.title}</h3>
                <p className="mt-3 text-sm leading-7 text-mist/76">{column.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/indices"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Cross-check index mood
            </Link>
            <Link
              href="/trader-workstation"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Back to workstation
            </Link>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Persisted chain snapshots</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            The derivatives backend now has a first file-backed memory lane for expiry, strike windows, and refresh posture, but this route should stay empty until a real derivatives snapshot is actually retained.
          </p>
          <div className="mt-5 grid gap-4">
            {derivativesMemory.snapshots.length > 0 ? (
              derivativesMemory.snapshots.map((item) => (
                <div key={`${item.symbol}-${item.expiry}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.symbol}</h3>
                      <p className="mt-2 text-sm text-mist/66">
                        {item.expiry} · Strike window {item.strikeWindow}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.snapshotState}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  <p className="mt-2 text-xs leading-6 text-mist/55">Next refresh: {item.nextRefresh}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm leading-7 text-mist/70">
                No option-chain snapshots are retained yet. This route now stays empty until a real expiry-aware derivatives snapshot is written into the backend memory lane.
              </div>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Workstation rules</h2>
          <div className="mt-5 grid gap-3">
            {[...optionChainRules, ...derivativesMemory.rules].map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Analytics stack</h2>
            <div className="mt-5 grid gap-3">
              {derivativesMemory.analyticsLanes.map((item) => (
                <div key={item.lane} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.lane}</p>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{item.note}</p>
                  <p className="mt-2 text-xs leading-6 text-mist/55">
                    Retained sessions: {item.retainedSessions} · Next job: {item.nextJob}
                  </p>
                </div>
              ))}
              {optionAnalyticsCards.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{item.description}</p>
                </div>
              ))}
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Trader workflow depth</h2>
            <div className="mt-5 grid gap-3">
              {optionWorkflowLanes.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
              {derivativesMemory.backlogLanes.map((item) => (
                <div key={item.lane} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.lane}</p>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{item.note}</p>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </GlobalSidebarPageShell>
  );
}
