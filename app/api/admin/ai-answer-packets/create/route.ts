import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addAiAnswerPacket } from "@/lib/ai-generation-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    id?: string;
    workflow?: string;
    audience?: string;
    routeTarget?: string;
    continuityState?: "Stored packet" | "Preview packet" | "Needs live provider";
    groundingSources?: string;
    answerShape?: string;
    note?: string;
  };

  const id = body.id?.trim() ?? "";
  const workflow = body.workflow?.trim() ?? "";
  const audience = body.audience?.trim() ?? "";
  const routeTarget = body.routeTarget?.trim() ?? "";
  const continuityState = body.continuityState;
  const groundingSources = body.groundingSources?.trim() ?? "";
  const answerShape = body.answerShape?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!id || !workflow || !audience || !routeTarget || !continuityState || !groundingSources || !answerShape || !note) {
    return NextResponse.json(
      { error: "Id, workflow, audience, route target, continuity state, grounding sources, answer shape, and note are required." },
      { status: 400 },
    );
  }

  const aiMemory = await addAiAnswerPacket({
    id,
    workflow,
    audience,
    routeTarget,
    continuityState,
    groundingSources,
    answerShape,
    note,
  });

  return NextResponse.json({
    ok: true,
    summary: aiMemory.summary,
    packets: aiMemory.answerPackets,
  });
}
