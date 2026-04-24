import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getProviderFallbackRegistryRows,
  toProviderFallbackRegistryCsv,
} from "@/lib/provider-fallback-registry";

export async function GET() {
  await requireAdmin();
  const rows = getProviderFallbackRegistryRows();
  const csv = toProviderFallbackRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-provider-fallback-registry.csv"',
    },
  });
}
