import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminEmptyState,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import { adminFamilyMeta, getAdminFamilyRows, type AdminFamilyKey } from "@/lib/admin-content-registry";
import { adminContentFamilies } from "@/lib/admin-navigation";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { formatAdminDateTime } from "@/lib/admin-time";

export const metadata: Metadata = {
  title: "Overrides / Data Control",
  description: "Operator-facing manual override review and source-precedence control.",
};

export default async function AdminOverridesPage() {
  const store = await getAdminOperatorStore();
  const familyEntries = adminContentFamilies.filter(
    (item): item is (typeof adminContentFamilies)[number] & { href: `/admin/content/${AdminFamilyKey}` } =>
      item.href.startsWith("/admin/content/"),
  );
  const allRows = (
    await Promise.all(
      familyEntries.map(async (entry) => {
        const family = entry.href.replace("/admin/content/", "") as AdminFamilyKey;
        return await getAdminFamilyRows(family, store.records, {
          cacheKey: store.updatedAt,
        });
      }),
    )
  ).flat();
  const overrideRows = allRows.filter((row) => row.overrideIndicator !== "none");
  const needsReview = allRows.filter((row) =>
    ["source_newer_than_manual", "temporary_override_pending_expiry", "import_conflict_needs_review"].includes(
      row.importStatus,
    ),
  );
  const freshnessReview = allRows.filter(
    (row) =>
      row.refreshHealth === "failed" ||
      row.refreshHealth === "warning" ||
      row.importStatus === "source_newer_than_manual",
  );

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Overrides / Data Control", href: "/admin/overrides" },
        ]}
        eyebrow="Overrides"
        title="Overrides / data control"
        description="See where frontend data is coming from, which records are still source-backed, which sections are manually controlled, and where operator review is still needed."
      />

      <AdminStatGrid
        stats={[
          { label: "Override-active records", value: String(overrideRows.length), note: "Records with at least one non-auto override group." },
          { label: "Needs review", value: String(needsReview.length), note: "Source newer than manual, temporary expiry, or conflict-review posture." },
          { label: "Locked manuals", value: String(allRows.filter((row) => row.importStatus === "locked_manual_value").length), note: "Permanent manual locks that imports should not overwrite." },
          { label: "Temporary overrides", value: String(allRows.filter((row) => row.importStatus === "temporary_override_pending_expiry").length), note: "Temporary manual controls waiting for refresh or review." },
        ]}
      />

      <AdminSectionCard
        title="Cross-record override review"
        description="This desk keeps override posture visible instead of hiding it inside record editors only."
      >
        {overrideRows.length ? (
          <div className="space-y-3">
            {overrideRows.map((row) => (
              <div key={`${row.family}-${row.slug}`} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#111827]">{row.title}</p>
                    <p className="text-xs leading-5 text-[#6b7280]">
                      {adminFamilyMeta[row.family as AdminFamilyKey]?.label ?? row.family} • {row.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge label={row.overrideIndicator.replaceAll("_", " ")} tone={row.overrideIndicator === "locked" ? "danger" : "warning"} />
                    <AdminBadge label={row.importStatus.replaceAll("_", " ")} tone="info" />
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">{row.truthLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminActionLink href={`/admin/content/${row.family}/${row.slug}`} label="Open record" tone="primary" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No overrides yet"
            description="Override rows will appear here once operators save sections in manual, temporary, or locked modes."
          />
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Cross-family source freshness review"
        description="See where source-backed records have newer source data waiting behind manual values or where refresh posture has weakened."
      >
        {freshnessReview.length ? (
          <div className="space-y-3">
            {freshnessReview.slice(0, 18).map((row) => (
              <div key={`${row.family}-${row.slug}-freshness`} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#111827]">{row.title}</p>
                    <p className="text-xs leading-5 text-[#6b7280]">
                      {adminFamilyMeta[row.family as AdminFamilyKey]?.label ?? row.family} • {row.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge
                      label={row.refreshHealth.replaceAll("_", " ")}
                      tone={
                        row.refreshHealth === "failed"
                          ? "danger"
                          : row.refreshHealth === "warning"
                            ? "warning"
                            : "info"
                      }
                    />
                    <AdminBadge label={row.importStatus.replaceAll("_", " ")} tone="info" />
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                  Source freshness: {formatAdminDateTime(row.sourceFreshness, "No refresh date recorded")}.
                  {row.nextRefreshAt
                    ? ` Next run ${formatAdminDateTime(row.nextRefreshAt)}.`
                    : " Next run not scheduled yet."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminActionLink href={`/admin/content/${row.family}/${row.slug}`} label="Open record" tone="primary" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No freshness issues right now"
            description="Source newer-than-live values, refresh warnings, and failed refresh posture will surface here for cross-family review."
          />
        )}
      </AdminSectionCard>
    </AdminPageFrame>
  );
}
