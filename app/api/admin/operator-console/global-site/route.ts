import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  sanitizeAdminFailureMessage,
  sanitizeAdminGlobalCollectionInput,
} from "@/lib/admin-operator-guards";
import {
  appendAdminGlobalRevision,
  saveAdminGlobalCollection,
  type AdminGlobalCollectionKey,
  type AdminGlobalModule,
} from "@/lib/admin-operator-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const allowedSections = new Set<AdminGlobalCollectionKey>([
  "sharedBlocks",
  "banners",
  "routeStrips",
  "marketModules",
]);

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const payload = (await request.json()) as {
      section: AdminGlobalCollectionKey;
      items: AdminGlobalModule[];
      mode?: "draft" | "publish";
    };

    if (!payload?.section || !Array.isArray(payload.items)) {
      return badRequest("Section and items are required.");
    }

    const safeInput = sanitizeAdminGlobalCollectionInput(payload.section, payload.items);

    if (!allowedSections.has(safeInput.section)) {
      return badRequest("Unsupported global-site section.");
    }

    const items = await saveAdminGlobalCollection(safeInput);
    const savedAt = items[0]?.updatedAt ?? new Date().toISOString();

    await appendAdminGlobalRevision({
      section: safeInput.section,
      title: safeInput.section,
      editor: user.email ?? "Admin",
      action:
        payload.mode === "publish"
          ? "Published global site collection"
          : "Saved global site collection draft",
      status:
        payload.mode === "publish" || items.some((item) => item.status === "published")
          ? "published"
          : "draft",
      changedCount: items.length,
    });
    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Admin",
      actionType: payload.mode === "publish" ? "global_site.published" : "global_site.saved",
      targetType: "global_site_section",
      targetId: safeInput.section,
      targetFamily: null,
      targetSlug: safeInput.section,
      summary:
        payload.mode === "publish"
          ? `Published global site ${safeInput.section}.`
          : `Saved global site ${safeInput.section} draft.`,
      metadata: {
        section: safeInput.section,
        changedCount: items.length,
        storageMode: "operator_backbone",
      },
    });

    return NextResponse.json({ ok: true, items, savedAt });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
