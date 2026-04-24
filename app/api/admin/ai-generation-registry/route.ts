import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getAiGenerationRegistryRows, toAiGenerationRegistryCsv } from "@/lib/ai-generation-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getAiGenerationRegistryRows();
  const csv = toAiGenerationRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-ai-generation-registry.csv"',
    },
  });
}
