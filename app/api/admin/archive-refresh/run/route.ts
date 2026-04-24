import { NextResponse } from "next/server";

import { getArchiveRefreshMemory } from "@/lib/archive-refresh-memory-store";
import { requireAdmin } from "@/lib/auth";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { removeJobRun } from "@/lib/job-run-memory-store";

const outcomes = new Set(["Succeeded", "Queued", "Needs review"]);

export async function POST(request: Request) {
  const user = await requireAdmin();

  try {
    const durableJobs = getDurableJobSystemReadiness();
    const payload = (await request.json()) as {
      family?: string;
      outcome?: "Succeeded" | "Queued" | "Needs review";
      trigger?: string;
      affectedRows?: number;
      nextWindow?: string;
      resultSummary?: string;
    };

    const family = payload.family?.trim() ?? "";
    const outcome = payload.outcome && outcomes.has(payload.outcome) ? payload.outcome : "Succeeded";
    const trigger = payload.trigger?.trim() || "Manual operator run";
    const resultSummary = payload.resultSummary?.trim() || "Operator archive execution saved without a result note yet.";
    const affectedRows = Number.isFinite(payload.affectedRows) ? Math.max(0, Number(payload.affectedRows)) : 1;

    if (!family) {
      return NextResponse.json({ error: "Family is required." }, { status: 400 });
    }

    if (!durableJobs.configured) {
      return NextResponse.json(
        {
          error: "Trigger.dev is not configured for archive refresh execution yet.",
          durableJobs,
        },
        { status: 503 },
      );
    }

    const archiveRefreshMemory = await getArchiveRefreshMemory();
    const currentRun = archiveRefreshMemory.runs.find((item) => item.family === family);

    if (!currentRun) {
      return NextResponse.json({ error: "Archive family was not found." }, { status: 404 });
    }

    const nextWindow = payload.nextWindow?.trim() || currentRun.nextWindow;
    const handle = await queueDurableJob({
      taskId: "archive-refresh-execution",
      payload: {
        family,
        outcome,
        trigger,
        affectedRows,
        nextWindow,
        resultSummary,
        requestedBy: user.email ?? user.id,
        source: "admin_source_mapping_desk",
      },
      idempotencyKey: `archive-refresh-execution:${family}:${new Date().toISOString()}`,
      tags: ["durable-job", "archive-refresh", "source-mapping"],
      metadata: {
        routeTarget: "/api/admin/archive-refresh/run",
        family,
        requestedBy: user.email ?? user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "durable_job_queued",
      summary: archiveRefreshMemory.summary,
      runs: archiveRefreshMemory.runs,
      job: {
        id: handle.id,
        taskId: "archive-refresh-execution",
      },
      delivery: {
        status: "queued",
        detail:
          "Archive refresh was queued into Trigger.dev. The shared execution ledger and research-archive memory will update after the durable worker finishes.",
      },
      durableJobs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record archive execution." },
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
      lane: "archive_refresh",
      id,
    });

    return NextResponse.json({
      ok: true,
      runSummary: runMemory.summary,
      executionHistory: runMemory.runs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove archive execution." },
      { status: 500 },
    );
  }
}
