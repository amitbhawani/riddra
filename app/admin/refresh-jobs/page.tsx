import type { Metadata } from "next";

import { AdminGuidanceCard, AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminRefreshJobsClient } from "@/components/admin/admin-refresh-jobs-client";
import {
  AdminPageFrame,
  AdminPageHeader,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import { getAdminRefreshJobs } from "@/lib/admin-operator-store";
import { getRefreshJobRuns } from "@/lib/user-product-store";

export const metadata: Metadata = {
  title: "Refresh Jobs / Automation",
  description: "Operator-facing cadence, freshness, and manual refresh management for source-driven lanes.",
};

export default async function AdminRefreshJobsPage() {
  const jobs = await getAdminRefreshJobs();
  const runsByJob = Object.fromEntries(
    await Promise.all(
      jobs.map(async (job) => [job.key, await getRefreshJobRuns(job.key, 10)] as const),
    ),
  );

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Refresh Jobs / Automation", href: "/admin/refresh-jobs" },
        ]}
        eyebrow="Refresh jobs"
        title="Refresh jobs / automation"
        description="Manage cadence, source dependency, last/next run, health posture, and manual refresh control for the durable source lanes behind the public product."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminGuidanceCard
          title="How to use this desk"
          description="This area helps operators understand what a run, retry, success, or failure actually means."
          items={[
            "Run now starts a safe manual run for jobs that allow operator-triggered refresh.",
            "Retry uses the last failed or warning run as context so the history stays traceable.",
            "Last success and last failure tell you the most recent trustworthy outcome, not just whether a button was clicked.",
          ]}
          links={[
            { href: "/admin/system-health", label: "System health", tone: "primary" },
            { href: "/admin/help", label: "Help" },
          ]}
        />
        <AdminStorageStatusCard scope="refresh job state and run history" />
      </div>

      <AdminStatGrid
        stats={[
          {
            label: "Registered lanes",
            value: String(jobs.length),
            note: "Refresh-capable jobs tracked in the local operator registry.",
          },
          {
            label: "Enabled",
            value: String(jobs.filter((job) => job.enabled).length),
            note: "Jobs currently enabled for scheduled refresh.",
          },
          {
            label: "Failures",
            value: String(jobs.filter((job) => job.latestStatus === "failed").length),
            note: "Jobs whose latest state is failed and need operator attention.",
          },
          {
            label: "Manual run capable",
            value: String(jobs.filter((job) => job.manualRunSupported).length),
            note: "Jobs that can be manually triggered from the operator desk.",
          },
        ]}
      />

      <AdminRefreshJobsClient initialJobs={jobs} initialRunsByJob={runsByJob} />
    </AdminPageFrame>
  );
}
