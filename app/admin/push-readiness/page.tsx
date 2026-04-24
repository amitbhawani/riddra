import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  pushReadinessItems,
  pushReadinessRules,
  pushReadinessSummary,
} from "@/lib/push-readiness";

export const metadata: Metadata = {
  title: "Push Readiness",
  description:
    "Protected push-readiness page for mobile triggers, lifecycle reminders, permission-aware delivery, and app-entry routing.",
};

export default async function AdminPushReadinessPage() {
  await requireUser();
  const readinessItems = pushReadinessItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/push-readiness",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Push Readiness", href: "/admin/push-readiness" },
            ]}
          />
          <Eyebrow>Mobile delivery</Eyebrow>
          <SectionHeading
            title="Push readiness"
            description="This page turns mobile notifications into a deliberate lifecycle and alerting system instead of a future delivery checkbox."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Channel modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pushReadinessSummary.channelModes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Trigger families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pushReadinessSummary.triggerFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Permission layers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pushReadinessSummary.permissionLayers}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="push readiness lane"
            panelTitle="Write-through push readiness action"
            panelDescription="Log notification and trigger changes into the shared revision lane so push activation stops living only as a static lifecycle-delivery board."
            defaultRouteTarget="/admin/push-readiness"
            defaultOperator="Push Readiness Operator"
            defaultChangedFields="push_trigger, delivery_permission, mobile_route"
            actionNoun="push-readiness mutation"
          />
          {pushReadinessItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Push rules</h2>
          <div className="mt-5 grid gap-3">
            {pushReadinessRules.map((rule) => (
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
