import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";
import { adminContentFamilies } from "@/lib/admin-navigation";
import {
  adminFamilyMeta,
  getAdminFamilyRows,
  searchAdminRecords,
  type AdminFamilyKey,
} from "@/lib/admin-content-registry";
import { requireOperator } from "@/lib/auth";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { canAccessAnyContentWorkspace, canEditAdminFamily } from "@/lib/product-permissions";

export const metadata: Metadata = {
  title: "Content Workspace",
  description: "Family-by-family operator workspace for stocks, funds, indices, wealth products, education, and publishing surfaces.",
};

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const store = await getAdminOperatorStore();
  const { role, capabilities } = await requireOperator();
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.query?.trim() ?? "";
  const families = adminContentFamilies.filter(
    (item): item is (typeof adminContentFamilies)[number] & { href: `/admin/content/${AdminFamilyKey}` } =>
      item.href.startsWith("/admin/content/") &&
      canEditAdminFamily(role, capabilities, item.family),
  );
  const counts = await Promise.all(
    families.map(async (item) => {
      const family = item.href.replace("/admin/content/", "") as AdminFamilyKey;
      const rows = await getAdminFamilyRows(family, store.records, {
        cacheKey: store.updatedAt,
      });
      const summary = rows.reduce(
        (result, row) => {
          result.overrides += row.overrideIndicator !== "none" ? 1 : 0;
          result.reviews += row.publishState === "ready_for_review" || row.publishState === "needs_fix" ? 1 : 0;
          return result;
        },
        { overrides: 0, reviews: 0 },
      );
      return {
        family,
        total: rows.length,
        overrides: summary.overrides,
        reviews: summary.reviews,
      };
    }),
  );
  const searchResults = query
    ? await searchAdminRecords(query, store.records, {
        limit: 24,
        cacheKey: store.updatedAt,
      }).then((rows) => rows.filter((row) => canEditAdminFamily(role, capabilities, row.family)))
    : [];

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
        ]}
        eyebrow="Content"
        title="Content workspace"
        description="Searchable, family-specific list views and editors for every major public route family."
        actions={
          canAccessAnyContentWorkspace(role, capabilities) ? (
            <AdminActionLink href="/admin/new" label="New" tone="primary" />
          ) : undefined
        }
      />

      <AdminSectionCard
        title="Cross-family admin search"
        description="Search across stocks, funds, indices, wealth products, editorial routes, and newsletter surfaces from one operator result set."
      >
        <form action="/admin/content" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
              Search all content families
            </span>
            <input
              name="query"
              defaultValue={query}
              placeholder="Search Tata Motors, nifty50, NIFTYBEES, investor-weekly..."
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white transition hover:bg-[#111c33]"
            >
              Search
            </button>
          </div>
        </form>

        {query ? (
          searchResults.length ? (
            <AdminSimpleTable
              columns={["Record", "Family", "Status", "Access", "Source", "Refresh", "Actions"]}
              rows={searchResults.map((row) => [
                <div key={`${row.family}-${row.slug}`} className="space-y-1">
                  <p className="font-semibold text-[#111827]">{row.title}</p>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {row.slug}
                    {row.symbol ? ` • ${row.symbol}` : ""}
                  </p>
                </div>,
                row.familyLabel,
                <AdminBadge
                  key={`${row.slug}-status`}
                  label={row.publishState.replaceAll("_", " ")}
                  tone={
                    row.publishState === "published"
                      ? "success"
                      : row.publishState === "ready_for_review"
                        ? "warning"
                        : row.publishState === "needs_fix"
                          ? "danger"
                        : "default"
                  }
                />,
                <div key={`${row.slug}-access`} className="space-y-1">
                  <AdminBadge
                    label={row.accessLabel}
                    tone={
                      row.accessMode === "public_free"
                        ? "success"
                        : row.accessMode === "membership_tiers"
                          ? "warning"
                          : row.accessMode === "hidden_internal"
                            ? "default"
                            : "info"
                    }
                  />
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {row.accessDetail || (row.requireLogin ? "Login required" : "Open access")}
                  </p>
                </div>,
                <div key={`${row.slug}-source`} className="space-y-1">
                  <p className="text-[13px] text-[#111827]">{row.truthLabel}</p>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {row.sourceLabel || "Awaiting source label"}
                  </p>
                </div>,
                <div key={`${row.slug}-refresh`} className="space-y-1">
                  <AdminBadge
                    label={row.refreshHealth.replaceAll("_", " ")}
                    tone={
                      row.refreshHealth === "healthy"
                        ? "success"
                        : row.refreshHealth === "failed"
                          ? "danger"
                          : row.refreshHealth === "warning"
                            ? "warning"
                            : "info"
                    }
                  />
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {row.nextRefreshAt || "No scheduled run recorded"}
                  </p>
                </div>,
                <div key={`${row.slug}-actions`} className="flex flex-wrap gap-2">
                  <AdminActionLink href={`/admin/content/${row.family}/${row.slug}`} label="Open editor" tone="primary" />
                  {row.publicHref ? <AdminActionLink href={row.publicHref} label="Open page" /> : null}
                </div>,
              ])}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-[#d1d5db] bg-[#f8fafc] px-[14px] py-4">
              <h3 className="text-[14px] font-semibold text-[#111827]">No records matched</h3>
              <p className="mt-1 text-sm leading-5 text-[#4b5563]">
                Try a title, slug, or symbol. Exact matches are prioritized across every content family.
              </p>
            </div>
          )
        ) : null}
      </AdminSectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {counts.map((item) => {
          const meta = adminFamilyMeta[item.family];

          return (
            <AdminSectionCard
              key={item.family}
              title={meta.label}
              description={meta.description}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Records" value={String(item.total)} />
                <Metric label="Manual changes" value={String(item.overrides)} />
                <Metric label="Review queue" value={String(item.reviews)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminActionLink href={`/admin/content/${item.family}`} label={`Open ${meta.label}`} tone="primary" />
                <AdminActionLink href={`/admin/content/${item.family}/new`} label={`Create new ${meta.singular}`} />
              </div>
            </AdminSectionCard>
          );
        })}
      </div>
    </AdminPageFrame>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
