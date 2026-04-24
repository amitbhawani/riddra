import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getReferenceParityRegistryRows,
  toReferenceParityRegistryCsv,
} from "@/lib/reference-parity";

export async function GET() {
  await requireAdmin();
  const rows = getReferenceParityRegistryRows();
  const csv = toReferenceParityRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-reference-parity-registry.csv"',
    },
  });
}
