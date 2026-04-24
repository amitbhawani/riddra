import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { betaGateItems, betaGateRules, betaGateSummary } from "@/lib/beta-gate";

export const metadata: Metadata = {
  title: "Beta Gate",
  description:
    "Protected beta-gate page for deciding which surfaces are safe for a controlled public beta and which should stay restricted.",
};

export default async function AdminBetaGatePage() {
  await requireUser();

  const readinessItems = betaGateItems.map((item) => ({
    label: item.title,
    status:
      item.status === "Public beta ready"
        ? "Ready"
        : item.status === "Restrict until verified"
          ? "Needs verification"
          : "Internal only",
    detail: `${item.area} · ${item.summary}`,
    routeTarget:
      item.area === "Revenue"
        ? "/admin/payment-readiness"
        : item.area === "Signed-in"
          ? "/admin/subscriber-launch-readiness"
          : item.area === "Premium"
            ? "/admin/beta-gate"
            : item.area === "Ops"
              ? "/admin/launch-control"
              : "/build-tracker",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Beta Gate", href: "/admin/beta-gate" },
            ]}
          />
          <Eyebrow>Controlled exposure</Eyebrow>
          <SectionHeading
            title="Beta gate"
            description="This page keeps the first public beta disciplined by separating what can be shown confidently from what should stay restricted until activation and trust are stronger."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Public tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{betaGateSummary.publicTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Restricted tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{betaGateSummary.restrictedTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Operator checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{betaGateSummary.operatorChecks}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="beta gate track"
              panelTitle="Write-through beta-gate action"
              panelDescription="Log beta-gate changes into the shared revision lane so invite-scope posture stops living only as a static exposure checklist."
              defaultRouteTarget="/admin/beta-gate"
              defaultOperator="Beta Gate Operator"
              defaultChangedFields="beta_scope, trust_posture, exposure_rule"
              actionNoun="beta-gate mutation"
            />
          </GlowCard>
          {betaGateItems.map((item) => (
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
                  <div className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.area}</div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Beta rules</h2>
          <div className="mt-5 grid gap-3">
            {betaGateRules.map((rule) => (
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
