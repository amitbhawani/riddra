import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { addBrokerSyncTarget, removeBrokerSyncTarget } from "@/lib/broker-sync-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    brokerName?: string;
    status?: "Priority" | "Planned" | "Later";
    tokenState?: "Pending token" | "Sandbox token" | "Review required";
    syncMode?: "CSV fallback" | "Approval-first API sync" | "Manual review queue";
    note?: string;
  };

  const brokerName = body.brokerName?.trim() ?? "";
  const status = body.status;
  const tokenState = body.tokenState;
  const syncMode = body.syncMode;
  const note = body.note?.trim() ?? "";

  if (!brokerName || !status || !tokenState || !syncMode || !note) {
    return NextResponse.json(
      { error: "Broker name, status, token state, sync mode, and note are required." },
      { status: 400 },
    );
  }

  const brokerSyncMemory = await addBrokerSyncTarget(user, {
    brokerName,
    status,
    tokenState,
    syncMode,
    note,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/brokers",
    action: `Added broker target: ${brokerName}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: brokerSyncMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    storageMode: brokerSyncMemory.storageMode,
    targets: brokerSyncMemory.targets,
    summary: brokerSyncMemory.summary,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    brokerName?: string;
  };

  const brokerName = body.brokerName?.trim() ?? "";

  if (!brokerName) {
    return NextResponse.json({ error: "Broker name is required." }, { status: 400 });
  }

  const brokerSyncMemory = await removeBrokerSyncTarget(user, { brokerName });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/brokers",
    action: `Removed broker target: ${brokerName}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: brokerSyncMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    storageMode: brokerSyncMemory.storageMode,
    targets: brokerSyncMemory.targets,
    summary: brokerSyncMemory.summary,
  });
}
