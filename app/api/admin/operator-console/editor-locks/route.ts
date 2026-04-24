import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  heartbeatAdminEditorLock,
  releaseAdminEditorLock,
} from "@/lib/admin-editor-locks";
import {
  AdminOperatorValidationError,
  assertAdminFamily,
  assertAdminSlug,
  sanitizeAdminFailureMessage,
} from "@/lib/admin-operator-guards";
import { canEditAdminFamily } from "@/lib/product-permissions";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    const payload = (await request.json()) as {
      action?: "heartbeat" | "release";
      family?: string;
      slug?: string;
    };

    if (!payload?.family || !payload?.slug) {
      return badRequest("Family and slug are required.");
    }

    const family = assertAdminFamily(payload.family);
    if (!canEditAdminFamily(role, capabilities, family)) {
      throw new AdminOperatorValidationError(
        "You do not have permission to edit this content family.",
        403,
      );
    }

    const slug = assertAdminSlug(payload.slug);

    if (payload.action === "release") {
      const result = await releaseAdminEditorLock({
        family,
        slug,
        editorEmail: user.email ?? "Admin",
      });

      return NextResponse.json({ ok: true, locks: result.locks });
    }

    const result = await heartbeatAdminEditorLock({
      family,
      slug,
      editorUserId: user.id,
      editorEmail: user.email ?? "Admin",
    });

    return NextResponse.json({ ok: true, lock: result.lock, locks: result.locks });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
