import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { EditorialWorkflowTransitionPanel } from "@/components/editorial-workflow-transition-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEditorialRevisionMemory } from "@/lib/editorial-revision-memory-store";
import {
  editorialWorkflowRules,
  editorialWorkflowSamples,
  editorialWorkflowSummary,
} from "@/lib/editorial-ops";

export const metadata: Metadata = {
  title: "Editorial Workflows",
  description: "Protected editorial-workflows page for assignment, review, and publish-queue visibility across CMS entities.",
};

export const dynamic = "force-dynamic";

export default async function EditorialWorkflowsPage() {
  await requireUser();
  const revisionMemory = await getEditorialRevisionMemory();
  const reviewQueue = revisionMemory.revisions.filter(
    (entry) => entry.revisionState === "Review ready" || entry.revisionState === "Rollback staged",
  );

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Editorial Workflows", href: "/admin/editorial-workflows" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Editorial backend</Eyebrow>
          <SectionHeading
            title="Editorial workflows"
            description="This queue models how manual blocks, announcements, and documents should move through assignment, review, and publish states before large-scale CMS editing goes live."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Drafts</p>
            <p className="mt-2 text-3xl font-semibold text-white">{editorialWorkflowSummary.drafts}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{editorialWorkflowSummary.inReview}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Publish ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">{editorialWorkflowSummary.publishReady}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Logged revisions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.loggedRevisions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollback-ready assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.rollbackReadyAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review-ready changes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.reviewReadyChanges}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Workflow queue</h2>
          <div className="mt-5 grid gap-4">
            {editorialWorkflowSamples.map((item) => (
              <div key={`${item.entityType}-${item.entityLabel}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.entityLabel}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.entityType} · due {item.dueAt}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.workflowState}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <p className="mt-2 text-xs text-mist/60">
                  Assigned to {item.assignedTo} · Reviewer {item.reviewer}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>

        <EditorialWorkflowTransitionPanel items={editorialWorkflowSamples} />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Write-through revision queue</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {reviewQueue.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{entry.asset}</h3>
                    <p className="mt-2 text-sm text-mist/66">{entry.changedFields}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {entry.revisionState}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{entry.reason}</p>
                <p className="mt-2 text-xs text-mist/60">
                  {entry.editor} · {entry.time} · target {entry.routeTarget}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Workflow rules</h2>
          <div className="mt-5 grid gap-3">
            {editorialWorkflowRules.map((rule) => (
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
