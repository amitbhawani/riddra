import { logger, task } from "@trigger.dev/sdk/v3";

import { getArchiveRefreshMemory, saveArchiveRefreshRun } from "@/lib/archive-refresh-memory-store";
import { recordJobRun } from "@/lib/job-run-memory-store";
import { upsertAutomatedResearchArchiveRecord } from "@/lib/research-archive-memory-store";

type ArchiveRefreshOutcome = "Succeeded" | "Queued" | "Needs review";

function resolveArchiveStatus(
  outcome: ArchiveRefreshOutcome,
  pendingWrites: number,
  documentBacklog: number,
) {
  if (outcome === "Succeeded") {
    return pendingWrites === 0 && documentBacklog === 0 ? "Ready" : "In progress";
  }

  if (outcome === "Needs review") {
    return "Blocked";
  }

  return "In progress";
}

export const archiveRefreshExecutionTask = task({
  id: "archive-refresh-execution",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 8_000,
    randomize: false,
  },
  run: async (payload: {
    family: string;
    outcome: ArchiveRefreshOutcome;
    trigger: string;
    affectedRows: number;
    nextWindow?: string;
    resultSummary: string;
    requestedBy: string;
    source: string;
  }) => {
    logger.info("Starting archive-refresh execution task", payload);

    const archiveRefreshMemory = await getArchiveRefreshMemory();
    const currentRun = archiveRefreshMemory.runs.find((item) => item.family === payload.family);

    if (!currentRun) {
      throw new Error(`Archive family was not found: ${payload.family}`);
    }

    const affectedRows = Number.isFinite(payload.affectedRows) ? Math.max(0, payload.affectedRows) : 1;
    const nextWindow = payload.nextWindow?.trim() || currentRun.nextWindow;
    const nextPendingWrites =
      payload.outcome === "Succeeded"
        ? Math.max(0, currentRun.pendingWrites - Math.max(affectedRows, 1))
        : currentRun.pendingWrites;
    const nextDocumentBacklog =
      payload.outcome === "Succeeded"
        ? Math.max(0, currentRun.documentBacklog - 1)
        : payload.outcome === "Needs review"
          ? currentRun.documentBacklog + 1
          : currentRun.documentBacklog;
    const nextStatus = resolveArchiveStatus(payload.outcome, nextPendingWrites, nextDocumentBacklog);

    const [updatedMemory, runMemory, archiveMemory] = await Promise.all([
      saveArchiveRefreshRun({
        family: payload.family,
        status: nextStatus,
        pendingWrites: nextPendingWrites,
        documentBacklog: nextDocumentBacklog,
        nextWindow,
        nextStep: `Latest execution: ${payload.resultSummary}`,
      }),
      recordJobRun({
        lane: "archive_refresh",
        target: payload.family,
        outcome: payload.outcome,
        trigger: payload.trigger,
        affectedRows,
        nextWindow,
        resultSummary: payload.resultSummary,
      }),
      upsertAutomatedResearchArchiveRecord({
        family: payload.family,
        outcome: payload.outcome,
        trigger: payload.trigger,
        affectedRows,
        nextWindow,
        resultSummary: payload.resultSummary,
      }),
    ]);

    logger.info("Completed archive-refresh execution task", {
      family: payload.family,
      outcome: payload.outcome,
      nextStatus,
      pendingWrites: nextPendingWrites,
      documentBacklog: nextDocumentBacklog,
      archiveRuns: runMemory.summary.archiveRuns,
      archiveRows: archiveMemory.summary.archivedRows,
    });

    return {
      requestedBy: payload.requestedBy,
      source: payload.source,
      family: payload.family,
      outcome: payload.outcome,
      status: nextStatus,
      summary: updatedMemory.summary,
      runSummary: runMemory.summary,
      archiveSummary: archiveMemory.summary,
    };
  },
});
