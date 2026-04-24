import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getBrokerSyncRegistryRows, toBrokerSyncRegistryCsv } from "@/lib/broker-sync-registry";

export async function GET() {
  const user = await requireAdmin();
  const rows = await getBrokerSyncRegistryRows(user, "admin");
  const csv = toBrokerSyncRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-broker-sync-registry.csv"',
    },
  });
}
