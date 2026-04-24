import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  AdminOperatorValidationError,
  sanitizeAdminFailureMessage,
  sanitizeAdminMembershipTierInput,
} from "@/lib/admin-operator-guards";
import {
  getAdminMembershipTier,
  saveAdminMembershipTier,
  type SaveAdminMembershipTierInput,
} from "@/lib/admin-operator-store";
import { hasProductUserCapability } from "@/lib/product-permissions";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_memberships")) {
      throw new AdminOperatorValidationError("You do not have permission to manage membership tiers.", 403);
    }
    const payload = (await request.json()) as SaveAdminMembershipTierInput;

    if (!payload?.name || !payload?.slug) {
      return badRequest("Tier name and slug are required.");
    }

    const sanitized = sanitizeAdminMembershipTierInput(payload);
    const existing = await getAdminMembershipTier(sanitized.slug);
    const tier = await saveAdminMembershipTier(sanitized);

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Admin",
      actionType: existing ? "membership.updated" : "membership.created",
      targetType: "membership_tier",
      targetId: tier.slug,
      targetFamily: null,
      targetSlug: tier.slug,
      summary: `${existing ? "Updated" : "Created"} membership tier ${tier.name}.`,
      metadata: {
        visibility: tier.visibility,
        status: tier.status,
      },
    });

    return NextResponse.json({
      ok: true,
      tier,
      operation: existing ? "updated" : "created",
      savedAt: tier.updatedAt,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
