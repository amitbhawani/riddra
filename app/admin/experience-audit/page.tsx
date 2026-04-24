import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  experienceAuditItems,
  experienceAuditRules,
  experienceAuditSummary,
} from "@/lib/experience-audit";

export const metadata: Metadata = {
  title: "Experience Audit",
  description:
    "Protected experience-audit page for public polish, admin clarity, interaction review, and trust-focused refinement planning.",
};

export default async function AdminExperienceAuditPage() {
  await requireUser();

  const readinessItems = experienceAuditItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Public-page polish audit"
        ? "/admin/public-launch-qa"
        : item.title === "Admin usability audit"
          ? "/build-tracker"
          : item.title === "Interaction and motion pass"
            ? "/admin/mobile-qa-matrix"
            : "/admin/trust-signoff",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Experience Audit", href: "/admin/experience-audit" },
            ]}
          />
          <Eyebrow>Launch polish</Eyebrow>
          <SectionHeading
            title="Experience audit"
            description="This page turns final product polish into an operator-visible audit so the platform can move from feature-complete toward trust-complete."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Audit zones</p>
            <p className="mt-2 text-3xl font-semibold text-white">{experienceAuditSummary.auditZones}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Journey families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{experienceAuditSummary.journeyFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Polish signals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{experienceAuditSummary.polishSignals}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="experience audit lane"
              panelTitle="Write-through experience-audit action"
              panelDescription="Log launch-polish and trust-review changes into the shared revision lane so experience audits stop living only as final-pass notes."
              defaultRouteTarget="/admin/experience-audit"
              defaultOperator="Experience Audit Operator"
              defaultChangedFields="audit_state, polish_scope, trust_signal"
              actionNoun="experience-audit mutation"
            />
          </GlowCard>
          {experienceAuditItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Experience rules</h2>
          <div className="mt-5 grid gap-3">
            {experienceAuditRules.map((rule) => (
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
