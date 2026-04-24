import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import {
  addBrokerLinkedAccount,
  removeBrokerLinkedAccount,
} from "@/lib/broker-sync-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    brokerName?: string;
    accountLabel?: string;
    linkageState?: "Sandbox linked" | "Needs verification" | "CSV fallback";
    lastSyncAt?: string;
    note?: string;
  };

  const brokerName = body.brokerName?.trim() ?? "";
  const accountLabel = body.accountLabel?.trim() ?? "";
  const linkageState = body.linkageState;
  const lastSyncAt = body.lastSyncAt?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!brokerName || !accountLabel || !linkageState || !lastSyncAt || !note) {
    return NextResponse.json(
      { error: "Broker name, account label, linkage state, last sync, and note are required." },
      { status: 400 },
    );
  }

  const brokerSyncMemory = await addBrokerLinkedAccount(user, {
    brokerName,
    accountLabel,
    linkageState,
    lastSyncAt,
    note,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/brokers",
    action: `Linked broker account: ${brokerName} · ${accountLabel}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: brokerSyncMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    storageMode: brokerSyncMemory.storageMode,
    linkedAccounts: brokerSyncMemory.linkedAccounts,
    summary: brokerSyncMemory.summary,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    brokerName?: string;
    accountLabel?: string;
  };

  const brokerName = body.brokerName?.trim() ?? "";
  const accountLabel = body.accountLabel?.trim() ?? "";

  if (!brokerName || !accountLabel) {
    return NextResponse.json(
      { error: "Broker name and account label are required." },
      { status: 400 },
    );
  }

  const brokerSyncMemory = await removeBrokerLinkedAccount(user, {
    brokerName,
    accountLabel,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/brokers",
    action: `Removed broker account link: ${brokerName} · ${accountLabel}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: brokerSyncMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    storageMode: brokerSyncMemory.storageMode,
    linkedAccounts: brokerSyncMemory.linkedAccounts,
    summary: brokerSyncMemory.summary,
  });
}
