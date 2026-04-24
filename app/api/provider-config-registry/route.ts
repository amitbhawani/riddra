import { NextResponse } from "next/server";

import { getProviderConfigRegistryRows, toProviderConfigRegistryCsv } from "@/lib/provider-config-registry";

export async function GET() {
  const rows = getProviderConfigRegistryRows();
  const csv = toProviderConfigRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="provider-config-registry.csv"',
    },
  });
}
