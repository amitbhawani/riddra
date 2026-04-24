import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { addBrokerReviewItem } from "@/lib/broker-sync-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    broker?: string;
    issue?: string;
    action?: string;
    reviewState?: "Needs approval" | "Review manually" | "Keep existing";
    queueLane?: string;
    sourceRef?: string;
  };

  const broker = body.broker?.trim() ?? "";
  const issue = body.issue?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  const reviewState = body.reviewState;
  const queueLane = body.queueLane?.trim() ?? "";
  const sourceRef = body.sourceRef?.trim() ?? "";

  if (!broker || !issue || !action || !reviewState || !queueLane || !sourceRef) {
    return NextResponse.json(
      { error: "Broker, issue, action, review state, queue lane, and source ref are required." },
      { status: 400 },
    );
  }

  const brokerSyncMemory = await addBrokerReviewItem(user, {
    broker,
    issue,
    action,
    reviewState,
    queueLane,
    sourceRef,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/brokers/review",
    action: `Added broker review item: ${broker} · ${issue}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: brokerSyncMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    reviewItems: brokerSyncMemory.reviewItems,
    summary: brokerSyncMemory.summary,
  });
}
