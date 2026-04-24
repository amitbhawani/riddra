import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getBillingLedgerRegistryRows,
  toBillingLedgerRegistryCsv,
} from "@/lib/billing-ledger-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getBillingLedgerRegistryRows(undefined, "admin");
  const csv = toBillingLedgerRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-billing-ledger-registry.csv"',
    },
  });
}
