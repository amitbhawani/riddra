import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLearningPaths } from "@/lib/learn";

export const metadata: Metadata = {
  title: "Learning Paths",
  description: "Protected learning-paths surface for persona tracks, sequencing, and education-product depth.",
};

export default async function LearningPathsPage() {
  await requireUser();
  const learningPaths = await getLearningPaths();
  const readinessItems = learningPaths.map((path) => ({
    label: path.title,
    status: "Needs verification",
    detail: `${path.audience} · ${path.summary}`,
    routeTarget: `/learn/tracks/${path.slug}`,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Learning Paths", href: "/admin/learning-paths" },
            ]}
          />
          <Eyebrow>Education sequencing</Eyebrow>
          <SectionHeading
            title="Learning paths"
            description="Phase 16 should make education feel like a real product system. This page tracks how beginner, trader, and wealth-builder users move through the platform instead of landing on isolated article cards."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="learning path"
              panelTitle="Write-through learning-path action"
              panelDescription="Log persona-track sequencing changes into the shared revision lane so learning progression stops living only as a static education map."
              defaultRouteTarget="/admin/learning-paths"
              defaultOperator="Learning Path Operator"
              defaultChangedFields="persona_track, sequencing, route_handoff"
              actionNoun="learning-path mutation"
            />
          </GlowCard>
          {learningPaths.map((path) => (
            <GlowCard key={path.title}>
              <p className="text-xs uppercase tracking-[0.18em] text-mist/58">{path.audience}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{path.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{path.summary}</p>
              <div className="mt-5 grid gap-3">
                {path.steps.map((step) => (
                  <div key={step} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {step}
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
