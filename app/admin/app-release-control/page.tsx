import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  appReleaseControlItems,
  appReleaseControlRules,
  appReleaseControlSummary,
} from "@/lib/app-release-control";

export const metadata: Metadata = {
  title: "App Release Control",
  description:
    "Protected app-release-control page for mobile contract review, push and deep-link handoff, and native rollout signoff planning.",
};

export default async function AdminAppReleaseControlPage() {
  await requireUser();
  const readinessItems = appReleaseControlItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/app-release-control",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "App Release Control", href: "/admin/app-release-control" },
            ]}
          />
          <Eyebrow>Native launch control</Eyebrow>
          <SectionHeading
            title="App release control"
            description="This page turns mobile rollout into a governed launch track so contracts, deep links, permissions, and support expectations stay aligned."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Release tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{appReleaseControlSummary.releaseTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Readiness signals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{appReleaseControlSummary.readinessSignals}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Handoff checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{appReleaseControlSummary.handoffChecks}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="app release control track"
            panelTitle="Write-through app release action"
            panelDescription="Log native rollout, deep-link, packaging, and support changes into the shared revision lane so app release readiness stops living only as a static mobile checklist."
            defaultRouteTarget="/admin/app-release-control"
            defaultOperator="App Release Control Operator"
            defaultChangedFields="app_release_track, rollout_state, mobile_contract"
            actionNoun="app-release-control mutation"
          />
          {appReleaseControlItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">App release rules</h2>
          <div className="mt-5 grid gap-3">
            {appReleaseControlRules.map((rule) => (
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
