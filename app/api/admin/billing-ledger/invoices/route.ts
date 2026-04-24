import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addBillingInvoice, removeBillingInvoice } from "@/lib/billing-ledger-memory-store";

export async function POST(request: Request) {
  const user = await requireAdmin();
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

  return NextResponse.json({
    ok: true,
    updatedAt: billingMemory.updatedAt,
    invoices: billingMemory.invoices,
    relatedEvents: billingMemory.relatedEvents,
  });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  const body = (await request.json()) as {
    invoiceId?: string;
  };

  const invoiceId = body.invoiceId?.trim() ?? "";

  if (!invoiceId) {
    return NextResponse.json({ error: "Invoice id is required." }, { status: 400 });
  }

  const billingMemory = await removeBillingInvoice(user, { invoiceId });

  return NextResponse.json({
    ok: true,
    updatedAt: billingMemory.updatedAt,
    invoices: billingMemory.invoices,
    relatedEvents: billingMemory.relatedEvents,
  });
}
