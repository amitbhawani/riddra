import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { indexReplayRows, indexReplayRules, indexReplaySummary } from "@/lib/index-replay";

export const metadata: Metadata = {
  title: "Index Replay",
  description: "Index replay workstation surface for Nifty50, BankNifty, FinNifty, and Sensex session review.",
};

export default function IndexReplayPage() {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Trader Workstation", href: "/trader-workstation" },
    { name: "Index Replay", href: "/index-replay" },
  ];

  return (
    <GlobalSidebarPageShell
      category="indices"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface space-y-6"
    >
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 4 workstation</Eyebrow>
          <SectionHeading
            title="Index replay"
            description="Review how the tracked indexes behaved through the session, from the opening move to trend shifts and contribution changes."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Replay truth"
          title="This replay route is useful for workflow review, but deeper continuity still depends on launch activation"
          description="Use index replay confidently for session review, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry replay review into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full replay-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium replay and trader workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium replay promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for replay-led users who convert."
          supportPending="Support delivery is still not fully active, so replay routes should keep support expectations conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked indexes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{indexReplaySummary.trackedIndexes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Replay views</p>
            <p className="mt-2 text-3xl font-semibold text-white">{indexReplaySummary.replayViews}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Session modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{indexReplaySummary.sessionModes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {indexReplayRows.map((item) => (
            <GlowCard key={item.title}>
              <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-mist/74">{item.note}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Replay rules</h2>
          <div className="mt-5 grid gap-3">
            {indexReplayRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/indices"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open indices
            </Link>
            <Link
              href="/trader-workstation"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Back to workstation
            </Link>
          </div>
        </GlowCard>
    </GlobalSidebarPageShell>
  );
}
