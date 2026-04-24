import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBetaFeedbackDesk } from "@/lib/beta-feedback";

export const metadata: Metadata = {
  title: "Beta Feedback",
  description:
    "Protected beta-feedback page for organizing early-user feedback across auth, trust copy, portfolio confidence, and premium positioning.",
};

export default async function AdminBetaFeedbackPage() {
  await requireUser();

  const desk = getBetaFeedbackDesk();
  const readinessItems = desk.lanes.map((lane) => ({
    label: lane.title,
    status:
      lane.priority === "Critical" ? "Needs verification" : lane.priority === "High" ? "In progress" : "Queued",
    detail: `${lane.source} · ${lane.summary} Next action: ${lane.nextAction}`,
    routeTarget:
      lane.title === "Auth friction and callback failures"
        ? "/admin/auth-activation"
        : lane.title === "Trust copy and public clarity"
          ? "/admin/trust-signoff"
          : lane.title === "Portfolio and alert confidence gaps"
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
              { name: "Beta Feedback", href: "/admin/beta-feedback" },
            ]}
          />
          <Eyebrow>Iteration desk</Eyebrow>
          <SectionHeading
            title="Beta feedback"
            description="This page keeps early-user issues organized by trust impact so the team knows what must be fixed before beta expands."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Critical lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{desk.critical}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">High lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{desk.high}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Medium lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{desk.medium}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="beta feedback lane"
              panelTitle="Write-through beta-feedback action"
              panelDescription="Log early-user feedback changes into the shared revision lane so beta-learning posture stops living only as a static feedback desk."
              defaultRouteTarget="/admin/beta-feedback"
              defaultOperator="Beta Feedback Operator"
              defaultChangedFields="feedback_lane, trust_priority, next_action"
              actionNoun="beta-feedback mutation"
            />
          </GlowCard>
          {desk.lanes.map((lane) => (
            <GlowCard key={lane.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/60">{lane.source}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{lane.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{lane.summary}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
                    Next action: {lane.nextAction}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {lane.priority}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
