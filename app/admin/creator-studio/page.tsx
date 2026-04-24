import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { creatorStudioPipelines, creatorStudioRules, creatorStudioSummary } from "@/lib/creator-studio";

export const metadata: Metadata = {
  title: "Creator Studio",
  description: "Protected creator-studio page for video embeds, course media, webinar repurposing, and distribution-ready publishing workflow.",
};

export default async function CreatorStudioPage() {
  await requireUser();

  const readinessItems = creatorStudioPipelines.map((pipeline) => ({
    label: pipeline.title,
    status: pipeline.status === "In progress" ? "Needs verification" : "Queued",
    detail: pipeline.summary,
    routeTarget:
      pipeline.title === "Learn article to video embed"
        ? "/learn"
        : pipeline.title === "Course bundle launch assets"
          ? "/courses"
          : pipeline.title === "Webinar to replay and article"
            ? "/webinars"
            : "/newsletter",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Creator Studio", href: "/admin/creator-studio" }]} />
          <Eyebrow>Creator operations</Eyebrow>
          <SectionHeading
            title="Creator studio"
            description="This page tracks how your future videos, course assets, webinar replays, and newsletter-ready media should flow through the platform instead of being uploaded ad hoc."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active pipelines</p>
            <p className="mt-2 text-3xl font-semibold text-white">{creatorStudioSummary.activePipelines}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Repurposing modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{creatorStudioSummary.repurposingModes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked by media assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{creatorStudioSummary.blockedByMediaAssets}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="creator studio pipeline"
              panelTitle="Write-through creator-studio action"
              panelDescription="Log creator-media and publishing pipeline changes into the shared revision lane so creator ops stop living only as pipeline notes."
              defaultRouteTarget="/admin/creator-studio"
              defaultOperator="Creator Studio Operator"
              defaultChangedFields="media_pipeline, publish_target, repurposing_rule"
              actionNoun="creator-studio mutation"
            />
          </GlowCard>
          {creatorStudioPipelines.map((pipeline) => (
            <GlowCard key={pipeline.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{pipeline.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{pipeline.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {pipeline.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Creator route families now live</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {[
              "/learn and /learn/[slug]",
              "/courses and /courses/[slug]",
              "/webinars and /webinars/[slug]",
              "/newsletter and /newsletter/[slug]",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Creator rules</h2>
          <div className="mt-5 grid gap-3">
            {creatorStudioRules.map((rule) => (
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
