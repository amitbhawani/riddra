import { NextResponse } from "next/server";

import {
  getProviderFallbackRegistryRows,
  toProviderFallbackRegistryCsv,
} from "@/lib/provider-fallback-registry";

export async function GET() {
  const rows = getProviderFallbackRegistryRows();
  const csv = toProviderFallbackRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="provider-fallback-registry.csv"',
    },
  });
}
