import { NextResponse } from "next/server";

import {
  getConversionPathRegistryRows,
  toConversionPathRegistryCsv,
} from "@/lib/conversion-path-audit";

export async function GET() {
  const rows = getConversionPathRegistryRows();
  const csv = toConversionPathRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="conversion-path-registry.csv"',
    },
  });
}
