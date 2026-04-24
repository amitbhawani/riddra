import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getConversionPathRegistryRows,
  toConversionPathRegistryCsv,
} from "@/lib/conversion-path-audit";

export async function GET() {
  await requireAdmin();
  const rows = getConversionPathRegistryRows();
  const csv = toConversionPathRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-conversion-path-registry.csv"',
    },
  });
}
