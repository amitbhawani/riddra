import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getBillingLedgerRegistryRows,
  toBillingLedgerRegistryCsv,
} from "@/lib/billing-ledger-registry";

export async function GET() {
  const user = await requireUser();
  const rows = await getBillingLedgerRegistryRows(user, "account");
  const csv = toBillingLedgerRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="billing-ledger-registry.csv"',
    },
  });
}
