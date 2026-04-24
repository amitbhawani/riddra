import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";
import { requireOperator } from "@/lib/auth";
import { getAdminMembershipTiers, getAdminOperatorStore } from "@/lib/admin-operator-store";
import { searchAdminRecords } from "@/lib/admin-content-registry";
import { hasProductUserCapability } from "@/lib/product-permissions";
import { listMediaAssets, listUserProductProfiles } from "@/lib/user-product-store";

export const metadata: Metadata = {
  title: "Admin Search",
  description: "Search content, users, memberships, and media from one admin route.",
};

function includesQuery(value: string | null | undefined, query: string) {
  return String(value ?? "").toLowerCase().includes(query);
}

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const { role, capabilities } = await requireOperator();
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.query?.trim() ?? "";
  const lowered = query.toLowerCase();
  const store = await getAdminOperatorStore();
  const canSearchMedia = role === "admin" || hasProductUserCapability(role, capabilities, "can_manage_media");
  const canSearchMemberships =
    role === "admin" || hasProductUserCapability(role, capabilities, "can_manage_memberships");
  const canSearchUsers = role === "admin";

  const [contentResults, users, tiers, mediaAssets] = await Promise.all([
    query
      ? searchAdminRecords(query, store.records, {
          limit: 18,
          cacheKey: store.updatedAt,
        })
      : Promise.resolve([]),
    canSearchUsers && query ? listUserProductProfiles() : Promise.resolve([]),
    canSearchMemberships && query ? getAdminMembershipTiers() : Promise.resolve([]),
    canSearchMedia && query ? listMediaAssets() : Promise.resolve([]),
  ]);

  const userResults = users.filter((item) =>
    [item.name, item.email, item.username, item.membershipTier, item.role]
      .filter(Boolean)
      .some((value) => includesQuery(String(value), lowered)),
  );
  const tierResults = tiers.filter((item) =>
    [item.name, item.slug, item.description].some((value) => includesQuery(value, lowered)),
  );
  const mediaResults = mediaAssets.filter((item) =>
    [item.title, item.url, item.fileName, item.category, item.uploadedBy]
      .filter(Boolean)
      .some((value) => includesQuery(String(value), lowered)),
  );

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Search", href: "/admin/search" },
        ]}
        eyebrow="Search"
        title="Admin global search"
        description="Find content, users, memberships, and shared media without hopping between backend screens."
      />

      <AdminSectionCard
        title="Search everything you can access"
        description="Search results stay limited to the backend surfaces available for your current role."
      >
        <form action="/admin/search" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            name="query"
            defaultValue={query}
            placeholder={
              canSearchUsers
                ? "Search Tata Motors, amitbhawani, Pro Max, or support-banner"
                : canSearchMedia
                  ? "Search Tata Motors, cover image, or earnings banner"
                  : "Search title, slug, or symbol"
            }
            className="h-10 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af]"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white"
          >
            Search
          </button>
        </form>
      </AdminSectionCard>

      {query ? (
        <div className="grid gap-3">
          <AdminSectionCard
            title="Content"
            description="Content routes, editor records, and public pages."
          >
            {contentResults.length ? (
              <AdminSimpleTable
                columns={["Record", "Family", "Status", "Actions"]}
                rows={contentResults.map((row) => [
                  <div key={`${row.family}-${row.slug}`} className="space-y-1">
                    <p className="font-medium text-[#111827]">{row.title}</p>
                    <p className="text-[12px] text-[#6b7280]">
                      {row.slug}
                      {row.symbol ? ` · ${row.symbol}` : ""}
                    </p>
                  </div>,
                  row.familyLabel,
                  <AdminBadge key={`${row.slug}-state`} label={row.publishState.replaceAll("_", " ")} tone={row.publishState === "published" ? "success" : row.publishState === "ready_for_review" ? "warning" : row.publishState === "needs_fix" ? "danger" : "default"} />,
                  <div key={`${row.slug}-actions`} className="flex flex-wrap gap-2">
                    <AdminActionLink href={`/admin/content/${row.family}/${row.slug}`} label="Open editor" tone="primary" />
                    {row.publicHref ? <AdminActionLink href={row.publicHref} label="Open page" /> : null}
                  </div>,
                ])}
              />
            ) : (
              <p className="text-sm text-[#6b7280]">No content results matched this search.</p>
            )}
          </AdminSectionCard>

          {canSearchUsers ? (
            <AdminSectionCard
              title="Users"
              description="Profiles, usernames, roles, and membership tier assignments."
            >
              {userResults.length ? (
                <AdminSimpleTable
                  columns={["User", "Role", "Tier"]}
                  rows={userResults.map((item) => [
                    <div key={item.id} className="space-y-1">
                      <p className="font-medium text-[#111827]">{item.name}</p>
                      <p className="text-[12px] text-[#6b7280]">@{item.username} · {item.email}</p>
                    </div>,
                    item.role,
                    item.membershipTier || "free",
                  ])}
                />
              ) : (
                <p className="text-sm text-[#6b7280]">No users matched this search.</p>
              )}
            </AdminSectionCard>
          ) : null}

          {canSearchMemberships ? (
            <AdminSectionCard
              title="Memberships"
              description="Free, Pro, and Pro Max feature-access configuration."
            >
              {tierResults.length ? (
                <AdminSimpleTable
                  columns={["Tier", "Description", "Actions"]}
                  rows={tierResults.map((tier) => [
                    <div key={tier.slug} className="space-y-1">
                      <p className="font-medium text-[#111827]">{tier.name}</p>
                      <p className="text-[12px] text-[#6b7280]">{tier.slug}</p>
                    </div>,
                    tier.description,
                    <AdminActionLink key={`${tier.slug}-open`} href={`/admin/memberships/${tier.slug}`} label="Open tier" tone="primary" />,
                  ])}
                />
              ) : (
                <p className="text-sm text-[#6b7280]">No membership tiers matched this search.</p>
              )}
            </AdminSectionCard>
          ) : null}

          {canSearchMedia ? (
            <AdminSectionCard
              title="Media"
              description="Shared images and documents available to editors."
            >
              {mediaResults.length ? (
                <AdminSimpleTable
                  columns={["Asset", "Type", "Uploader", "Actions"]}
                  rows={mediaResults.map((asset) => [
                    <div key={asset.id} className="space-y-1">
                      <p className="font-medium text-[#111827]">{asset.title}</p>
                      <p className="text-[12px] text-[#6b7280]">{asset.fileName || asset.url}</p>
                    </div>,
                    asset.assetType,
                    asset.uploadedBy,
                    <AdminActionLink key={`${asset.id}-open`} href="/admin/media-library" label="Open media" tone="primary" />,
                  ])}
                />
              ) : (
                <p className="text-sm text-[#6b7280]">No media assets matched this search.</p>
              )}
            </AdminSectionCard>
          ) : null}
        </div>
      ) : null}
    </AdminPageFrame>
  );
}
