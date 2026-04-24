import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  AdminOperatorValidationError,
  assertAdminIdentifier,
  sanitizeAdminFailureMessage,
} from "@/lib/admin-operator-guards";
import {
  getAdminRefreshJobs,
  runAdminRefreshJob,
  saveAdminRefreshJob,
} from "@/lib/admin-operator-store";
import { hasProductUserCapability } from "@/lib/product-permissions";
import { appendRefreshJobRun, getRefreshJobRuns } from "@/lib/user-product-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const allowedJobStatuses = new Set(["healthy", "running", "warning", "failed", "paused", "planned"]);
const allowedRunOutcomes = new Set(["running", "healthy", "failed", "warning"]);

export async function GET() {
  try {
    const { role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_refresh_jobs")) {
      throw new AdminOperatorValidationError("You do not have permission to view refresh jobs.", 403);
    }

    return NextResponse.json({
      ok: true,
      jobs: await getAdminRefreshJobs(),
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_refresh_jobs")) {
      throw new AdminOperatorValidationError("You do not have permission to manage refresh jobs.", 403);
    }

    const payload = (await request.json()) as {
      key?: string;
      action?: "save" | "run" | "retry";
      enabled?: boolean;
      cadence?: string;
      latestStatus?: "healthy" | "running" | "warning" | "failed" | "paused" | "planned";
      latestError?: string | null;
      nextScheduledRunAt?: string | null;
      lastOperatorNote?: string | null;
      outcome?: "running" | "healthy" | "failed" | "warning";
      note?: string | null;
      retriedFromRunId?: string | null;
    };

    if (!payload.key) {
      return badRequest("Refresh job key is required.");
    }

    const key = assertAdminIdentifier(payload.key, "Refresh job key");

    if (payload.latestStatus && !allowedJobStatuses.has(payload.latestStatus)) {
      return badRequest("Unsupported refresh job status.");
    }

    if (payload.outcome && !allowedRunOutcomes.has(payload.outcome)) {
      return badRequest("Unsupported refresh run outcome.");
    }

    if (payload.action === "run" || payload.action === "retry") {
      const currentJob = (await getAdminRefreshJobs()).find((item) => item.key === key);

      if (!currentJob) {
        return badRequest("Could not find the refresh job.");
      }

      if (!currentJob.manualRunSupported) {
        return badRequest("This refresh job does not support manual retry or run actions.");
      }

      const retriedFromRunId =
        payload.action === "retry" && payload.retriedFromRunId
          ? assertAdminIdentifier(payload.retriedFromRunId, "Retried run ID")
          : null;
      const priorRun =
        retriedFromRunId
          ? (await getRefreshJobRuns(key, 50)).find((run) => run.id === retriedFromRunId) ?? null
          : null;

      if (payload.action === "retry") {
        if (!retriedFromRunId || !priorRun) {
          return badRequest("A valid prior run is required to retry this job.");
        }

        if (priorRun.status === "running") {
          return badRequest("In-progress runs cannot be retried.");
        }

        if (priorRun.status !== "failed" && priorRun.status !== "warning") {
          return badRequest("Only failed or warning runs can be retried.");
        }
      }

      const job = await runAdminRefreshJob({
        key,
        outcome: payload.outcome,
        note: payload.note,
      });

      if (!job) {
        return badRequest("Could not find the refresh job.");
      }

      const startedAt = new Date().toISOString();
      const run = await appendRefreshJobRun({
        jobKey: key,
        status: payload.outcome ?? "running",
        startedAt,
        finishedAt: payload.outcome && payload.outcome !== "running" ? startedAt : null,
        error: payload.outcome === "failed" ? payload.note ?? job.latestError : null,
        note: payload.note ?? null,
        requestedBy: user.email ?? "Admin",
        retriedFromRunId,
      });

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: payload.action === "retry" ? "refresh_job.retried" : "refresh_job.run_requested",
        targetType: "refresh_job",
        targetId: key,
        targetFamily: job.family,
        targetSlug: job.lane,
        summary:
          payload.action === "retry"
            ? `Retried refresh job ${job.name}.`
            : `Requested a manual run for refresh job ${job.name}.`,
        metadata: {
          outcome: payload.outcome ?? "running",
          retriedFromRunId,
        },
      });

      return NextResponse.json({
        ok: true,
        job,
        run,
        savedAt: run?.startedAt ?? job.lastOperatorActionAt ?? new Date().toISOString(),
        operation: payload.action === "retry" ? "retried" : "queued",
      });
    }

    const job = await saveAdminRefreshJob({
      key,
      enabled: payload.enabled,
      cadence: payload.cadence,
      latestStatus: payload.latestStatus,
      latestError: payload.latestError,
      nextScheduledRunAt: payload.nextScheduledRunAt,
      lastOperatorNote: payload.lastOperatorNote,
    });

    if (!job) {
      return badRequest("Could not find the refresh job.");
    }

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Admin",
      actionType: "refresh_job.updated",
      targetType: "refresh_job",
      targetId: key,
      targetFamily: job.family,
      targetSlug: job.lane,
      summary: `Updated refresh job ${job.name}.`,
      metadata: {
        enabled: job.enabled,
        cadence: job.cadence,
        latestStatus: job.latestStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      job,
      savedAt: job.lastOperatorActionAt ?? new Date().toISOString(),
      operation: "updated",
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
