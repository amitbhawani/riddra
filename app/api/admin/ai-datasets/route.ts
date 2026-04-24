import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addAiRetrievalDataset, removeAiRetrievalDataset, saveAiRetrievalDataset } from "@/lib/ai-generation-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    id?: string;
    source?: string;
    role?: string;
    status?: "Ready" | "Growing" | "Needs automation";
    retainedChunks?: number;
    routeTargets?: number;
    freshness?: string;
    groundingUse?: string;
    note?: string;
  };

  const id = body.id?.trim() ?? "";
  const source = body.source?.trim() ?? "";
  const role = body.role?.trim() ?? "";
  const status = body.status;
  const freshness = body.freshness?.trim() ?? "";
  const groundingUse = body.groundingUse?.trim() ?? "";
  const note = body.note?.trim() ?? "";
  const retainedChunks = Number(body.retainedChunks);
  const routeTargets = Number(body.routeTargets);

  if (!source || !status || !freshness || !groundingUse || !note || !Number.isFinite(retainedChunks) || !Number.isFinite(routeTargets)) {
    return NextResponse.json(
      { error: "Source, status, retained chunks, route targets, freshness, grounding use, and note are required." },
      { status: 400 },
    );
  }

  const aiMemory =
    id || role
      ? await addAiRetrievalDataset({
          id: id || `dataset_${source.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          source,
          role: role || "Operator-defined dataset",
          status,
          retainedChunks,
          routeTargets,
          freshness,
          groundingUse,
          note,
        })
      : await saveAiRetrievalDataset({
          source,
          status,
          retainedChunks,
          routeTargets,
          freshness,
          groundingUse,
          note,
        });

  return NextResponse.json({
    ok: true,
    summary: aiMemory.summary,
    datasets: aiMemory.datasets,
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as { source?: string };
  const source = body.source?.trim() ?? "";

  if (!source) {
    return NextResponse.json({ error: "Source is required." }, { status: 400 });
  }

  const aiMemory = await removeAiRetrievalDataset({ source });

  return NextResponse.json({
    ok: true,
    summary: aiMemory.summary,
    datasets: aiMemory.datasets,
  });
}
