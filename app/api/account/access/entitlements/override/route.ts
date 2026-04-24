import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import {
  removeEntitlementSyncHistoryRow,
  saveEntitlementOverride,
} from "@/lib/entitlement-sync-memory-store";
import { getCurrentPlanTier } from "@/lib/plan-gating";

export async function POST(request: Request) {
  const user = await requireUser();
  const currentPlan = await getCurrentPlanTier();
  const body = (await request.json()) as {
    featureCode?: string;
    accessLevel?: string;
    reason?: string;
    route?: string;
  };

  const featureCode = body.featureCode?.trim() ?? "";
  const accessLevel = body.accessLevel?.trim() ?? "";
  const reason = body.reason?.trim() ?? "";
  const route = body.route?.trim() ?? "";

  if (!featureCode || !accessLevel || !reason) {
    return NextResponse.json(
      { error: "Feature code, access level, and reason are required." },
      { status: 400 },
    );
  }

  const entitlementMemory = await saveEntitlementOverride(user, currentPlan.plan, {
    featureCode,
    accessLevel,
    reason,
    route,
    actorType: "support",
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/access/entitlements",
    action: `Saved entitlement override: ${featureCode}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: entitlementMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    entitlements: entitlementMemory.entitlements,
    recentHistory: entitlementMemory.recentHistory,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const currentPlan = await getCurrentPlanTier();
  const body = (await request.json()) as {
    id?: string;
  };

  const id = body.id?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Override history row id is required." }, { status: 400 });
  }

  const entitlementMemory = await removeEntitlementSyncHistoryRow(user, currentPlan.plan, { id });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/access/entitlements",
    action: `Removed entitlement override history: ${id}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: entitlementMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    entitlements: entitlementMemory.entitlements,
    recentHistory: entitlementMemory.recentHistory,
  });
}
