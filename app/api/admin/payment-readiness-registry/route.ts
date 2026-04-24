import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  paymentReadinessRegistryRows,
  toPaymentReadinessCsv,
} from "@/lib/payment-readiness-registry";

export async function GET() {
  await requireAdmin();

  return new NextResponse(toPaymentReadinessCsv(paymentReadinessRegistryRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-payment-readiness-registry.csv"',
    },
  });
}
