import { NextResponse } from "next/server";

import {
  getCommunicationRegistryRows,
  toCommunicationRegistryCsv,
} from "@/lib/communication-readiness-registry";

export async function GET() {
  const rows = getCommunicationRegistryRows();
  const csv = toCommunicationRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="communication-readiness-registry.csv"',
    },
  });
}
