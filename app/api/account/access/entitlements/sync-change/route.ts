import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { getCurrentPlanTier } from "@/lib/plan-gating";
import { recordEntitlementSyncChange, removeEntitlementSyncHistoryRow } from "@/lib/entitlement-sync-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const currentPlan = await getCurrentPlanTier();
  const body = (await request.json()) as {
    featureCode?: string;
    nextLevel?: string;
    reason?: string;
    syncState?: "Synced" | "Needs review";
    actorType?: "system" | "support" | "ops";
    actorRef?: string;
    route?: string;
  };

  if (!body.featureCode?.trim() || !body.nextLevel?.trim() || !body.reason?.trim() || !body.syncState) {
    return NextResponse.json(
      { error: "Feature code, next level, reason, and sync state are required." },
      { status: 400 },
    );
  }

  const entitlementMemory = await recordEntitlementSyncChange(user, currentPlan.plan, {
    featureCode: body.featureCode,
    nextLevel: body.nextLevel,
    reason: body.reason,
    syncState: body.syncState,
    actorType: body.actorType,
    actorRef: body.actorRef,
    route: body.route,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/access/entitlements",
    action: `Recorded entitlement sync change: ${body.featureCode}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: entitlementMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    recentHistory: entitlementMemory.recentHistory,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const currentPlan = await getCurrentPlanTier();
  const body = (await request.json()) as {
    id?: string;
  };

  if (!body.id?.trim()) {
    return NextResponse.json({ error: "History row id is required." }, { status: 400 });
  }

  try {
    const entitlementMemory = await removeEntitlementSyncHistoryRow(user, currentPlan.plan, {
      id: body.id,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/access/entitlements",
      action: `Removed entitlement sync history: ${body.id}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: entitlementMemory.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      recentHistory: entitlementMemory.recentHistory,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove entitlement history row." },
      { status: 400 },
    );
  }
}
