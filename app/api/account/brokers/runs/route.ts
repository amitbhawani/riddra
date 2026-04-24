import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { createBrokerSyncRun, removeBrokerSyncRun } from "@/lib/broker-sync-memory-store";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const durableJobs = getDurableJobSystemReadiness();
    const body = (await request.json()) as {
      broker?: string;
      queueState?: "Queued" | "Reviewing" | "Ready to rerun";
      accountScope?: string;
      nextWindow?: string;
      note?: string;
    };

    const broker = body.broker?.trim() ?? "";
    const queueState = body.queueState;
    const accountScope = body.accountScope?.trim() ?? "";
    const nextWindow = body.nextWindow?.trim() ?? "";
    const note = body.note?.trim() ?? "";

    if (!broker || !queueState || !accountScope || !nextWindow || !note) {
      return NextResponse.json(
        { error: "Broker, queue state, account scope, next window, and note are required." },
        { status: 400 },
      );
    }

    if (!durableJobs.configured) {
      return NextResponse.json(
        {
          error: "Trigger.dev is not configured for broker sync execution yet.",
          durableJobs,
        },
        { status: 503 },
      );
    }

    const memory = await createBrokerSyncRun(user, {
      broker,
      queueState,
      accountScope,
      nextWindow,
      note,
    });
    const handle = await queueDurableJob({
      taskId: "broker-sync-execution",
      payload: {
        user: {
          id: user.id,
          email: user.email ?? `${user.id}@local-preview.riddra`,
        },
        broker,
        accountScope,
        nextWindow,
        trigger: "Broker connections route",
        note,
        source: "/account/brokers",
      },
      idempotencyKey: `broker-sync-execution:${user.id}:${broker}:${accountScope}:${memory.updatedAt}`,
      tags: ["durable-job", "broker-sync", "subscriber"],
      metadata: {
        routeTarget: "/api/account/brokers/runs",
        requestedBy: user.email ?? user.id,
        broker,
        accountScope,
      },
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/brokers",
      action: `Created broker sync run: ${broker} · ${accountScope}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: memory.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      storageMode: memory.storageMode,
      job: {
        id: handle.id,
        taskId: "broker-sync-execution",
      },
      syncRuns: memory.syncRuns,
      summary: memory.summary,
      activityLog: memory.activityLog,
      durableJobs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save broker sync run." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      broker?: string;
      accountScope?: string;
    };

    const broker = body.broker?.trim() ?? "";
    const accountScope = body.accountScope?.trim() ?? "";

    if (!broker || !accountScope) {
      return NextResponse.json({ error: "Broker and account scope are required." }, { status: 400 });
    }

    const memory = await removeBrokerSyncRun(user, {
      broker,
      accountScope,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/brokers",
      action: `Removed broker sync run: ${broker} · ${accountScope}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: memory.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      storageMode: memory.storageMode,
      syncRuns: memory.syncRuns,
      summary: memory.summary,
      activityLog: memory.activityLog,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove broker sync run." },
      { status: 500 },
    );
  }
}
