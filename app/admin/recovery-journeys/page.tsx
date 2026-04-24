import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  recoveryJourneyItems,
  recoveryJourneyRules,
  recoveryJourneysSummary,
} from "@/lib/recovery-journeys";

export const metadata: Metadata = {
  title: "Recovery Journeys",
  description:
    "Protected recovery-journeys page for trust repair, mismatch recovery, billing recovery, and guided user re-entry paths.",
};

export default async function AdminRecoveryJourneysPage() {
  await requireUser();

  const readinessItems = recoveryJourneyItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Portfolio mismatch recovery"
        ? "/portfolio/import"
        : item.title === "Billing interruption recovery"
          ? "/account/billing/recovery"
          : item.title === "Alert and consent recovery"
            ? "/account/consents"
            : item.title === "Support escalation recovery"
              ? "/account/support"
              : "/admin/user-success",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Recovery Journeys", href: "/admin/recovery-journeys" },
            ]}
          />
          <Eyebrow>Trust repair</Eyebrow>
          <SectionHeading
            title="Recovery journeys"
            description="This page turns trust-repair moments into structured user journeys so portfolio, billing, support, and messaging failures can recover with clarity."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Journey families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{recoveryJourneysSummary.journeyFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Trust repair moments</p>
            <p className="mt-2 text-3xl font-semibold text-white">{recoveryJourneysSummary.trustRepairMoments}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Guided recoveries</p>
            <p className="mt-2 text-3xl font-semibold text-white">{recoveryJourneysSummary.guidedRecoveries}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="recovery journey"
              panelTitle="Write-through recovery-journey action"
              panelDescription="Log trust-repair and re-entry journey changes into the shared revision lane so recovery posture stops living only as a planning board."
              defaultRouteTarget="/admin/recovery-journeys"
              defaultOperator="Recovery Journey Operator"
              defaultChangedFields="recovery_lane, trust_posture, reentry_rule"
              actionNoun="recovery-journey mutation"
            />
          </GlowCard>
          {recoveryJourneyItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Recovery rules</h2>
          <div className="mt-5 grid gap-3">
            {recoveryJourneyRules.map((rule) => (
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
