import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getPlaceholderHonestyRows,
  toPlaceholderHonestyCsv,
} from "@/lib/placeholder-honesty-registry";

export async function GET() {
  await requireAdmin();
  const rows = getPlaceholderHonestyRows();

  return new NextResponse(toPlaceholderHonestyCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-placeholder-honesty-registry.csv"',
    },
  });
}
