import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminMembershipEditorClient } from "@/components/admin/admin-membership-editor-client";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { getAllAdminRows } from "@/lib/admin-content-registry";
import { getAdminMembershipTier, getAdminOperatorStore } from "@/lib/admin-operator-store";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug,
  };
}

export default async function AdminMembershipEditorPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const [tier, store] = await Promise.all([
    getAdminMembershipTier(slug),
    getAdminOperatorStore(),
  ]);

  if (!tier) {
    notFound();
  }

  const allRows = await getAllAdminRows(store.records, {
    cacheKey: store.updatedAt,
  });

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Memberships", href: "/admin/memberships" },
          { label: tier.name, href: `/admin/memberships/${tier.slug}` },
        ]}
        eyebrow="Memberships"
        title={tier.name}
        description="Manage tier access coverage, CTA posture, and future-ready gating rules from one operator screen."
      />

      <AdminMembershipEditorClient tier={tier} allRows={allRows} />

      <AdminStorageStatusCard scope="membership tier editing" />
    </AdminPageFrame>
  );
}
