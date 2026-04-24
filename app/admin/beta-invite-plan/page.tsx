import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBetaInvitePlan } from "@/lib/beta-invite-plan";

export const metadata: Metadata = {
  title: "Beta Invite Plan",
  description:
    "Protected beta-invite-plan page for deciding how beta access should widen without outrunning support, trust, and operational control.",
};

export default async function AdminBetaInvitePlanPage() {
  await requireUser();

  const plan = getBetaInvitePlan();
  const readinessItems = plan.segments.map((segment, index) => ({
    label: segment.name,
    status: index === 0 ? "In progress" : "Queued",
    detail: `${segment.size} · ${segment.goal} Success signal: ${segment.successSignal}`,
    routeTarget: index === 0 ? "/admin/beta-feedback" : "/admin/beta-command-center",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Beta Invite Plan", href: "/admin/beta-invite-plan" },
            ]}
          />
          <Eyebrow>Expansion control</Eyebrow>
          <SectionHeading
            title="Beta invite plan"
            description="This page helps the team widen beta access in deliberate stages so trust-sensitive problems are fixed before the audience gets larger."
          />
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="beta invite segment"
              panelTitle="Write-through beta-invite action"
              panelDescription="Log invite-wave changes into the shared revision lane so beta expansion posture stops living only as a staged invite memo."
              defaultRouteTarget="/admin/beta-invite-plan"
              defaultOperator="Beta Invite Operator"
              defaultChangedFields="invite_wave, audience_size, expansion_gate"
              actionNoun="beta-invite mutation"
            />
          </GlowCard>
          {plan.segments.map((segment) => (
            <GlowCard key={segment.name}>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.16em] text-mist/60">{segment.size}</p>
                <h2 className="text-2xl font-semibold text-white">{segment.name}</h2>
                <p className="text-sm leading-7 text-mist/74">{segment.goal}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-mist/58">
                  Success signal: {segment.successSignal}
                </p>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Expansion guardrails</h2>
          <div className="mt-5 grid gap-3">
            {plan.guardrails.map((guardrail) => (
              <div
                key={guardrail}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {guardrail}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
