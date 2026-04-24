import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  providerRolloutItems,
  providerRolloutRules,
  providerRolloutsSummary,
} from "@/lib/provider-rollouts";

export const metadata: Metadata = {
  title: "Provider Rollouts",
  description:
    "Protected provider-rollouts page for staged provider promotion, health checks, rollback windows, and rollout discipline.",
};

export default async function AdminProviderRolloutsPage() {
  await requireUser();
  const readinessItems = providerRolloutItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/provider-rollouts",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Provider Rollouts", href: "/admin/provider-rollouts" },
            ]}
          />
          <Eyebrow>Rollout discipline</Eyebrow>
          <SectionHeading
            title="Provider rollouts"
            description="This page turns provider changes into staged operational rollouts so switching vendors becomes deliberate, observable, and reversible."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Rollout tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerRolloutsSummary.rolloutTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Staged environments</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerRolloutsSummary.stagedEnvironments}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollback windows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerRolloutsSummary.rollbackWindows}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="provider rollout track"
            panelTitle="Write-through provider rollout action"
            panelDescription="Log staged provider rollout changes into the shared revision lane so rollout discipline stops living only as a static vendor-rollout board."
            defaultRouteTarget="/admin/provider-rollouts"
            defaultOperator="Provider Rollout Operator"
            defaultChangedFields="provider_track, rollout_window, rollback_state"
            actionNoun="provider-rollout mutation"
          />
          {providerRolloutItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Rollout rules</h2>
          <div className="mt-5 grid gap-3">
            {providerRolloutRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
