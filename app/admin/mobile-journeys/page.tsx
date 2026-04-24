import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  mobileJourneyItems,
  mobileJourneyRules,
  mobileJourneySummary,
} from "@/lib/mobile-journeys";

export const metadata: Metadata = {
  title: "Mobile Journeys",
  description:
    "Protected mobile-journeys page for deep-link routing, saved-state continuity, and cross-channel app handoff planning.",
};

export default async function AdminMobileJourneysPage() {
  await requireUser();

  const readinessItems = mobileJourneyItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Deep-link destination mapping"
        ? "/admin/push-readiness"
        : item.title === "Saved-state continuity"
          ? "/account/workspace"
          : item.title === "Cross-channel handoff rules"
            ? "/admin/communication-readiness"
            : "/admin/recovery-readiness",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Mobile Journeys", href: "/admin/mobile-journeys" },
            ]}
          />
          <Eyebrow>App continuity</Eyebrow>
          <SectionHeading
            title="Mobile journeys"
            description="This page turns app entry, saved context, and cross-channel continuity into a real operating layer instead of a future implementation detail."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Entry journeys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mobileJourneySummary.entryJourneys}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Saved contexts</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mobileJourneySummary.savedContexts}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Handoff states</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mobileJourneySummary.handoffStates}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="mobile journey"
              panelTitle="Write-through mobile-journey action"
              panelDescription="Log mobile continuity and routing changes into the shared revision lane so cross-channel handoff posture stops living only as a planning board."
              defaultRouteTarget="/admin/mobile-journeys"
              defaultOperator="Mobile Journey Operator"
              defaultChangedFields="entry_rule, continuity_state, handoff_policy"
              actionNoun="mobile-journey mutation"
            />
          </GlowCard>
          {mobileJourneyItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Mobile journey rules</h2>
          <div className="mt-5 grid gap-3">
            {mobileJourneyRules.map((rule) => (
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
