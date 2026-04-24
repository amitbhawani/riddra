import { NextResponse } from "next/server";

import {
  getTrustSignoffRegistryRows,
  toTrustSignoffRegistryCsv,
} from "@/lib/trust-signoff-registry";

export async function GET() {
  const rows = getTrustSignoffRegistryRows();

  return new NextResponse(toTrustSignoffRegistryCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="trust-signoff-registry.csv"',
    },
  });
}
