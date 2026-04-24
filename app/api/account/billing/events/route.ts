import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { addBillingEvent, removeBillingEvent } from "@/lib/billing-ledger-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
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
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/billing",
    action: `Saved billing event: ${event}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: billingMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    relatedEvents: billingMemory.relatedEvents,
    lifecycleState: billingMemory.lifecycleState,
  });
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      id?: string;
    };

    const id = body.id?.trim() ?? "";

    if (!id) {
      return NextResponse.json({ error: "Event id is required." }, { status: 400 });
    }

    const billingMemory = await removeBillingEvent(user, { id });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/billing",
      action: `Removed billing event: ${id}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: billingMemory.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
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
