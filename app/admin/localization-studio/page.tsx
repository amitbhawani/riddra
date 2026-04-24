import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  localizationStudioItems,
  localizationStudioRules,
  localizationStudioSummary,
} from "@/lib/localization-studio";

export const metadata: Metadata = {
  title: "Localization Studio",
  description:
    "Protected localization-studio page for multilingual content planning, creator-media adaptation, and translation workflow expansion.",
};

export default async function AdminLocalizationStudioPage() {
  await requireUser();
  const readinessItems = localizationStudioItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Multilingual content planning"
        ? "/admin/education-library"
        : item.title === "Creator-media adaptation"
          ? "/admin/creator-studio"
          : item.title === "Route and asset localization rules"
            ? "/admin/language-rollouts"
            : "/admin/distribution-ops",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Localization Studio", href: "/admin/localization-studio" },
            ]}
          />
          <Eyebrow>Language expansion</Eyebrow>
          <SectionHeading
            title="Localization studio"
            description="This page turns multilingual publishing into a real creator and editorial workflow instead of a vague future add-on."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Language tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{localizationStudioSummary.languageTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Media families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{localizationStudioSummary.mediaFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollout lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{localizationStudioSummary.rolloutLanes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="localization workflow"
              panelTitle="Write-through localization-studio action"
              panelDescription="Log multilingual planning and adaptation changes into the shared revision lane so localization posture stops living only as a future-facing planning desk."
              defaultRouteTarget="/admin/localization-studio"
              defaultOperator="Localization Studio Operator"
              defaultChangedFields="language_track, localization_rule, creator_media_posture"
              actionNoun="localization-studio mutation"
            />
          </GlowCard>
          {localizationStudioItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Localization rules</h2>
          <div className="mt-5 grid gap-3">
            {localizationStudioRules.map((rule) => (
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
