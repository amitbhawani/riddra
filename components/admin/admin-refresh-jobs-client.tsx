"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { formatAdminDateTime, formatAdminSavedState } from "@/lib/admin-time";
import type { AdminRefreshJob } from "@/lib/admin-operator-store";
import type { RefreshJobRun } from "@/lib/user-product-store";
import {
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";

function getTone(status: AdminRefreshJob["latestStatus"] | RefreshJobRun["status"]) {
  if (status === "healthy") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "warning") return "warning" as const;
  if (status === "paused") return "default" as const;
  return "info" as const;
}

function formatDuration(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) {
    return "Running";
  }

  const started = new Date(startedAt).getTime();
  const finished = new Date(finishedAt).getTime();
  if (Number.isNaN(started) || Number.isNaN(finished) || finished < started) {
    return "Unknown";
  }

  const durationMs = finished - started;
  const totalSeconds = Math.round(durationMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function summarizeRunError(run: RefreshJobRun) {
  const text = run.error || run.note || "";
  if (!text) {
    return "No error recorded";
  }

  return text.length > 96 ? `${text.slice(0, 93)}...` : text;
}

function getRetryCount(runs: RefreshJobRun[], runId: string) {
  return runs.filter((run) => run.retriedFromRunId === runId).length;
}

function getVisibleRetryCount(runs: RefreshJobRun[]) {
  return runs.filter((run) => Boolean(run.retriedFromRunId)).length;
}

function getLatestRetryableRun(runs: RefreshJobRun[]) {
  return runs.find((run) => run.status === "failed" || run.status === "warning") ?? null;
}

function getJobRuns(runsByJob: Record<string, RefreshJobRun[]>, key: string) {
  return (runsByJob[key] ?? []).slice(0, 10);
}

export function AdminRefreshJobsClient({
  initialJobs,
  initialRunsByJob,
}: {
  initialJobs: AdminRefreshJob[];
  initialRunsByJob: Record<string, RefreshJobRun[]>;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [runsByJob, setRunsByJob] = useState(initialRunsByJob);
  const [selectedJobKey, setSelectedJobKey] = useState(
    initialJobs.find((job) => getJobRuns(initialRunsByJob, job.key).length)?.key ?? initialJobs[0]?.key ?? "",
  );
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const failedJobs = useMemo(
    () => jobs.filter((job) => job.latestStatus === "failed"),
    [jobs],
  );
  const overdueJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.enabled &&
          job.latestStatus !== "healthy" &&
          job.latestStatus !== "running" &&
          !job.nextScheduledRunAt,
      ),
    [jobs],
  );
  const selectedJob = jobs.find((job) => job.key === selectedJobKey) ?? jobs[0] ?? null;
  const selectedRuns = selectedJob ? getJobRuns(runsByJob, selectedJob.key) : [];
  const selectedRetryableRun = selectedJob ? getLatestRetryableRun(selectedRuns) : null;

  function updateJob(
    key: string,
    patch: Partial<
      Pick<
        AdminRefreshJob,
        "enabled" | "cadence" | "latestStatus" | "latestError" | "nextScheduledRunAt" | "lastOperatorNote"
      >
    >,
  ) {
    setJobs((current) =>
      current.map((job) => (job.key === key ? { ...job, ...patch } : job)),
    );
  }

  function saveJob(job: AdminRefreshJob) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/operator-console/refresh-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: job.key,
          action: "save",
          enabled: job.enabled,
          cadence: job.cadence,
          latestStatus: job.latestStatus,
          latestError: job.latestError,
          nextScheduledRunAt: job.nextScheduledRunAt,
          lastOperatorNote: job.lastOperatorNote,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not save the refresh job right now.",
        });
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            job?: AdminRefreshJob;
            savedAt?: string;
          }
        | null;

      if (!data?.job) {
        setBanner({
          tone: "danger",
          text: "The refresh job response was incomplete. Please reload and try again.",
        });
        return;
      }

      setJobs((current) => current.map((entry) => (entry.key === data.job?.key ? data.job : entry)));
      router.refresh();
      setBanner({
        tone: "success",
        text: `${job.name} updated.`,
        detail: `Saved through the current operator storage path. ${formatAdminSavedState(data.savedAt ?? data.job.lastOperatorActionAt)}`,
      });
    });
  }

  function queueJob(job: AdminRefreshJob, retryFromRun?: RefreshJobRun | null) {
    startTransition(async () => {
      setBanner(null);
      const isRetry = Boolean(retryFromRun);
      const note = isRetry
        ? `Operator retried ${retryFromRun?.status ?? "previous"} run from the refresh jobs desk.`
        : "Operator queued a manual refresh run from the refresh jobs desk.";
      const response = await fetch("/api/admin/operator-console/refresh-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: job.key,
          action: isRetry ? "retry" : "run",
          outcome: "running",
          note,
          retriedFromRunId: retryFromRun?.id ?? null,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            run?: RefreshJobRun;
            job?: AdminRefreshJob;
            savedAt?: string;
          }
        | null;

      if (!response.ok) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not queue the manual refresh right now.",
        });
        return;
      }

      const run =
        data?.run ??
        ({
          id: `local-${Date.now()}`,
          jobKey: job.key,
          status: "running",
          startedAt: new Date().toISOString(),
          finishedAt: null,
          error: null,
          note,
          requestedBy: "Operator",
          retriedFromRunId: retryFromRun?.id ?? null,
        } satisfies RefreshJobRun);

      setJobs((current) =>
        current.map((entry) =>
          entry.key === job.key
            ? {
                ...(data?.job ?? entry),
                latestStatus: data?.job?.latestStatus ?? "running",
                lastRunAt: data?.job?.lastRunAt ?? run.startedAt,
                lastOperatorNote: data?.job?.lastOperatorNote ?? note,
              }
            : entry,
        ),
      );
      setRunsByJob((current) => ({
        ...current,
        [job.key]: [run, ...(current[job.key] ?? [])].slice(0, 10),
      }));
      setSelectedJobKey(job.key);
      router.refresh();
      setBanner({
        tone: "success",
        text: isRetry ? `${job.name} retry queued.` : `${job.name} queued as a manual refresh run.`,
        detail: `Saved through the current operator storage path. ${formatAdminSavedState(data?.savedAt ?? run.startedAt)}`,
      });
    });
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Saved" : "Error"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm leading-6 text-[#4b5563]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSectionCard
          title="Refresh failures"
          description="Jobs whose latest recorded state is failed and still need operator follow-through."
        >
          {failedJobs.length ? (
            <div className="space-y-3">
              {failedJobs.map((job) => (
                <button
                  key={job.key}
                  type="button"
                  onClick={() => setSelectedJobKey(job.key)}
                  className="w-full rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 text-left shadow-sm transition hover:border-[#94a3b8]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{job.name}</p>
                    <AdminBadge label="Failed" tone="danger" />
                  </div>
                  <p className="mt-1 text-[12px] text-[#6b7280]">
                    {job.family} • {job.lane}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                    {job.latestError || "No failure note recorded yet."}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No failed refresh jobs"
              description="The refresh desk will flag failures here as soon as an operator marks a lane failed."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Overdue or unplanned jobs"
          description="Enabled jobs that still need a clearer next run time or better health posture."
        >
          {overdueJobs.length ? (
            <div className="space-y-3">
              {overdueJobs.map((job) => (
                <button
                  key={job.key}
                  type="button"
                  onClick={() => setSelectedJobKey(job.key)}
                  className="w-full rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 text-left shadow-sm transition hover:border-[#94a3b8]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{job.name}</p>
                    <AdminBadge label={job.latestStatus.replaceAll("_", " ")} tone={getTone(job.latestStatus)} />
                  </div>
                  <p className="mt-1 text-[12px] text-[#6b7280]">
                    {job.family} • {job.lane}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                    {job.cadence} • {job.sourceDependency}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No overdue jobs"
              description="Enabled jobs with missing schedules or weak posture will surface here for operator review."
            />
          )}
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Refresh job registry"
        description="Manage lane ownership, cadence, recent run posture, and safe manual actions from one compact operator table."
      >
        {jobs.length ? (
          <AdminSimpleTable
            columns={["Job", "Affected family / lane", "Health", "Schedule", "Recent runs", "Actions"]}
            rows={jobs.map((job) => {
              const runs = getJobRuns(runsByJob, job.key);
              const latestRun = runs[0] ?? null;
              const latestRetryableRun = getLatestRetryableRun(runs);
              return [
                <div key={`${job.key}-job`} className="space-y-1">
                  <p className="font-semibold text-[#111827]">{job.name}</p>
                  <p className="text-xs leading-5 text-[#6b7280]">{job.sourceDependency}</p>
                </div>,
                <div key={`${job.key}-family`} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <AdminBadge label={job.family} tone="info" />
                    <AdminBadge label={job.lane} tone="default" />
                  </div>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {job.affectedRecordsCount !== null
                      ? `${job.affectedRecordsCount} records affected`
                      : "Affected-record count not recorded"}
                  </p>
                </div>,
                <div key={`${job.key}-state`} className="space-y-1.5">
                  <AdminBadge label={job.latestStatus.replaceAll("_", " ")} tone={getTone(job.latestStatus)} />
                  <p className="text-xs leading-5 text-[#6b7280]">{job.enabled ? "Enabled" : "Paused"}</p>
                  <select
                    value={job.latestStatus}
                    onChange={(event) =>
                      updateJob(job.key, {
                        latestStatus: event.target.value as AdminRefreshJob["latestStatus"],
                      })
                    }
                    className="h-8 w-[150px] rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                  >
                    <option value="healthy">Healthy</option>
                    <option value="running">Running</option>
                    <option value="warning">Warning</option>
                    <option value="failed">Failed</option>
                    <option value="paused">Paused</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>,
                <div key={`${job.key}-schedule`} className="space-y-1">
                  <input
                    value={job.cadence}
                    onChange={(event) => updateJob(job.key, { cadence: event.target.value })}
                    className="h-8 w-[220px] rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                  />
                  <input
                    value={job.nextScheduledRunAt || ""}
                    onChange={(event) => updateJob(job.key, { nextScheduledRunAt: event.target.value })}
                    placeholder="Next scheduled run"
                    className="h-8 w-[220px] rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                  />
                  <label className="flex items-center gap-2 text-xs leading-5 text-[#4b5563]">
                    <input
                      type="checkbox"
                      checked={job.enabled}
                      onChange={(event) => updateJob(job.key, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>,
                <div key={`${job.key}-history`} className="space-y-1">
                  <p className="text-[13px] text-[#111827]">
                    {runs.length ? `${runs.length} of last 10 runs visible` : "No runs recorded"}
                  </p>
                    <p className="text-xs leading-5 text-[#6b7280]">
                    {latestRun
                      ? `${formatAdminDateTime(latestRun.startedAt)} • ${formatDuration(latestRun.startedAt, latestRun.finishedAt)}`
                      : "Run duration unavailable"}
                  </p>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    Retries visible: {getVisibleRetryCount(runs)}
                  </p>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {latestRun ? summarizeRunError(latestRun) : "No error summary yet"}
                  </p>
                </div>,
                <div key={`${job.key}-actions`} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedJobKey(job.key)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                  >
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => saveJob(job)}
                    disabled={isPending}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                  >
                    {isPending && selectedJobKey === job.key ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => queueJob(job)}
                    disabled={isPending || !job.manualRunSupported}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending && selectedJobKey === job.key ? "Running..." : "Run now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => queueJob(job, latestRetryableRun)}
                    disabled={isPending || !job.manualRunSupported || !latestRetryableRun}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending && selectedJobKey === job.key ? "Retrying..." : "Retry last issue"}
                  </button>
                </div>,
              ];
            })}
          />
        ) : (
          <AdminEmptyState
            title="No refresh jobs configured"
            description="The refresh registry will appear here once the operator store has source-driven lanes configured."
          />
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title={selectedJob ? `${selectedJob.name} history` : "Job history"}
        description="Review the last 10 recorded runs, check duration and error summaries, and retry a failed or warning run safely."
      >
        {selectedJob ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Affected</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <AdminBadge label={selectedJob.family} tone="info" />
                  <AdminBadge label={selectedJob.lane} tone="default" />
                </div>
              </div>
              <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Last success</p>
                <p className="mt-2 text-[13px] font-medium text-[#111827]">{formatAdminDateTime(selectedJob.lastSuccessAt)}</p>
              </div>
              <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Last failure</p>
                <p className="mt-2 text-[13px] font-medium text-[#111827]">{formatAdminDateTime(selectedJob.lastFailureAt)}</p>
              </div>
              <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Retries visible</p>
                <p className="mt-2 text-[13px] font-medium text-[#111827]">{getVisibleRetryCount(selectedRuns)}</p>
              </div>
            </div>

            {selectedJob.latestError ? (
              <div className="rounded-lg border border-[#d1d5db] bg-[#fff7ed] px-3 py-2 text-sm leading-6 text-[#9a3412]">
                <span className="font-medium text-[#7c2d12]">Latest error:</span> {selectedJob.latestError}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Next scheduled run
                </span>
                <input
                  value={selectedJob.nextScheduledRunAt || ""}
                  onChange={(event) =>
                    updateJob(selectedJob.key, { nextScheduledRunAt: event.target.value })
                  }
                  placeholder="Next scheduled run"
                  className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Latest error summary
                </span>
                <input
                  value={selectedJob.latestError || ""}
                  onChange={(event) =>
                    updateJob(selectedJob.key, { latestError: event.target.value })
                  }
                  placeholder="Latest error or summary"
                  className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Operator note
                </span>
                <input
                  value={selectedJob.lastOperatorNote || ""}
                  onChange={(event) =>
                    updateJob(selectedJob.key, { lastOperatorNote: event.target.value })
                  }
                  placeholder="Why this job needs attention or what changed"
                  className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveJob(selectedJob)}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
              >
                {isPending ? "Saving..." : "Save job"}
              </button>
              <button
                type="button"
                onClick={() => queueJob(selectedJob)}
                disabled={isPending || !selectedJob.manualRunSupported}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Running..." : "Run now"}
              </button>
              <button
                type="button"
                onClick={() => queueJob(selectedJob, selectedRetryableRun)}
                disabled={isPending || !selectedJob.manualRunSupported || !selectedRetryableRun}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Retrying..." : "Retry last issue"}
              </button>
            </div>

            {selectedRuns.length ? (
              <AdminSimpleTable
                columns={["Status", "Started", "Finished", "Duration", "Error summary", "Retry count", "Action"]}
                rows={selectedRuns.map((run) => [
                  <div key={`${run.id}-status`} className="space-y-1">
                    <AdminBadge label={run.status} tone={getTone(run.status)} />
                    <p className="text-xs leading-5 text-[#6b7280]">
                      {run.retriedFromRunId ? `Retry of ${run.retriedFromRunId}` : "Original run"}
                    </p>
                  </div>,
                  <div key={`${run.id}-started`} className="space-y-1">
                    <p className="text-[13px] text-[#111827]">{formatAdminDateTime(run.startedAt)}</p>
                    <p className="text-xs leading-5 text-[#6b7280]">{run.requestedBy || "System"}</p>
                  </div>,
                  formatAdminDateTime(run.finishedAt),
                  formatDuration(run.startedAt, run.finishedAt),
                  <div key={`${run.id}-error`} className="space-y-1">
                    <p className="text-[13px] text-[#111827]">{summarizeRunError(run)}</p>
                    <p className="text-xs leading-5 text-[#6b7280]">{run.note || "No note recorded"}</p>
                  </div>,
                  <span key={`${run.id}-retry-count`} className="text-[13px] text-[#111827]">
                    {getRetryCount(selectedRuns, run.id)}
                  </span>,
                  <button
                    key={`${run.id}-retry`}
                    type="button"
                    onClick={() => queueJob(selectedJob, run)}
                    disabled={
                      isPending ||
                      !selectedJob.manualRunSupported ||
                      (run.status !== "failed" && run.status !== "warning")
                    }
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retry
                  </button>,
                ])}
              />
            ) : (
              <AdminEmptyState
                title="No run history yet"
                description="This job has not recorded any runs yet. Use Run now when a safe manual trigger is supported."
              />
            )}
          </div>
        ) : (
          <AdminEmptyState
            title="No refresh job selected"
            description="Choose a job from the registry to review its recent runs and retry history."
          />
        )}
      </AdminSectionCard>
    </div>
  );
}
