import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  removeSubscriptionRecoveryAction,
  saveSubscriptionRecoveryAction,
} from "@/lib/subscription-lifecycle-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    title?: string;
    status?: "Queued" | "Subscriber review" | "Ready to send" | "Awaiting support";
    channel?: string;
    dueAt?: string;
    note?: string;
  };

  if (!body.title?.trim() || !body.status || !body.channel?.trim() || !body.dueAt?.trim() || !body.note?.trim()) {
    return NextResponse.json(
      { error: "Title, status, channel, due-at value, and note are required." },
      { status: 400 },
    );
  }

  const lifecycleMemory = await saveSubscriptionRecoveryAction(user, {
    title: body.title,
    status: body.status,
    channel: body.channel,
    dueAt: body.dueAt,
    note: body.note,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: lifecycleMemory.updatedAt,
    recoveryActions: lifecycleMemory.recoveryActions,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as { title?: string };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Recovery action title is required." }, { status: 400 });
  }

  const lifecycleMemory = await removeSubscriptionRecoveryAction(user, {
    title: body.title.trim(),
  });

  return NextResponse.json({
    ok: true,
    updatedAt: lifecycleMemory.updatedAt,
    recoveryActions: lifecycleMemory.recoveryActions,
  });
}
