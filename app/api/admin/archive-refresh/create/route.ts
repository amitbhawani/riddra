import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addArchiveRefreshRun } from "@/lib/archive-refresh-memory-store";

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      family?: string;
      sourceClass?: string;
      cadence?: string;
      status?: "Ready" | "In progress" | "Blocked" | "Planned";
      pendingWrites?: number;
      documentBacklog?: number;
      nextWindow?: string;
      coveragePosture?: string;
      nextStep?: string;
    };

    if (!payload.family?.trim()) {
      return NextResponse.json({ error: "Family is required." }, { status: 400 });
    }

    const memory = await addArchiveRefreshRun({
      family: payload.family.trim(),
      sourceClass: payload.sourceClass?.trim() || "Operator source class",
      cadence: payload.cadence?.trim() || "Operator scheduled",
      status: payload.status ?? "Planned",
      pendingWrites: Number(payload.pendingWrites ?? 0),
      documentBacklog: Number(payload.documentBacklog ?? 0),
      nextWindow: payload.nextWindow?.trim() || "Operator create saved without a next window yet.",
      coveragePosture: payload.coveragePosture?.trim() || "Operator create saved without a coverage posture note yet.",
      nextStep: payload.nextStep?.trim() || "Operator create saved without a next step yet.",
    });

    return NextResponse.json(memory);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create archive-refresh family." },
      { status: 500 },
    );
  }
}
