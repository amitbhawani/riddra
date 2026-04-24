import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addAiGenerationRun } from "@/lib/ai-generation-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    id?: string;
    workflow?: string;
    mode?: "Formula-first" | "Hybrid optional AI" | "On-demand AI";
    answerState?: "Stored" | "Queued" | "Needs live provider";
    groundingSource?: string;
    routeTarget?: string;
    costBand?: "Lowest cost" | "Budget watch" | "Controlled spend";
    note?: string;
  };

  const id = body.id?.trim() ?? "";
  const workflow = body.workflow?.trim() ?? "";
  const mode = body.mode;
  const answerState = body.answerState;
  const groundingSource = body.groundingSource?.trim() ?? "";
  const routeTarget = body.routeTarget?.trim() ?? "";
  const costBand = body.costBand;
  const note = body.note?.trim() ?? "";

  if (!id || !workflow || !mode || !answerState || !groundingSource || !routeTarget || !costBand || !note) {
    return NextResponse.json(
      { error: "Id, workflow, mode, answer state, grounding source, route target, cost band, and note are required." },
      { status: 400 },
    );
  }

  const aiMemory = await addAiGenerationRun({
    id,
    workflow,
    mode,
    answerState,
    groundingSource,
    routeTarget,
    costBand,
    note,
  });

  return NextResponse.json({
    ok: true,
    summary: aiMemory.summary,
    runs: aiMemory.generationRuns,
  });
}
