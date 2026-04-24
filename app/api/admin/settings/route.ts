import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  AdminOperatorValidationError,
  sanitizeAdminFailureMessage,
  sanitizeAdminSystemSettingsInput,
} from "@/lib/admin-operator-guards";
import { hasProductUserCapability } from "@/lib/product-permissions";
import { getSystemSettings, saveSystemSettings } from "@/lib/user-product-store";

export async function GET() {
  try {
    const { role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_settings")) {
      throw new AdminOperatorValidationError("You do not have permission to view system settings.", 403);
    }

    return NextResponse.json({
      ok: true,
      settings: await getSystemSettings(),
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_settings")) {
      throw new AdminOperatorValidationError("You do not have permission to update system settings.", 403);
    }
    const payload = (await request.json()) as Record<string, unknown>;
    const changedFields = Object.keys(payload).filter((key) => payload[key] !== undefined);

    const result = await saveSystemSettings(sanitizeAdminSystemSettingsInput(payload));

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Admin",
      actionType: "settings.updated",
      targetType: "system_settings",
      targetId: "default",
      targetFamily: null,
      targetSlug: null,
      summary: `Updated system settings fields: ${changedFields.join(", ") || "default settings"}.`,
      metadata: {
        changedFields,
      },
    });

    return NextResponse.json({
      ok: true,
      settings: result.settings,
      storageMode: result.storageMode,
      savedAt: result.savedAt,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
