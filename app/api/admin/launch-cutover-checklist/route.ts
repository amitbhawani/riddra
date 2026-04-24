import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { saveLaunchCutoverChecklistItem } from "@/lib/launch-cutover-checklist-memory-store";

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      id?: string;
      completed?: boolean;
      detail?: string;
      note?: string;
    };

    if (!payload.id?.trim()) {
      return NextResponse.json({ error: "Checklist step is required." }, { status: 400 });
    }

    const memory = await saveLaunchCutoverChecklistItem({
      id: payload.id.trim(),
      completed: Boolean(payload.completed),
      detail: payload.detail ?? "",
      note: payload.note ?? "",
    });

    return NextResponse.json(memory);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save launch cutover step." },
      { status: 500 },
    );
  }
}
