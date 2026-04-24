import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { addBillingInvoice, removeBillingInvoice } from "@/lib/billing-ledger-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    invoiceId?: string;
    planName?: string;
    amount?: string;
    status?: "Paid" | "Failed" | "Upcoming";
    note?: string;
  };

  const invoiceId = body.invoiceId?.trim() ?? "";
  const planName = body.planName?.trim() ?? "";
  const amount = body.amount?.trim() ?? "";
  const note = body.note?.trim() ?? "";
  const status = body.status;

  if (!invoiceId || !planName || !amount || !note || !status) {
    return NextResponse.json(
      { error: "Invoice id, plan name, amount, status, and note are required." },
      { status: 400 },
    );
  }

  const billingMemory = await addBillingInvoice(user, {
    invoiceId,
    planName,
    amount,
    status,
    note,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/billing",
    action: `Saved billing invoice: ${invoiceId}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: billingMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    invoices: billingMemory.invoices,
    relatedEvents: billingMemory.relatedEvents,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    invoiceId?: string;
  };

  const invoiceId = body.invoiceId?.trim() ?? "";

  if (!invoiceId) {
    return NextResponse.json({ error: "Invoice id is required." }, { status: 400 });
  }

  const billingMemory = await removeBillingInvoice(user, { invoiceId });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/billing",
    action: `Removed billing invoice: ${invoiceId}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: billingMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    invoices: billingMemory.invoices,
    relatedEvents: billingMemory.relatedEvents,
  });
}
