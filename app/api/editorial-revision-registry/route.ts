import { NextResponse } from "next/server";

import {
  getEditorialRevisionRegistryRows,
  toEditorialRevisionRegistryCsv,
} from "@/lib/editorial-revision-registry";

export async function GET() {
  const rows = await getEditorialRevisionRegistryRows();
  const csv = toEditorialRevisionRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="editorial-revision-registry.csv"',
    },
  });
}
