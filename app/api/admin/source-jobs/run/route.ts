import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { recordJobRun, removeJobRun } from "@/lib/job-run-memory-store";
import { getSourceJobMemory, saveSourceJobRun } from "@/lib/source-job-memory-store";

const outcomes = new Set(["Succeeded", "Queued", "Needs review"]);

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      adapter?: string;
      outcome?: "Succeeded" | "Queued" | "Needs review";
      trigger?: string;
      affectedRows?: number;
      nextRunWindow?: string;
      resultSummary?: string;
    };

    const adapter = payload.adapter?.trim() ?? "";
    const outcome = payload.outcome && outcomes.has(payload.outcome) ? payload.outcome : "Succeeded";
    const trigger = payload.trigger?.trim() || "Manual operator run";
    const resultSummary = payload.resultSummary?.trim() || "Operator execution saved without a result note yet.";
    const affectedRows = Number.isFinite(payload.affectedRows) ? Math.max(0, Number(payload.affectedRows)) : 1;

    if (!adapter) {
      return NextResponse.json({ error: "Adapter is required." }, { status: 400 });
    }

    const sourceJobMemory = await getSourceJobMemory();
    const currentRun = sourceJobMemory.runs.find((item) => item.adapter === adapter);

    if (!currentRun) {
      return NextResponse.json({ error: "Adapter was not found." }, { status: 404 });
    }

    const nextRunWindow = payload.nextRunWindow?.trim() || currentRun.nextRunWindow;
    const nextQueueDepth = outcome === "Succeeded" ? Math.max(0, currentRun.queueDepth - Math.max(affectedRows, 1)) : currentRun.queueDepth;
    const nextRetryBacklog =
      outcome === "Needs review"
        ? currentRun.retryBacklog + 1
        : outcome === "Succeeded"
          ? Math.max(0, currentRun.retryBacklog - 1)
          : currentRun.retryBacklog;
    const nextStatus =
      outcome === "Succeeded" ? (nextQueueDepth === 0 && nextRetryBacklog === 0 ? "Ready" : "In progress") : outcome === "Needs review" ? "Blocked" : "In progress";

    const updatedMemory = await saveSourceJobRun({
      adapter,
      status: nextStatus,
      queueDepth: nextQueueDepth,
      retryBacklog: nextRetryBacklog,
      nextRunWindow,
      nextStep: `Latest execution: ${resultSummary}`,
    });

    const runMemory = await recordJobRun({
      lane: "source_jobs",
      target: adapter,
      outcome,
      trigger,
      affectedRows,
      nextWindow: nextRunWindow,
      resultSummary,
    });

    return NextResponse.json({
      ok: true,
      mode: "internal_preview_only",
      warning: "This source-job execution ledger is an internal preview desk. It does not run or reflect Trigger.dev worker execution.",
      summary: updatedMemory.summary,
      runSummary: runMemory.summary,
      runs: updatedMemory.runs,
      executionHistory: runMemory.runs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record source-job execution." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      id?: string;
    };

    const id = payload.id?.trim() ?? "";

    if (!id) {
      return NextResponse.json({ error: "Run id is required." }, { status: 400 });
    }

    const runMemory = await removeJobRun({
      lane: "source_jobs",
      id,
    });

    return NextResponse.json({
      ok: true,
      mode: "internal_preview_only",
      warning: "This source-job execution ledger is an internal preview desk. It does not run or reflect Trigger.dev worker execution.",
      runSummary: runMemory.summary,
      executionHistory: runMemory.runs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove source-job execution." },
      { status: 500 },
    );
  }
}
