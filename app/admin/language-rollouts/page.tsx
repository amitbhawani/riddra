import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  languageRolloutItems,
  languageRolloutRules,
  languageRolloutSummary,
} from "@/lib/language-rollouts";

export const metadata: Metadata = {
  title: "Language Rollouts",
  description:
    "Protected language-rollouts page for multilingual sequencing, asset versioning, review checkpoints, and distribution-aware localization planning.",
};

export default async function AdminLanguageRolloutsPage() {
  await requireUser();
  const readinessItems = languageRolloutItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Priority language sequencing"
        ? "/admin/localization-studio"
        : item.title === "Asset-version control"
          ? "/admin/media-library"
          : item.title === "Review and publish checkpoints"
            ? "/admin/editorial-workflows"
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
              { name: "Language Rollouts", href: "/admin/language-rollouts" },
            ]}
          />
          <Eyebrow>Localization delivery</Eyebrow>
          <SectionHeading
            title="Language rollouts"
            description="This page turns multilingual growth into a managed rollout plan instead of a vague intention to translate later."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Rollout tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{languageRolloutSummary.rolloutTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Asset classes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{languageRolloutSummary.assetClasses}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review stages</p>
            <p className="mt-2 text-3xl font-semibold text-white">{languageRolloutSummary.reviewStages}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="language rollout"
              panelTitle="Write-through language-rollout action"
              panelDescription="Log sequencing and localization-delivery changes into the shared revision lane so multilingual rollout work stops living only as a static planning board."
              defaultRouteTarget="/admin/language-rollouts"
              defaultOperator="Language Rollout Operator"
              defaultChangedFields="rollout_track, review_checkpoint, distribution_locale"
              actionNoun="language-rollout mutation"
            />
          </GlowCard>
          {languageRolloutItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Language rollout rules</h2>
          <div className="mt-5 grid gap-3">
            {languageRolloutRules.map((rule) => (
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
