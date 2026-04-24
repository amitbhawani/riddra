import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getCommunicationRegistryRows,
  toCommunicationRegistryCsv,
} from "@/lib/communication-readiness-registry";

export async function GET() {
  await requireAdmin();
  const rows = getCommunicationRegistryRows();
  const csv = toCommunicationRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-communication-readiness-registry.csv"',
    },
  });
}
