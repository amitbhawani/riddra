import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchDecisionRevisionPanel } from "@/components/launch-decision-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchDecision } from "@/lib/launch-decision";

export const metadata: Metadata = {
  title: "Launch Decision",
  description:
    "Protected launch-decision page for deciding the highest safe launch mode based on actual blockers instead of optimism.",
};

export default async function AdminLaunchDecisionPage() {
  await requireUser();

  const decision = getLaunchDecision();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Decision", href: "/admin/launch-decision" },
            ]}
          />
          <Eyebrow>Go-live judgment</Eyebrow>
          <SectionHeading
            title="Launch decision"
            description="This page tells the team the highest safe launch mode the platform can claim right now, based on resolved and unresolved blockers."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Recommended mode</p>
            <p className="mt-2 text-3xl font-semibold text-white">{decision.recommendedLabel}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Resolved blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{decision.resolvedCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Still blocking</p>
            <p className="mt-2 text-3xl font-semibold text-white">{decision.blockingCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {decision.blockers.map((blocker) => (
            <GlowCard key={blocker.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{blocker.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{blocker.detail}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
                    Required for: {blocker.requiredFor.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {blocker.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <LaunchDecisionRevisionPanel items={decision.blockers} />
      </Container>
    </div>
  );
}
