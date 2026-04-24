import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { submitOperatorCmsRecordAction } from "@/app/admin/cms/actions";
import { OperatorCmsConfirmPostForm } from "@/components/operator-cms-confirm-post-form";
import { OperatorCmsRecordForm } from "@/components/operator-cms-record-form";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  getOperatorCmsRecordEditorData,
  getOperatorCmsWorkflowActionDescriptors,
} from "@/lib/operator-cms-mutations";

type PageProps = {
  params: Promise<{ entityType: string; recordId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType, recordId } = await params;

  return {
    title: `${entityType} CMS record`,
    description: `Edit CMS record ${recordId} inside the protected operator backend.`,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function AdminCmsRecordPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const { entityType, recordId } = await params;
  const messages = await searchParams;
  const data = await getOperatorCmsRecordEditorData({ entityType, recordId });

  if (!data.entity || !data.config) {
    notFound();
  }

  if (data.schemaReady && !data.record) {
    notFound();
  }

  const record = data.record;
  const returnTo = `/admin/cms/${entityType}/${recordId}`;
  const workflowActions = record
    ? getOperatorCmsWorkflowActionDescriptors({
        workflowState: record.workflowState,
        verificationState: record.verificationState,
      })
    : [];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{data.entity.label}</Eyebrow>
            <Link
              href={`/admin/cms/${entityType}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-mist/74 transition hover:text-white"
            >
              Back to section
            </Link>
          </div>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {record?.title ?? data.entity.label}
          </h1>
          <p className="max-w-4xl text-base leading-8 text-mist/76">
            Edit the durable CMS record, move it through workflow safely, and roll back to a prior
            revision if needed.
          </p>
        </div>

        {messages.success ? (
          <GlowCard className="border-emerald-500/25 bg-emerald-500/10">
            <p className="text-sm leading-7 text-emerald-50/95">{messages.success}</p>
          </GlowCard>
        ) : null}

        {messages.error ? (
          <GlowCard className="border-rose-500/25 bg-rose-500/10">
            <p className="text-sm leading-7 text-rose-50/95">{messages.error}</p>
          </GlowCard>
        ) : null}

        {!data.schemaReady ? (
          <GlowCard className="border-amber-500/25 bg-amber-500/10">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Schema required</p>
            <p className="mt-3 text-sm leading-7 text-amber-50/90">{data.schemaError}</p>
          </GlowCard>
        ) : (
          <>
            {record ? (
              <div className="grid gap-6 xl:grid-cols-4">
                <GlowCard>
                  <p className="text-sm text-mist/68">Workflow</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {record.workflowState.replaceAll("_", " ")}
                  </p>
                </GlowCard>
                <GlowCard>
                  <p className="text-sm text-mist/68">Verification</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {record.verificationState.replaceAll("_", " ")}
                  </p>
                </GlowCard>
                <GlowCard>
                  <p className="text-sm text-mist/68">Visibility</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{record.publicationVisibility}</p>
                </GlowCard>
                <GlowCard>
                  <p className="text-sm text-mist/68">Last updated</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDateTime(record.updatedAt)}</p>
                </GlowCard>
              </div>
            ) : null}

            {record && record.workflowState === "approved" && record.verificationState !== "verified" ? (
              <GlowCard className="border-amber-500/25 bg-amber-500/10">
                <p className="text-sm leading-7 text-amber-50/95">
                  Publish is currently blocked. This record must be moved to the{" "}
                  <span className="font-semibold text-white">verified</span> verification state before
                  it can be published.
                </p>
              </GlowCard>
            ) : null}

            <GlowCard className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Editor</h2>
                <p className="mt-3 text-sm leading-7 text-mist/74">
                  Update the durable record safely. Save keeps the current workflow state, while the
                  dedicated workflow actions below handle approval, publish, reject, archive, and
                  unpublish.
                </p>
              </div>
              <OperatorCmsRecordForm
                action={submitOperatorCmsRecordAction}
                config={data.config}
                entityLabel={data.entity.label}
                entityType={data.entity.code}
                record={record}
              />
            </GlowCard>

            {record ? (
              <GlowCard className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Workflow actions</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">
                    These actions are operator-only and create revision snapshots automatically.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {workflowActions.length ? (
                    workflowActions.map((item) => (
                      <OperatorCmsConfirmPostForm
                        key={item.action}
                        action={`/api/admin/cms/records/${record.id}/workflow`}
                        compact={false}
                        confirmMessage={item.confirmMessage}
                        fields={{
                          action: item.action,
                          returnTo,
                        }}
                        label={item.label}
                        tone={item.tone}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/74">
                      No direct workflow actions are available from the current state.
                    </div>
                  )}
                </div>
              </GlowCard>
            ) : null}

            <GlowCard className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">Revision history</h2>
                <p className="mt-3 text-sm leading-7 text-mist/74">
                  Every meaningful edit and workflow change creates a durable revision snapshot that
                  can be rolled back.
                </p>
              </div>
              <div className="grid gap-3">
                {data.revisions.length ? (
                  data.revisions.map((revision) => (
                    <div
                      key={revision.id}
                      className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-black/15 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          Revision #{revision.revisionNumber}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-mist/60">
                          {formatDateTime(revision.createdAt)}
                          {revision.changedBy ? ` · ${revision.changedBy}` : ""}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-mist/74">{revision.changeSummary}</p>
                      </div>
                      <OperatorCmsConfirmPostForm
                        action={`/api/admin/cms/records/${recordId}/rollback`}
                        compact
                        confirmMessage={`Roll this record back to revision #${revision.revisionNumber}? The current state will be replaced with that snapshot.`}
                        fields={{
                          revisionId: revision.id,
                          returnTo,
                        }}
                        label="Rollback"
                        tone="secondary"
                      />
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/72">
                    No revision snapshots are recorded yet.
                  </div>
                )}
              </div>
            </GlowCard>
          </>
        )}
      </Container>
    </div>
  );
}
