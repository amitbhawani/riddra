import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getProviderConfigRegistryRows, toProviderConfigRegistryCsv } from "@/lib/provider-config-registry";

export async function GET() {
  await requireAdmin();
  const rows = getProviderConfigRegistryRows();
  const csv = toProviderConfigRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-provider-config-registry.csv"',
    },
  });
}
