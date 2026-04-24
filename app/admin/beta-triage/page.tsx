import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBetaTriage } from "@/lib/beta-triage";

export const metadata: Metadata = {
  title: "Beta Triage",
  description:
    "Protected beta-triage page for sorting early beta issues by severity, owner, and immediate action.",
};

export default async function AdminBetaTriagePage() {
  await requireUser();

  const triage = getBetaTriage();
  const readinessItems = triage.items.map((item) => ({
    label: item.title,
    status: item.severity === "P0" ? "Blocked" : item.severity === "P1" ? "In progress" : "Queued",
    detail: `${item.owner} · ${item.trigger} Action: ${item.action}`,
    routeTarget:
      item.title === "Auth failure or callback dead-end"
        ? "/admin/auth-activation"
        : item.title === "Broken trust or support path"
          ? "/admin/trust-signoff"
          : item.title === "Portfolio or alert confidence regression"
            ? "/portfolio/import"
            : "/admin/payment-readiness",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Beta Triage", href: "/admin/beta-triage" },
            ]}
          />
          <Eyebrow>Issue sorting</Eyebrow>
          <SectionHeading
            title="Beta triage"
            description="This page turns early-user feedback into severity-based response rules so urgent trust breaks are handled before beta grows."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">P0 lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{triage.p0}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">P1 lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{triage.p1}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">P2 lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{triage.p2}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="beta triage rule"
              panelTitle="Write-through beta-triage action"
              panelDescription="Log beta-triage changes into the shared revision lane so severity posture stops living only as a static issue-sorting board."
              defaultRouteTarget="/admin/beta-triage"
              defaultOperator="Beta Triage Operator"
              defaultChangedFields="severity, owner, response_rule"
              actionNoun="beta-triage mutation"
            />
          </GlowCard>
          {triage.items.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.owner}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.trigger}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
                    Action: {item.action}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.severity}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
