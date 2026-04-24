import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getEditorialRevisionRegistryRows,
  toEditorialRevisionRegistryCsv,
} from "@/lib/editorial-revision-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getEditorialRevisionRegistryRows();
  const csv = toEditorialRevisionRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-editorial-revision-registry.csv"',
    },
  });
}
