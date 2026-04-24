import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getBrokerSyncRegistryRows, toBrokerSyncRegistryCsv } from "@/lib/broker-sync-registry";

export async function GET() {
  const user = await requireUser();
  const rows = await getBrokerSyncRegistryRows(user);
  const csv = toBrokerSyncRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="broker-sync-registry.csv"',
    },
  });
}
