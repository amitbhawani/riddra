import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminGuidanceCard, AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminRecordEditorClient } from "@/components/admin/admin-record-editor-client";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { getActivePendingApprovalForRecord } from "@/lib/admin-approvals";
import {
  adminFamilyMeta,
  getAdminRecordEditorData,
  type AdminFamilyKey,
} from "@/lib/admin-content-registry";
import { requireOperator } from "@/lib/auth";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { hasProductUserCapability } from "@/lib/product-permissions";
import {
  getCmsRecordVersions,
  getLatestCmsPreviewSessionForRecord,
  listMediaAssets,
} from "@/lib/user-product-store";

type Params = Promise<{ family: string; slug: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { family, slug } = await params;
  const typedFamily = family as AdminFamilyKey;
  const meta = adminFamilyMeta[typedFamily];

  return {
    title: meta ? `${meta.singular} · ${slug}` : slug,
  };
}

export default async function AdminRecordEditorPage({
  params,
}: {
  params: Params;
}) {
  const { family, slug } = await params;
  const typedFamily = family as AdminFamilyKey;
  const { user, role, capabilities } = await requireOperator();

  if (!adminFamilyMeta[typedFamily]) {
    notFound();
  }

  const store = await getAdminOperatorStore();
  const record =
    store.records.find(
      (item) => item.family === typedFamily && item.slug === slug.toLowerCase(),
    ) ?? null;
  const editor = await getAdminRecordEditorData(typedFamily, slug, record);

  if (!editor.title && !record) {
    notFound();
  }

  const revisions = store.revisions.filter(
    (revision) => revision.family === typedFamily && revision.slug === editor.slug,
  );
  const [versions, mediaAssets, activePreview, pendingApproval] = await Promise.all([
    getCmsRecordVersions(typedFamily, editor.slug, 50),
    listMediaAssets(),
    getLatestCmsPreviewSessionForRecord(typedFamily, editor.slug),
    role === "editor" && user.email
      ? getActivePendingApprovalForRecord(typedFamily, editor.slug, user.email)
      : Promise.resolve(null),
  ]);
  const editorWithRevisionCount = {
    ...editor,
    revisionCount: revisions.length,
  };

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: adminFamilyMeta[typedFamily].label, href: `/admin/content/${typedFamily}` },
          { label: editor.title || editor.slug, href: `/admin/content/${typedFamily}/${editor.slug}` },
        ]}
        eyebrow="Record editor"
        title={editor.title || adminFamilyMeta[typedFamily].singular}
        description={`Manage every meaningful frontend-visible field for this ${adminFamilyMeta[typedFamily].singular} without dropping into raw JSON.`}
      />

      <AdminGuidanceCard
        title="How this editor works"
        description="This editor is arranged to match the public page flow, then the deeper operator controls."
        items={[
          "Source versus manual: source-backed values come from the data lane, while manual values let an operator override or lock what appears on the frontend.",
          "Preview versus live: preview creates a temporary draft route and never changes the live public page by itself.",
          role === "admin"
            ? "Publish, schedule, and archive: publish sends the saved state live, scheduling sets a timed future change, and archive removes the record from the active publishing flow."
            : "Approval workflow: your saves stay in the approval queue until an admin approves them, so the live page is never overwritten directly from an editor session.",
        ]}
        links={[
          { href: "/admin/help", label: "Help", tone: "primary" },
          { href: "/admin/activity-log", label: "Activity log" },
        ]}
      />

      <AdminRecordEditorClient
        record={editorWithRevisionCount}
        importHistory={record?.imports ?? []}
        revisions={revisions}
        versions={versions}
        mediaAssets={mediaAssets}
        activePreview={activePreview}
        pendingApproval={pendingApproval}
        currentUserEmail={user.email ?? ""}
        permissions={{
          canPublishContent: hasProductUserCapability(role, capabilities, "can_publish_content"),
          isAdmin: role === "admin",
        }}
      />

      <AdminStorageStatusCard scope={`${adminFamilyMeta[typedFamily].label.toLowerCase()} editing`} />
    </AdminPageFrame>
  );
}
