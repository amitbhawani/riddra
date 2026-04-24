import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addAiGenerationRun, removeAiGenerationRun, saveAiGenerationRun } from "@/lib/ai-generation-memory-store";

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

  if (!workflow || !answerState || !groundingSource || !routeTarget || !costBand || !note) {
    return NextResponse.json(
      { error: "Workflow, answer state, grounding source, route target, cost band, and note are required." },
      { status: 400 },
    );
  }

  const aiMemory =
    id || mode
      ? await addAiGenerationRun({
          id: id || `run_${workflow.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          workflow,
          mode: mode || "Formula-first",
          answerState,
          groundingSource,
          routeTarget,
          costBand,
          note,
        })
      : await saveAiGenerationRun({
          workflow,
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

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as { workflow?: string };
  const workflow = body.workflow?.trim() ?? "";

  if (!workflow) {
    return NextResponse.json({ error: "Workflow is required." }, { status: 400 });
  }

  const aiMemory = await removeAiGenerationRun({ workflow });

  return NextResponse.json({
    ok: true,
    summary: aiMemory.summary,
    runs: aiMemory.generationRuns,
  });
}
