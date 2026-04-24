import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  removeSubscriptionRecoveryOpsAction,
  saveSubscriptionRecoveryOpsAction,
} from "@/lib/subscription-lifecycle-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
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

  const lifecycleMemory = await saveSubscriptionRecoveryOpsAction({
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
  await requireAdmin();
  const body = (await request.json()) as { title?: string };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Recovery action title is required." }, { status: 400 });
  }

  const lifecycleMemory = await removeSubscriptionRecoveryOpsAction({
    title: body.title.trim(),
  });

  return NextResponse.json({
    ok: true,
    updatedAt: lifecycleMemory.updatedAt,
    recoveryActions: lifecycleMemory.recoveryActions,
  });
}
