import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getDerivativesRegistryRows, toDerivativesRegistryCsv } from "@/lib/derivatives-registry";

export async function GET() {
  await requireUser();
  const rows = await getDerivativesRegistryRows();
  const csv = toDerivativesRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="derivatives-registry.csv"',
    },
  });
}
