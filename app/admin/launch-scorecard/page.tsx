import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchScorecardRevisionPanel } from "@/components/launch-scorecard-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchScorecard } from "@/lib/launch-scorecard";

export const metadata: Metadata = {
  title: "Launch Scorecard",
  description:
    "Protected launch-scorecard page for a quick read on launch readiness across envs, support, payments, AI, and release posture.",
};

export default async function AdminLaunchScorecardPage() {
  await requireUser();

  const scorecard = getLaunchScorecard();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Scorecard", href: "/admin/launch-scorecard" },
            ]}
          />
          <Eyebrow>Launch snapshot</Eyebrow>
          <SectionHeading
            title="Launch scorecard"
            description="This page gives the team a fast readiness read across critical envs, support setup, payments, optional AI, and current launch posture."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Readiness</p>
            <p className="mt-2 text-3xl font-semibold text-white">{scorecard.percentage}%</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{scorecard.readyCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{scorecard.blockedCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {scorecard.items.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <LaunchScorecardRevisionPanel items={scorecard.items} />
      </Container>
    </div>
  );
}
