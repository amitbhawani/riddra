import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getLaunchEvidenceActionMemory,
  toLaunchEvidenceActionCsv,
} from "@/lib/launch-evidence-action-memory-store";

export async function GET(request: Request) {
  await requireAdmin();
  const format = new URL(request.url).searchParams.get("format");
  const memory = await getLaunchEvidenceActionMemory();

  if (format === "json") {
    return NextResponse.json(memory);
  }

  return new NextResponse(toLaunchEvidenceActionCsv(memory.items), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-launch-evidence-registry.csv"',
    },
  });
}
