import type { Metadata } from "next";

import { AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import {
  AdminActionLink,
  AdminBadge,
  AdminEmptyState,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";
import { getAllAdminRows } from "@/lib/admin-content-registry";
import {
  type AdminMembershipTier,
  getAdminMembershipTiers,
  getAdminOperatorStore,
} from "@/lib/admin-operator-store";
import { allMembershipFeatureKeys } from "@/lib/membership-product-features";
import { formatAdminDateTime } from "@/lib/admin-time";

export const metadata: Metadata = {
  title: "Memberships",
  description: "Manage membership tiers, access posture, and content coverage for future paid or gated surfaces.",
};

function parseTokens(value: string[]) {
  return value.map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function matchesRecordToken(tokens: string[], row: Awaited<ReturnType<typeof getAllAdminRows>>[number]) {
  const slugToken = row.slug.toLowerCase();
  const familyToken = `${row.family}:${row.slug}`.toLowerCase();
  const routeToken = row.publicHref?.toLowerCase();
  return tokens.some((token) => token === slugToken || token === familyToken || token === routeToken);
}

function tierCanAccessCount(
  rows: Awaited<ReturnType<typeof getAllAdminRows>>,
  tier: AdminMembershipTier,
) {
  const normalizedTier = tier.slug.trim().toLowerCase();
  const includedTokens = parseTokens(tier.includedRecords);
  const excludedTokens = parseTokens(tier.excludedRecords);
  return rows.filter((row) => {
    if (matchesRecordToken(excludedTokens, row)) {
      return false;
    }

    if (matchesRecordToken(includedTokens, row)) {
      return true;
    }

    if (tier.includedFamilies.includes(row.family)) {
      return true;
    }

    if (row.accessMode === "membership_tiers") {
      return row.allowedMembershipTiers.some((allowedTier) => allowedTier.toLowerCase() === normalizedTier);
    }

    return row.accessMode === "public_free" || row.accessMode === "logged_in_free_member";
  }).length;
}

export default async function AdminMembershipsPage() {
  const [store, tiers] = await Promise.all([
    getAdminOperatorStore(),
    getAdminMembershipTiers(),
  ]);
  const allRows = await getAllAdminRows(store.records, {
    cacheKey: store.updatedAt,
  });

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Memberships", href: "/admin/memberships" },
        ]}
        eyebrow="Memberships"
        title="Membership and access plans"
        description="Manage the fixed Free, Pro, and Pro Max plans that power member-facing feature access."
      />

      <AdminStorageStatusCard scope="membership tiers and access plans" />

      <AdminSectionCard
        title="Tier registry"
        description="Each tier now leads with member-facing feature access, while the family and record rules stay available for deeper exceptions."
      >
        {tiers.length ? (
          <AdminSimpleTable
            columns={["Tier", "Status", "Visibility", "Coverage", "Accessible preview", "Updated", "Actions"]}
            rows={tiers.map((tier) => [
              <div key={tier.slug} className="space-y-1">
                <p className="font-semibold text-[#111827]">{tier.name}</p>
                <p className="text-xs leading-5 text-[#6b7280]">{tier.slug}</p>
              </div>,
              <AdminBadge
                key={`${tier.slug}-status`}
                label={tier.status}
                tone={tier.status === "active" ? "success" : "default"}
              />,
              <AdminBadge
                key={`${tier.slug}-visibility`}
                label={tier.visibility}
                tone={tier.visibility === "public" ? "info" : "default"}
              />,
                <div key={`${tier.slug}-coverage`} className="space-y-1">
                  <p className="text-[13px] text-[#111827]">
                    {allMembershipFeatureKeys.filter((feature) => tier.featureAccess[feature]).length} product features on
                  </p>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    Families {tier.includedFamilies.length} • Includes {tier.includedRecords.length} • Excludes {tier.excludedRecords.length}
                  </p>
                </div>,
              <div key={`${tier.slug}-preview`} className="space-y-1">
                <p className="text-[13px] text-[#111827]">
                  {tierCanAccessCount(allRows, tier)} records
                </p>
                <p className="text-xs leading-5 text-[#6b7280]">
                  CTA {tier.ctaLabel || "Not set"}
                </p>
              </div>,
              <div key={`${tier.slug}-updated`} className="space-y-1">
                <p className="text-[13px] text-[#111827]">{formatAdminDateTime(tier.updatedAt)}</p>
                <p className="text-xs leading-5 text-[#6b7280]">Last operator save</p>
              </div>,
              <div key={`${tier.slug}-actions`} className="flex flex-wrap gap-2">
                <AdminActionLink href={`/admin/memberships/${tier.slug}`} label="Edit tier" tone="primary" />
              </div>,
            ])}
          />
        ) : (
          <AdminEmptyState
            title="No membership tiers yet"
            description="Create the first tier so courses, webinars, learn articles, research, and gated surfaces can attach future access rules without another CMS rebuild."
            action={<AdminActionLink href="/admin/memberships/new" label="Create first tier" tone="primary" />}
          />
        )}
      </AdminSectionCard>
    </AdminPageFrame>
  );
}
