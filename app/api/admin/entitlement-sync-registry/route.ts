import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getEntitlementSyncRegistryRows,
  toEntitlementSyncRegistryCsv,
} from "@/lib/entitlement-sync-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getEntitlementSyncRegistryRows();
  const csv = toEntitlementSyncRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-entitlement-sync-registry.csv"',
    },
  });
}
