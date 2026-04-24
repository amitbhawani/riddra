import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  removeSubscriptionLifecycleAccountJob,
  saveSubscriptionLifecycleAccountJob,
} from "@/lib/subscription-lifecycle-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    id?: string;
    title?: string;
    triggerEvent?: string;
    status?: "Queued" | "Running" | "Waiting on support" | "Ready to rerun";
    accountScope?: string;
    nextRun?: string;
    note?: string;
  };

  if (!body.id?.trim() || !body.title?.trim() || !body.triggerEvent?.trim() || !body.status || !body.accountScope?.trim() || !body.nextRun?.trim() || !body.note?.trim()) {
    return NextResponse.json(
      { error: "Job id, title, trigger event, status, account scope, next run, and note are required." },
      { status: 400 },
    );
  }

  const lifecycleMemory = await saveSubscriptionLifecycleAccountJob(user, {
    id: body.id,
    title: body.title,
    triggerEvent: body.triggerEvent,
    status: body.status,
    accountScope: body.accountScope,
    nextRun: body.nextRun,
    note: body.note,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: lifecycleMemory.updatedAt,
    jobs: lifecycleMemory.jobs,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as { id?: string };

  if (!body.id?.trim()) {
    return NextResponse.json({ error: "Lifecycle job id is required." }, { status: 400 });
  }

  const lifecycleMemory = await removeSubscriptionLifecycleAccountJob(user, {
    id: body.id.trim(),
  });

  return NextResponse.json({
    ok: true,
    updatedAt: lifecycleMemory.updatedAt,
    jobs: lifecycleMemory.jobs,
  });
}
