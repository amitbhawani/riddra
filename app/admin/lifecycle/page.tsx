import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { lifecycleRules, lifecycleSamples, lifecycleSummary } from "@/lib/lifecycle-ops";

export const metadata: Metadata = {
  title: "Lifecycle Operations",
  description: "Protected lifecycle-operations page for IPO-to-stock transitions, archive continuity, and asset-state management.",
};

export default async function LifecyclePage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Lifecycle Operations", href: "/admin/lifecycle" },
  ];
  const readinessItems = lifecycleSamples.map((item) => ({
    label: item.entity,
    status: item.transitionType === "corporate_event_refresh" ? "Ready" : "Needs verification",
    detail: item.note,
    routeTarget:
      item.transitionType === "ipo_to_stock"
        ? "/ipo"
        : item.transitionType === "sme_listing_transition"
          ? "/ipo/sme"
          : "/stocks",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Lifecycle system</Eyebrow>
          <SectionHeading
            title="Lifecycle operations"
            description="This page models how IPOs, SME issues, listed stocks, and future asset families should change state without breaking pages, history, or editorial context."
          />
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="lifecycle transition"
            panelTitle="Write-through lifecycle action"
            panelDescription="Log state-transition and continuity changes into the shared revision lane so lifecycle posture stops living only as an operations explainer."
            defaultRouteTarget="/admin/lifecycle"
            defaultOperator="Lifecycle Operator"
            defaultChangedFields="transition_type, archive_continuity, target_state"
            actionNoun="lifecycle mutation"
          />
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active transitions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleSummary.activeTransitions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Archive ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleSummary.archiveReady}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending mapping</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleSummary.pendingMapping}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Transition queue</h2>
          <div className="mt-5 grid gap-4">
            {lifecycleSamples.map((item) => (
              <div key={`${item.entity}-${item.transitionType}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.entity}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.currentState} → {item.nextState}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.transitionType}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <p className="mt-2 text-xs text-mist/60">Owner: {item.owner}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Lifecycle rules</h2>
          <div className="mt-5 grid gap-3">
            {lifecycleRules.map((rule) => (
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
