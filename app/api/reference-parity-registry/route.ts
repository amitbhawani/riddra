import { NextResponse } from "next/server";

import {
  getReferenceParityRegistryRows,
  toReferenceParityRegistryCsv,
} from "@/lib/reference-parity";

export async function GET() {
  const rows = getReferenceParityRegistryRows();
  const csv = toReferenceParityRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reference-parity-registry.csv"',
    },
  });
}
