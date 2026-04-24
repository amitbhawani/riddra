import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getDerivativesMemory } from "@/lib/derivatives-memory-store";
import { getPlaceholderHonestyRowByHref } from "@/lib/placeholder-honesty-registry";
import { requirePlanTier } from "@/lib/plan-gating";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { workstationCards, workstationRules, workstationSummary } from "@/lib/trader-workstation";

export const metadata: Metadata = {
  title: "Trader Workstation",
  description: "Open charts, index workflows, screeners, and option-chain views from one trader-focused workspace.",
};

export const dynamic = "force-dynamic";

export default async function TraderWorkstationPage() {
  await requirePlanTier("pro", "/trader-workstation");
  const truth = getSubscriberSurfaceTruth();
  const derivativesMemory = await getDerivativesMemory();
  const placeholderTruth = getPlaceholderHonestyRowByHref("/trader-workstation");
  const routedCards = workstationCards.map((item) =>
    item.title === "Option chain"
      ? {
          ...item,
          note: `${item.note} ${derivativesMemory.summary.retainedSnapshots} persisted derivatives snapshots now back the strike-window and analytics posture behind that route.`,
        }
      : item,
  );

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Trader Workstation", href: "/trader-workstation" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Premium preview</Eyebrow>
          <SectionHeading
            title="Trader workstation"
            description="Move between charts, screeners, index workflows, and option-chain views from one focused trader workspace."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Premium workflow truth"
          title="This premium workspace is still consolidating"
          description="The gating is real, but the workstation itself is still a structured premium preview. Advanced trader routes need more live market-state continuity before this can be treated as a finished workstation instead of a premium shell with strong foundations."
          items={[
            truth.hasLiveAuthContinuity
              ? "Real auth continuity is active enough to validate wider premium workflows."
              : "The app still leans on local preview auth, so premium continuity is not yet verified the way outside users would experience it.",
            "Charts, screeners, and index routes are real anchors, but the workstation wrapper still needs denser live workflow behavior.",
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
            <p className="text-sm text-mist/68">Mode</p>
            <p className="mt-2 text-3xl font-semibold text-white">{workstationSummary.mode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Strongest routes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{workstationSummary.strongestRoutes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Next depth</p>
            <p className="mt-2 text-3xl font-semibold text-white">{workstationSummary.nextDepth}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Derivatives snapshots</p>
            <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.retainedSnapshots}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Derivatives backend lane</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Feed posture</p>
              <p className="mt-2 text-2xl font-semibold text-white">{derivativesMemory.summary.derivativesFeed}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Analytics lanes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{derivativesMemory.summary.analyticsLanes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Next activation</p>
              <p className="mt-2 text-2xl font-semibold text-white">{derivativesMemory.summary.nextActivation}</p>
            </div>
          </div>
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
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {routedCards.map((item) => (
            <Link key={item.title} href={item.href}>
              <GlowCard className="h-full transition hover:border-white/18 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </GlowCard>
            </Link>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Workstation rules</h2>
          <div className="mt-5 grid gap-3">
            {[...workstationRules, ...derivativesMemory.rules].map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
