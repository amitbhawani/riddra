import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getAiGenerationRegistryRows, toAiGenerationRegistryCsv } from "@/lib/ai-generation-registry";

export async function GET() {
  await requireUser();
  const rows = await getAiGenerationRegistryRows();
  const csv = toAiGenerationRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ai-generation-registry.csv"',
    },
  });
}
