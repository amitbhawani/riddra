import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  sanitizeAdminFailureMessage,
  sanitizeAdminUserProfileInput,
} from "@/lib/admin-operator-guards";
import {
  listUserProductProfiles,
  removeUserProductProfile,
  saveUserProductProfile,
} from "@/lib/user-product-store";
import type { ProductUserCapability } from "@/lib/product-permissions";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      ok: true,
      users: await listUserProductProfiles(),
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const payload = (await request.json()) as {
      email?: string;
      name?: string | null;
      profileVisible?: boolean;
      membershipTier?: string | null;
      role?: "admin" | "editor" | "user";
      capabilities?: ProductUserCapability[];
    };

    if (!payload.email?.trim()) {
      return badRequest("Email is required.");
    }

    const existingUsers = await listUserProductProfiles();
    const existing = existingUsers.find(
      (item) => item.email.toLowerCase() === String(payload.email ?? "").trim().toLowerCase(),
    );
    const sanitized = sanitizeAdminUserProfileInput(payload);
    const result = await saveUserProductProfile(sanitized);
    const users = await listUserProductProfiles();

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Admin",
      actionType: result.operation === "created" ? "user.created" : "user.updated",
      targetType: "user_profile",
      targetId: result.profile.email,
      targetFamily: null,
      targetSlug: null,
      summary:
        result.operation === "created"
          ? `Created user ${result.profile.email} with role ${result.profile.role} and tier ${result.profile.membershipTier || "free"}.`
          : `Updated user ${result.profile.email} with role ${result.profile.role} and tier ${result.profile.membershipTier || "free"}.`,
      metadata: {
        role: result.profile.role,
        membershipTier: result.profile.membershipTier,
      },
    });

    if (existing && existing.role !== result.profile.role) {
      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "user.role_changed",
        targetType: "user_profile",
        targetId: result.profile.email,
        targetFamily: null,
        targetSlug: null,
        summary: `Changed ${result.profile.email} role from ${existing.role} to ${result.profile.role}.`,
        metadata: {
          previousRole: existing.role,
          nextRole: result.profile.role,
        },
      });
    }

    if (existing && existing.profileVisible !== result.profile.profileVisible) {
      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "user.visibility_changed",
        targetType: "user_profile",
        targetId: result.profile.email,
        targetFamily: null,
        targetSlug: null,
        summary: result.profile.profileVisible
          ? `Made ${result.profile.email} visible on the public profile route again.`
          : `Hid the public profile route for ${result.profile.email}.`,
        metadata: {
          previousVisibility: existing.profileVisible,
          nextVisibility: result.profile.profileVisible,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      profile: result.profile,
      users,
      operation: result.operation,
      storageMode: result.storageMode,
      savedAt: result.savedAt,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return badRequest("Email is required.");
    }

    if (user.email?.trim().toLowerCase() === email) {
      return badRequest("You cannot remove the admin account you are currently using.");
    }

    const result = await removeUserProductProfile({ email });
    const users = await listUserProductProfiles();

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Admin",
      actionType: "user.deleted",
      targetType: "user_profile",
      targetId: result.profile.email,
      targetFamily: null,
      targetSlug: null,
      summary: `Removed user ${result.profile.email} from the user registry.`,
      metadata: {
        role: result.profile.role,
        membershipTier: result.profile.membershipTier,
      },
    });

    return NextResponse.json({
      ok: true,
      removedProfile: result.profile,
      users,
      storageMode: result.storageMode,
      savedAt: result.savedAt,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
