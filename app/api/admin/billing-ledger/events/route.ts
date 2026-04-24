import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addBillingEvent, removeBillingEvent } from "@/lib/billing-ledger-memory-store";

export async function POST(request: Request) {
  const user = await requireAdmin();
  const body = (await request.json()) as {
    event?: string;
    status?: string;
    subject?: string;
    note?: string;
  };

  const event = body.event?.trim() ?? "";
  const status = body.status?.trim() ?? "";
  const subject = body.subject?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!event || !status || !subject || !note) {
    return NextResponse.json(
      { error: "Event, status, subject, and note are required." },
      { status: 400 },
    );
  }

  const billingMemory = await addBillingEvent(user, {
    event,
    status,
    subject,
    note,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: billingMemory.updatedAt,
    relatedEvents: billingMemory.relatedEvents,
    lifecycleState: billingMemory.lifecycleState,
  });
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAdmin();
    const body = (await request.json()) as {
      id?: string;
    };

    const id = body.id?.trim() ?? "";

    if (!id) {
      return NextResponse.json({ error: "Event id is required." }, { status: 400 });
    }

    const billingMemory = await removeBillingEvent(user, { id });

    return NextResponse.json({
      ok: true,
      updatedAt: billingMemory.updatedAt,
      relatedEvents: billingMemory.relatedEvents,
      lifecycleState: billingMemory.lifecycleState,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove billing event." },
      { status: 500 },
    );
  }
}
