import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getEntitlementSyncRegistryRows,
  toEntitlementSyncRegistryCsv,
} from "@/lib/entitlement-sync-registry";

export async function GET() {
  const user = await requireUser();
  const rows = await getEntitlementSyncRegistryRows(user);
  const csv = toEntitlementSyncRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="entitlement-sync-registry.csv"',
    },
  });
}
