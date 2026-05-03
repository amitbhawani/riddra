import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  AdminOperatorValidationError,
  assertAdminFamily,
  assertAdminSlug,
  sanitizeAdminFailureMessage,
  sanitizeAdminRecordPayload,
} from "@/lib/admin-operator-guards";
import { getAdminRecordEditorData } from "@/lib/admin-content-registry";
import type { SaveAdminRecordInput } from "@/lib/admin-operator-store";
import { getAdminManagedRecord } from "@/lib/admin-operator-store";
import { canEditAdminFamily } from "@/lib/product-permissions";
import { createCmsPreviewSession, getAdminSystemSettings } from "@/lib/user-product-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    const settings = await getAdminSystemSettings();

    if (!settings.previewEnabled) {
      return NextResponse.json({ error: "Draft preview is currently disabled in system settings." }, { status: 403 });
    }

    const payload = (await request.json()) as SaveAdminRecordInput & { family: string };

    if (!payload?.family || !payload?.slug || !payload?.title) {
      return badRequest("Family, slug, and title are required.");
    }

    const family = assertAdminFamily(payload.family);
    if (!canEditAdminFamily(role, capabilities, family)) {
      throw new AdminOperatorValidationError("You do not have permission to preview this content family.", 403);
    }
    const slug = assertAdminSlug(payload.slug);
    const existing = await getAdminManagedRecord(family, slug);
    const editorRecord = await getAdminRecordEditorData(family, slug, existing);
    const safePayload = sanitizeAdminRecordPayload(payload, family, editorRecord, existing);
    const preview = await createCmsPreviewSession({
      family,
      slug: safePayload.slug,
      title: safePayload.title,
      routeTarget: safePayload.publicHref ?? safePayload.canonicalRoute ?? null,
      createdBy: user.email ?? "Operator",
      payload: safePayload,
    });

    return NextResponse.json({
      ok: true,
      previewUrl: `/preview/${preview.token}`,
      preview,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
