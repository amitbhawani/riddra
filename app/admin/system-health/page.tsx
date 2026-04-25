import type { Metadata } from "next";

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
import { AdminGuidanceCard } from "@/components/admin/admin-operator-notices";
import { formatAdminDateTime } from "@/lib/admin-time";
import { getAdminSystemHealthReport, type AdminHealthIssue } from "@/lib/admin-system-health";

export const metadata: Metadata = {
  title: "System Health",
  description: "Operator-facing health view for stale data lanes, failed refresh jobs, incomplete flagship routes, and production-readiness warnings.",
};

function getTone(status: "healthy" | "warning" | "critical") {
  if (status === "critical") {
    return "danger" as const;
  }

  if (status === "warning") {
    return "warning" as const;
  }

  return "success" as const;
}

function renderIssueCards(items: AdminHealthIssue[], emptyState: { title: string; description: string }) {
  if (!items.length) {
    return <AdminEmptyState title={emptyState.title} description={emptyState.description} />;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-[14px] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#111827]">{item.title}</p>
            <AdminBadge label={item.status} tone={getTone(item.status)} />
          </div>
          <p className="mt-1.5 text-sm leading-5 text-[#4b5563]">{item.summary}</p>
          <div className="mt-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
              What this means
            </p>
            <p className="mt-1 text-sm leading-5 text-[#4b5563]">
              {item.status === "healthy"
                ? "This check looks healthy right now and does not need operator action."
                : item.status === "warning"
                  ? "This is worth checking soon, but it does not always block the public route."
                  : "This needs operator attention because it can weaken trust, freshness, or public accuracy."}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#6b7280]">
              Should I fix this? {item.status === "healthy" ? "No." : item.status === "warning" ? "Usually yes, but not always urgently." : "Yes."}
            </p>
          </div>
          {item.detail ? (
            <details className="mt-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-[#1B3A6B]">
                Technical detail
              </summary>
              <p className="mt-2 text-xs leading-5 text-[#6b7280]">{item.detail}</p>
            </details>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {item.examples?.length
              ? item.examples.map((example) => (
                  <AdminBadge key={`${item.id}-${example}`} label={example} tone="default" />
                ))
              : null}
            {item.href ? <AdminActionLink href={item.href} label="Open page" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminSystemHealthPage() {
  const report = await getAdminSystemHealthReport();
  const incompleteFlagshipRows = report.incompleteFlagshipPages.map((item) => [
    <div key={`${item.route}-title`} className="space-y-1">
      <p className="font-semibold text-[#111827]">{item.title}</p>
      <p className="text-xs leading-4 text-[#6b7280]">{item.route}</p>
    </div>,
    <AdminBadge key={`${item.route}-status`} label={item.status} tone={getTone(item.status)} />,
    <p key={`${item.route}-summary`} className="text-sm leading-5 text-[#4b5563]">
      {item.summary}
    </p>,
  ]);

  const runtimeWarnings = [
    ...report.hostedRuntimeRequirements.missingSite,
    ...report.hostedRuntimeRequirements.missingSupabasePublic,
    ...report.hostedRuntimeRequirements.missingSupabaseAdmin,
    ...report.hostedRuntimeRequirements.missingTrigger,
    ...report.hostedRuntimeRequirements.missingMeilisearch,
    ...report.hostedRuntimeRequirements.missingMarketData,
  ];

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "System Health", href: "/admin/system-health" },
        ]}
        eyebrow="System health"
        title="System health and follow-up"
        description="A plain-language view of what looks healthy, what needs attention, and what can safely wait."
        actions={
          <>
            <AdminActionLink href="/admin/refresh-jobs" label="Open refresh jobs" tone="primary" />
            <AdminActionLink href="/admin/readiness" label="Open readiness" />
          </>
        }
      />

      <AdminGuidanceCard
        title="How to read this page"
        description="This page is for operators, not only developers."
        items={[
          "Stale data means the page still works, but some supporting market data is older or thinner than it should be.",
          "Incomplete flagship page means an important public route still loads, but one or more supporting blocks are still weak or missing.",
          "Database field blocker means the main database is still missing a field this page expects. The warning clears only after that database is updated.",
        ]}
        links={[
          { href: "/admin/readiness", label: "Readiness center", tone: "primary" },
          { href: "/admin/help", label: "Help" },
        ]}
      />

      <AdminStatGrid
        stats={[
          {
            label: "Stale data lanes",
            value: String(report.staleDataLanes.length),
            note: "Benchmark history, NAV, fundamentals, and composition lanes still needing attention.",
          },
          {
            label: "Failed refresh jobs",
            value: String(report.failedRefreshJobs.length),
            note: "Source jobs whose latest health posture is currently failed.",
          },
          {
            label: "Missing critical rows",
            value: String(report.missingCriticalRows.length),
            note: "Flagship or critical operator records currently missing or unsafe.",
          },
          {
            label: "Incomplete flagship pages",
            value: String(report.incompleteFlagshipPages.filter((item) => item.status !== "healthy").length),
            note: "Public flagship surfaces that still have missing support data.",
          },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="System warnings"
          description="Compact operator warnings also surfaced across the admin shell."
          tone={report.warnings.length ? "warning" : "secondary"}
        >
          {report.warnings.length ? (
            <div className="space-y-2.5">
              {report.warnings.map((warning) => (
                <div key={warning.id} className="rounded-lg border border-[#fde68a] bg-white px-3 py-2.5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#111827]">{warning.message}</p>
                    <AdminActionLink href={warning.href} label="Open page" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No active system warnings"
              description="The current admin/runtime health checks are not flagging any urgent operator warnings."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Environment safety"
          description="Deployment posture, save-path status, and media storage mode."
          collapsible
          defaultOpen={false}
        >
          <div className="space-y-2.5">
            <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-[14px] shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge
                  label={report.isProductionMode ? "Production mode" : "Local mode"}
                  tone={report.isProductionMode ? "danger" : "info"}
                />
                <AdminBadge
                  label={report.usesDurableOperatorState ? "Hosted save path" : "Local save path"}
                  tone={report.usesDurableOperatorState ? "success" : "warning"}
                />
                <AdminBadge label={report.mediaStorage.label} tone="default" />
              </div>
              <p className="mt-2 text-sm leading-5 text-[#4b5563]">
                {report.mediaStorage.detail}
              </p>
              <p className="mt-2 text-xs leading-4 text-[#6b7280]">
                Generated {formatAdminDateTime(report.generatedAt)}
              </p>
            </div>

            {runtimeWarnings.length ? (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-[14px] shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge label="Runtime gaps" tone="danger" />
                  <p className="text-sm font-medium text-[#111827]">
                    Some deployment settings are still missing.
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {runtimeWarnings.map((item) => (
                    <AdminBadge key={item} label={item} tone="danger" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#bbf7d0] bg-[#ecfdf5] p-[14px] shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge label="Runtime requirements ready" tone="success" />
                  <p className="text-sm font-medium text-[#111827]">
                    No missing deployment settings are currently flagged by the launch checks.
                  </p>
                </div>
              </div>
            )}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="Stale data lanes"
          description="Tracked data lanes where source data is still incomplete or missing."
          collapsible
          defaultOpen={false}
        >
          {renderIssueCards(report.staleDataLanes, {
            title: "No stale data lanes",
            description: "Tracked benchmark, NAV, fundamentals, and composition lanes currently look healthy.",
          })}
        </AdminSectionCard>

        <AdminSectionCard
          title="Failed refresh jobs"
          description="Refresh lanes whose latest job state is failed and need operator action."
          collapsible
          defaultOpen={false}
        >
          {renderIssueCards(report.failedRefreshJobs, {
            title: "No failed refresh jobs",
            description: "The latest tracked refresh jobs are not currently marked failed.",
          })}
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Global state checks"
        description="Clear warnings for the critical backend data lanes behind flagship stock, fund, index, and markets routes."
        collapsible
        defaultOpen={false}
      >
        <AdminSimpleTable
          columns={["Check", "Status", "Affected", "Summary"]}
          rows={report.globalStateChecks.map((item) => [
            <div key={`${item.id}-title`} className="space-y-1">
              <p className="font-semibold text-[#111827]">{item.title}</p>
              {item.examples?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {item.examples.map((example) => (
                    <AdminBadge key={`${item.id}-${example}`} label={example} tone="default" />
                  ))}
                </div>
              ) : null}
            </div>,
            <AdminBadge key={`${item.id}-status`} label={item.status} tone={getTone(item.status)} />,
            <span key={`${item.id}-count`}>{item.affectedCount}</span>,
            <div key={`${item.id}-summary`} className="space-y-1">
              <p className="text-sm leading-5 text-[#4b5563]">{item.summary}</p>
              {item.detail ? <p className="text-xs leading-4 text-[#6b7280]">{item.detail}</p> : null}
            </div>,
          ])}
        />
      </AdminSectionCard>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="Missing critical rows"
          description="Saved records that are important enough to block trust if absent."
          collapsible
          defaultOpen={false}
        >
          {renderIssueCards(report.missingCriticalRows, {
            title: "No critical rows missing",
            description: "Flagship public rows and critical refresh-lane definitions are present.",
          })}
        </AdminSectionCard>

        <AdminSectionCard
          title="Incomplete flagship pages"
          description="A page-level check on the flagship public pages that should stay demo-ready."
          collapsible
          defaultOpen={false}
        >
          {report.incompleteFlagshipPages.length ? (
            <AdminSimpleTable
              columns={["Route", "Status", "Summary"]}
              rows={incompleteFlagshipRows}
            />
          ) : (
            <AdminEmptyState
              title="No flagship routes checked"
              description="The system health layer could not build the flagship route checklist."
            />
          )}
        </AdminSectionCard>
      </div>
    </AdminPageFrame>
  );
}
