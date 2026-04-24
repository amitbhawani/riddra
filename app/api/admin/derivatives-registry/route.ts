import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getDerivativesRegistryRows, toDerivativesRegistryCsv } from "@/lib/derivatives-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getDerivativesRegistryRows();
  const csv = toDerivativesRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-derivatives-registry.csv"',
    },
  });
}
