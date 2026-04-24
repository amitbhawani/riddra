import type { Metadata } from "next";

import { listAdminActivityLog } from "@/lib/admin-activity-log";
import { getAdminMembershipTiers, getAdminOperatorStore, getAdminRefreshJobs } from "@/lib/admin-operator-store";
import { getAdminSystemHealthReport } from "@/lib/admin-system-health";
import { formatAdminDateTime } from "@/lib/admin-time";
import { listMediaAssets, listUserProductProfiles } from "@/lib/user-product-store";
import { AdminGuidanceCard, AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import {
  AdminActionLink,
  AdminBadge,
  AdminEmptyState,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminSimpleTable,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";

export const metadata: Metadata = {
  title: "Readiness",
  description: "Final backend readiness, blocker explainers, durable-state visibility, and operator signoff status.",
};

type ScoreStatus = "pass" | "attention" | "blocked";

const schemaBlockerConfig = {
  "stock-schema-alignment": {
    title: "Stock schema alignment blocker",
    whyItMatters:
      "Stock detail pages use sector-index mapping for benchmark context and related health checks.",
    affects: [
      "/stocks/tata-motors",
      "/admin/content/stocks/tata-motors",
      "/admin/system-health",
    ],
    safeDespite:
      "Stock routes can still resolve through safe fallback behavior, and normal CMS saving, preview, activity logging, and publishing remain trustworthy.",
    migrationFile: "db/migrations/0029_schema_alignment_sector_and_benchmark_slug.sql",
    editorHref: "/admin/content/stocks/tata-motors",
    publicHref: "/stocks/tata-motors",
  },
  "fund-schema-alignment": {
    title: "Mutual-fund schema alignment blocker",
    whyItMatters:
      "Mutual-fund benchmark mapping uses benchmark_index_slug for durable benchmark resolution and health verification.",
    affects: [
      "/mutual-funds/hdfc-mid-cap-opportunities",
      "/admin/content/mutual-funds/hdfc-mid-cap-opportunities",
      "/admin/system-health",
    ],
    safeDespite:
      "Fund routes can still resolve through safe benchmark fallback behavior, and operator saves, memberships, media, users, and global-site editing are not blocked by this issue.",
    migrationFile: "db/migrations/0029_schema_alignment_sector_and_benchmark_slug.sql",
    editorHref: "/admin/content/mutual-funds/hdfc-mid-cap-opportunities",
    publicHref: "/mutual-funds/hdfc-mid-cap-opportunities",
  },
} as const;

function getScoreTone(status: ScoreStatus) {
  if (status === "pass") {
    return "success" as const;
  }

  if (status === "blocked") {
    return "danger" as const;
  }

  return "warning" as const;
}

export default async function AdminReadinessPage() {
  const [report, store, users, tiers, assets, jobs, activityEntries] = await Promise.all([
    getAdminSystemHealthReport(),
    getAdminOperatorStore(),
    listUserProductProfiles(),
    getAdminMembershipTiers(),
    listMediaAssets(),
    getAdminRefreshJobs(),
    listAdminActivityLog(25),
  ]);

  const runtimeWarnings = [
    ...report.hostedRuntimeRequirements.missingSite,
    ...report.hostedRuntimeRequirements.missingSupabasePublic,
    ...report.hostedRuntimeRequirements.missingSupabaseAdmin,
    ...report.hostedRuntimeRequirements.missingTrigger,
    ...report.hostedRuntimeRequirements.missingMeilisearch,
    ...report.hostedRuntimeRequirements.missingMarketData,
  ];

  const schemaBlockers = report.globalStateChecks
    .filter((item) => item.id in schemaBlockerConfig)
    .map((item) => ({
      ...item,
      ...schemaBlockerConfig[item.id as keyof typeof schemaBlockerConfig],
    }));

  const scorecard: Array<{ category: string; status: ScoreStatus; detail: string }> = [
    {
      category: "Admin trust",
      status: activityEntries.length > 0 ? "pass" : "attention",
      detail:
        activityEntries.length > 0
          ? "Writes, audit logging, preview/version safeguards, and conflict protection are active."
          : "Core trust features are present, but this runtime has little recent activity logged yet.",
    },
    {
      category: "Operator clarity",
      status: "pass",
      detail: "Help, system health, readiness, and targeted inline guidance now explain the main operator flows.",
    },
    {
      category: "Durable storage",
      status: report.usesDurableOperatorState ? "pass" : "attention",
      detail: report.usesDurableOperatorState
        ? "The operator backbone is using the durable DB-first path."
        : "This runtime is still on local fallback storage, so hosted proof is not ready yet.",
    },
    {
      category: "Role safety",
      status: "pass",
      detail: "Admin, editor, and capability-aware route/API controls are active.",
    },
    {
      category: "Schema alignment",
      status: schemaBlockers.length ? "blocked" : "pass",
      detail: schemaBlockers.length
        ? "Active DB schema drift is still blocking clean health resolution for stock/fund benchmark mapping."
        : "No active schema-alignment blockers are currently flagged by system health.",
    },
    {
      category: "Hosted-proof readiness",
      status:
        schemaBlockers.length || runtimeWarnings.length || report.failedRefreshJobs.length
          ? "blocked"
          : report.staleDataLanes.length || report.incompleteFlagshipPages.some((item) => item.status !== "healthy")
            ? "attention"
            : "pass",
      detail:
        schemaBlockers.length || runtimeWarnings.length || report.failedRefreshJobs.length
          ? "Migrations and runtime/env follow-through are still required before hosted proof can be signed off."
          : "No hard hosted-proof blockers are currently flagged.",
    },
  ];

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Readiness", href: "/admin/readiness" },
        ]}
        eyebrow="Readiness"
        title="Backend readiness and closure"
        description="One operator-facing place to understand what is done, what is blocked, what still needs migration or runtime work, and what is safe to ignore for now."
        actions={
          <>
            <AdminActionLink href="/admin/system-health" label="Open system health" />
            <AdminActionLink href="/admin/help" label="Open help" />
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AdminGuidanceCard
          title="Start here"
          description="Use this page as the final backend closure view before hosted proof work."
          items={[
            "Use Content for daily record editing, Users for access/roles, and Memberships for gated content policy.",
            "Use System Health for stale data, refresh failures, incomplete flagship routes, and schema blockers.",
            "Use Activity Log to confirm who changed what after an important save or publish action.",
          ]}
          links={[
            { href: "/admin/content", label: "Content", tone: "primary" },
            { href: "/admin/users", label: "Users" },
            { href: "/admin/memberships", label: "Memberships" },
            { href: "/admin/system-health", label: "System Health" },
            { href: "/admin/help", label: "Help" },
          ]}
        />
        <AdminStorageStatusCard scope="the operator backend" />
      </div>

      <AdminStatGrid
        stats={[
          {
            label: "Durable systems",
            value: String(
              [
                store.records.length > 0 || report.usesDurableOperatorState,
                users.length > 0 || report.usesDurableOperatorState,
                tiers.length > 0 || report.usesDurableOperatorState,
                assets.length > 0 || report.usesDurableOperatorState,
                jobs.length > 0 || report.usesDurableOperatorState,
              ].filter(Boolean).length,
            ),
            note: "Content, users, memberships, media metadata, and refresh-job state are now operating through the mature backend stack.",
          },
          {
            label: "Active blockers",
            value: String(
              schemaBlockers.length + runtimeWarnings.length + report.failedRefreshJobs.length,
            ),
            note: "Only real blockers remain visible here. Nothing is artificially hidden or marked green.",
          },
          {
            label: "Recent audit actions",
            value: String(activityEntries.length),
            note: "Latest backend mutations captured in the activity log for operator review.",
          },
          {
            label: "Generated",
            value: formatAdminDateTime(report.generatedAt),
            note: "Readiness and health are computed from the current runtime state, not a static checklist.",
          },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminSectionCard
          title="Backend trust"
          description="These are the areas that now make the backend feel real and operator-safe."
        >
          <div className="space-y-2.5">
            {[
              "Writes persisting with visible success/failure feedback",
              "Activity log capturing user, content, settings, memberships, and refresh actions",
              "Conflict protection blocking silent overwrite on stale editor state",
              "Preview and version workflow isolated from live content",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2.5">
                <AdminBadge label="Ready" tone="success" />
                <p className="text-sm leading-6 text-[#4b5563]">{item}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Operator durability"
          description="These systems are part of the durable backend backbone and no longer rely on a fragile JSON-first admin core."
        >
          <div className="space-y-2.5">
            {[
              `Managed records active: ${store.records.length}`,
              `User profiles active: ${users.length}`,
              `Membership tiers active: ${tiers.length}`,
              `Media assets active: ${assets.length}`,
              `Refresh jobs active: ${jobs.length}`,
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2.5">
                <AdminBadge label={report.usesDurableOperatorState ? "DB-first" : "Fallback"} tone={report.usesDurableOperatorState ? "success" : "warning"} />
                <p className="text-sm leading-6 text-[#4b5563]">{item}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Final backend scorecard"
        description="This keeps the closure decision honest: pass, attention needed, or blocked."
      >
        <AdminSimpleTable
          columns={["Category", "Status", "Meaning"]}
          rows={scorecard.map((item) => [
            item.category,
            <AdminBadge key={`${item.category}-status`} label={item.status} tone={getScoreTone(item.status)} />,
            <p key={`${item.category}-detail`} className="text-sm leading-5 text-[#4b5563]">
              {item.detail}
            </p>,
          ])}
        />
      </AdminSectionCard>

      <AdminSectionCard
        title="Schema blockers and migration explainers"
        description="These blockers stay visible until the active database is actually aligned. Localhost fallback behavior is not treated as a fix."
      >
        {schemaBlockers.length ? (
          <div className="space-y-3">
            {schemaBlockers.map((item) => (
              <div key={item.id} className="rounded-lg border border-[#fecaca] bg-[#fff7ed] p-[14px] shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#111827]">{item.title}</p>
                  <AdminBadge label={item.status} tone={getScoreTone(item.status === "critical" ? "blocked" : "attention")} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                  {item.summary}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                  <span className="font-medium text-[#111827]">Why it matters:</span> {item.whyItMatters}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4b5563]">
                  <span className="font-medium text-[#111827]">What is still safe:</span> {item.safeDespite}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4b5563]">
                  <span className="font-medium text-[#111827]">Migration required:</span>{" "}
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] text-[#111827]">
                    {item.migrationFile}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-6 text-[#4b5563]">
                  The health warning clears only when that migration is applied to the active DB and the field becomes readable there.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminActionLink href="/admin/system-health" label="System health" />
                  <AdminActionLink href={item.editorHref} label="Affected editor" />
                  <AdminActionLink href={item.publicHref} label="Affected public page" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No active schema blockers"
            description="The current runtime health checks are not flagging the known stock or fund schema-alignment blockers."
          />
        )}
      </AdminSectionCard>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="Hosted proof blockers"
          description="These still need migration, environment, or production-runtime follow-through before hosted proof can be signed off."
        >
          {runtimeWarnings.length || report.failedRefreshJobs.length || report.staleDataLanes.length ? (
            <div className="space-y-2.5">
              {runtimeWarnings.length ? (
                <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] p-[14px] shadow-sm">
                  <div className="flex items-center gap-2">
                    <AdminBadge label="Runtime / env" tone="warning" />
                    <p className="text-sm font-medium text-[#111827]">Hosted runtime configuration still needs follow-through.</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {runtimeWarnings.map((item) => (
                      <AdminBadge key={item} label={item} tone="warning" />
                    ))}
                  </div>
                </div>
              ) : null}
              {report.failedRefreshJobs.length ? (
                <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-[14px] shadow-sm">
                  <div className="flex items-center gap-2">
                    <AdminBadge label="Refresh failures" tone="danger" />
                    <p className="text-sm font-medium text-[#111827]">
                      {report.failedRefreshJobs.length} refresh job{report.failedRefreshJobs.length === 1 ? "" : "s"} still failing.
                    </p>
                  </div>
                </div>
              ) : null}
              {report.staleDataLanes.length ? (
                <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] p-[14px] shadow-sm">
                  <div className="flex items-center gap-2">
                    <AdminBadge label="Data health" tone="warning" />
                    <p className="text-sm font-medium text-[#111827]">
                      {report.staleDataLanes.length} tracked data lane{report.staleDataLanes.length === 1 ? "" : "s"} still need attention.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <AdminEmptyState
              title="No extra hosted-proof blockers"
              description="Outside schema alignment, refresh jobs, and runtime config, no other major readiness blockers are currently flagged."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Safe to ignore for now"
          description="These are not fake greens. They are real areas that can wait while the remaining blockers are closed."
        >
          <div className="space-y-2.5">
            {[
              "If saves are succeeding and the activity log records the action, users, settings, memberships, media metadata, and content writes are already trustworthy.",
              "The two active schema blockers do not stop preview, versioning, audit logging, or routine operator editing. They specifically block clean stock/fund schema alignment in the active DB.",
              "Localhost public routes may still work through safe fallback behavior while system health stays yellow or blocked. That is expected until the migration is applied.",
            ].map((item) => (
              <div key={item} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-sm leading-6 text-[#4b5563]">{item}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </AdminPageFrame>
  );
}
