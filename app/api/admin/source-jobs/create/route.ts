import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addSourceJobRun } from "@/lib/source-job-memory-store";

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
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

    if (!payload.adapter?.trim()) {
      return NextResponse.json({ error: "Adapter is required." }, { status: 400 });
    }

    const memory = await addSourceJobRun({
      adapter: payload.adapter.trim(),
      domain: payload.domain?.trim() || "custom_source_domain",
      cadence: payload.cadence?.trim() || "Operator scheduled",
      status: payload.status ?? "Planned",
      queueDepth: Number(payload.queueDepth ?? 0),
      retryBacklog: Number(payload.retryBacklog ?? 0),
      nextRunWindow: payload.nextRunWindow?.trim() || "Operator create saved without a next run window yet.",
      cachePosture: payload.cachePosture?.trim() || "Operator create saved without a cache posture note yet.",
      nextStep: payload.nextStep?.trim() || "Operator create saved without a next step yet.",
    });

    return NextResponse.json({
      ...memory,
      mode: "internal_preview_only",
      warning: "This source-job desk is an internal preview lane. It does not drive Trigger.dev worker execution.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create source-job adapter." },
      { status: 500 },
    );
  }
}
