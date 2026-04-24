import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getTrustSignoffRegistryRows,
  toTrustSignoffRegistryCsv,
} from "@/lib/trust-signoff-registry";

export async function GET() {
  await requireAdmin();
  const rows = getTrustSignoffRegistryRows();

  return new NextResponse(toTrustSignoffRegistryCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-trust-signoff-registry.csv"',
    },
  });
}
