import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getBrokerAdapterRegistryRows, toBrokerAdapterRegistryCsv } from "@/lib/broker-adapter-registry";

export async function GET() {
  await requireAdmin();
  const rows = getBrokerAdapterRegistryRows();
  const csv = toBrokerAdapterRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="broker-adapter-registry.csv"',
    },
  });
}
