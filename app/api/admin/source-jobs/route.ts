import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addSourceJobRun, removeSourceJobRun, saveSourceJobRun } from "@/lib/source-job-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    adapter?: string;
    domain?: string;
    cadence?: string;
    status?: "Ready" | "In progress" | "Blocked" | "Planned";
    queueDepth?: number;
    retryBacklog?: number;
    nextRunWindow?: string;
    cachePosture?: string;
    nextStep?: string;
  };

  const adapter = body.adapter?.trim() ?? "";
  const domain = body.domain?.trim() ?? "";
  const cadence = body.cadence?.trim() ?? "";
  const status = body.status;
  const nextRunWindow = body.nextRunWindow?.trim() ?? "";
  const cachePosture = body.cachePosture?.trim() ?? "";
  const nextStep = body.nextStep?.trim() ?? "";

  if (!adapter || !status || !nextRunWindow || !nextStep) {
    return NextResponse.json(
      { error: "Adapter, status, next run window, and next step are required." },
      { status: 400 },
    );
  }

  const sourceJobMemory =
    domain || cadence || cachePosture
      ? await addSourceJobRun({
          adapter,
          domain: domain || "custom_source_domain",
          cadence: cadence || "Operator scheduled",
          status,
          queueDepth: Number.isFinite(body.queueDepth) ? Number(body.queueDepth) : 0,
          retryBacklog: Number.isFinite(body.retryBacklog) ? Number(body.retryBacklog) : 0,
          nextRunWindow,
          cachePosture: cachePosture || "Operator create saved without a cache posture note yet.",
          nextStep,
        })
      : await saveSourceJobRun({
          adapter,
          status,
          queueDepth: Number.isFinite(body.queueDepth) ? Number(body.queueDepth) : 0,
          retryBacklog: Number.isFinite(body.retryBacklog) ? Number(body.retryBacklog) : 0,
          nextRunWindow,
          nextStep,
        });

  return NextResponse.json({
    ok: true,
    mode: "internal_preview_only",
    warning: "This source-job desk is an internal preview lane. It does not drive Trigger.dev worker execution.",
    summary: sourceJobMemory.summary,
    runs: sourceJobMemory.runs,
    hotCacheLanes: sourceJobMemory.hotCacheLanes,
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as { adapter?: string };

  const adapter = body.adapter?.trim() ?? "";

  if (!adapter) {
    return NextResponse.json({ error: "Adapter is required." }, { status: 400 });
  }

  const sourceJobMemory = await removeSourceJobRun({ adapter });

  return NextResponse.json({
    ok: true,
    mode: "internal_preview_only",
    warning: "This source-job desk is an internal preview lane. It does not drive Trigger.dev worker execution.",
    summary: sourceJobMemory.summary,
    runs: sourceJobMemory.runs,
    hotCacheLanes: sourceJobMemory.hotCacheLanes,
  });
}
