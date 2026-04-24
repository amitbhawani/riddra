import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  goLiveHandoffItems,
  goLiveHandoffRules,
  goLiveHandoffSummary,
} from "@/lib/go-live-handoff";

export const metadata: Metadata = {
  title: "Go-Live Handoff",
  description:
    "Protected go-live-handoff page for launch streams, blocked inputs, ownership, and post-build activation sequencing.",
};

export default async function AdminGoLiveHandoffPage() {
  await requireUser();
  const readinessItems = goLiveHandoffItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: `${item.summary} Owner: ${item.owner}.`,
    routeTarget: "/admin/go-live-handoff",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Go-Live Handoff", href: "/admin/go-live-handoff" },
            ]}
          />
          <Eyebrow>Launch execution</Eyebrow>
          <SectionHeading
            title="Go-live handoff"
            description="This page converts build completion into launch execution by separating ready platform work from blocked credentials, business inputs, and activation sequencing."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Launch streams</p>
            <p className="mt-2 text-3xl font-semibold text-white">{goLiveHandoffSummary.launchStreams}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked inputs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{goLiveHandoffSummary.blockedInputs}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Handoff owners</p>
            <p className="mt-2 text-3xl font-semibold text-white">{goLiveHandoffSummary.handoffOwners}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="go-live handoff lane"
            panelTitle="Write-through go-live handoff action"
            panelDescription="Log owner handoff and blocked-input changes into the shared revision lane so launch execution stops living only as a static handoff board."
            defaultRouteTarget="/admin/go-live-handoff"
            defaultOperator="Go-Live Handoff Operator"
            defaultChangedFields="handoff_owner, blocked_input, activation_sequence"
            actionNoun="go-live-handoff mutation"
          />
          {goLiveHandoffItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="grid gap-2 text-right">
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {item.status}
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.owner}</div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Handoff rules</h2>
          <div className="mt-5 grid gap-3">
            {goLiveHandoffRules.map((rule) => (
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
