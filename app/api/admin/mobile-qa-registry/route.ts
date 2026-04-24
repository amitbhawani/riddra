import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getMobileQaRegistryRows,
  toMobileQaCsv,
} from "@/lib/mobile-qa-registry";

export async function GET() {
  await requireAdmin();
  const rows = getMobileQaRegistryRows();

  return new NextResponse(toMobileQaCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-mobile-qa-registry.csv"',
    },
  });
}
