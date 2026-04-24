import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  AdminOperatorValidationError,
  assertAdminMediaUpload,
  sanitizeAdminExternalMediaAssetInput,
  sanitizeAdminFailureMessage,
} from "@/lib/admin-operator-guards";
import { hasProductUserCapability } from "@/lib/product-permissions";
import {
  getSystemSettings,
  listMediaAssets,
  saveMediaAsset,
  saveUploadedMediaAsset,
} from "@/lib/user-product-store";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const { role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_media")) {
      throw new AdminOperatorValidationError("You do not have permission to view the media library.", 403);
    }

    return NextResponse.json({
      ok: true,
      assets: await listMediaAssets(),
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_media")) {
      throw new AdminOperatorValidationError("You do not have permission to manage media assets.", 403);
    }
    const settings = await getSystemSettings();

    if (!settings.mediaUploadsEnabled) {
      return NextResponse.json(
        { error: "Media uploads are currently disabled in system settings." },
        { status: 403 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const title = String(formData.get("title") ?? "").trim();
      const altText = String(formData.get("altText") ?? "").trim();
      const category = String(formData.get("category") ?? "").trim();

      if (!(file instanceof File)) {
        return badRequest("Image file is required.");
      }

      const safeUpload = assertAdminMediaUpload({
        name: file.name,
        type: file.type,
        size: file.size,
      });

      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await saveUploadedMediaAsset({
        title: title || safeUpload.fileName,
        altText,
        category,
        fileName: safeUpload.fileName,
        mimeType: safeUpload.mimeType,
        bytes,
        uploadedBy: user.email ?? "Operator",
      });
      const assets = await listMediaAssets();
      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Operator",
        actionType: result.operation === "created" ? "media_asset.created" : "media_asset.updated",
        targetType: "media_asset",
        targetId: result.asset.id,
        targetFamily: null,
        targetSlug: result.asset.fileName || result.asset.id,
        summary:
          result.operation === "created"
            ? `Added media asset ${result.asset.title}.`
            : `Updated media asset ${result.asset.title}.`,
        metadata: {
          assetType: result.asset.assetType,
          sourceKind: result.asset.sourceKind,
          storageMode: result.storageMode,
          status: result.asset.status,
        },
      });

      return NextResponse.json({
        ok: true,
        asset: result.asset,
        assets,
        operation: result.operation,
        storageMode: result.storageMode,
        savedAt: result.savedAt,
      });
    }

    const payload = (await request.json()) as {
      title?: string;
      altText?: string;
      url?: string;
      assetType?: "image" | "document";
      category?: string;
      tags?: string[];
      status?: "draft" | "published";
    };
    const safePayload = sanitizeAdminExternalMediaAssetInput(payload);

    if (!safePayload.url) {
      return badRequest("Asset URL is required.");
    }

    const result = await saveMediaAsset({
      title: safePayload.title || safePayload.url,
      altText: safePayload.assetType === "image" ? safePayload.altText || "" : "",
      url: safePayload.url,
      assetType: safePayload.assetType,
      category: safePayload.category || (safePayload.assetType === "document" ? "document" : "content"),
      sourceKind: "external_url",
      fileName:
        safePayload.url.split("/").pop() ??
        (safePayload.assetType === "document" ? "external-document" : "external-image"),
      mimeType: safePayload.assetType === "document" ? "application/pdf" : "image/jpeg",
      tags: safePayload.tags,
      uploadedBy: user.email ?? "Operator",
      status: safePayload.status,
    });
    const assets = await listMediaAssets();
    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: result.operation === "created" ? "media_asset.created" : "media_asset.updated",
      targetType: "media_asset",
      targetId: result.asset.id,
      targetFamily: null,
      targetSlug: result.asset.fileName || result.asset.id,
      summary:
        result.operation === "created"
          ? `Added media asset ${result.asset.title}.`
          : `Updated media asset ${result.asset.title}.`,
      metadata: {
        assetType: result.asset.assetType,
        sourceKind: result.asset.sourceKind,
        storageMode: result.storageMode,
        status: result.asset.status,
      },
    });

    return NextResponse.json({
      ok: true,
      asset: result.asset,
      assets,
      operation: result.operation,
      storageMode: result.storageMode,
      savedAt: result.savedAt,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_media")) {
      throw new AdminOperatorValidationError("You do not have permission to manage media assets.", 403);
    }

    const payload = (await request.json()) as {
      id?: string;
      title?: string;
      altText?: string;
      category?: string;
      status?: "draft" | "published";
    };

    if (!payload.id) {
      return badRequest("Media asset ID is required.");
    }

    const existing = (await listMediaAssets()).find((asset) => asset.id === String(payload.id).trim()) ?? null;
    if (!existing) {
      return NextResponse.json({ error: "That media asset could not be found." }, { status: 404 });
    }

    const result = await saveMediaAsset({
      ...existing,
      id: existing.id,
      title: String(payload.title ?? existing.title).trim().slice(0, 160) || existing.title,
      altText:
        existing.assetType === "image"
          ? String(payload.altText ?? existing.altText).trim().slice(0, 240)
          : "",
      category: String(payload.category ?? existing.category).trim().slice(0, 80) || existing.category,
      status: payload.status === "draft" || payload.status === "published" ? payload.status : existing.status,
    });
    const assets = await listMediaAssets();

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: "media_asset.updated",
      targetType: "media_asset",
      targetId: result.asset.id,
      targetFamily: null,
      targetSlug: result.asset.fileName || result.asset.id,
      summary: `Updated media asset ${result.asset.title}.`,
      metadata: {
        assetType: result.asset.assetType,
        sourceKind: result.asset.sourceKind,
        storageMode: result.storageMode,
        status: result.asset.status,
      },
    });

    return NextResponse.json({
      ok: true,
      asset: result.asset,
      assets,
      operation: result.operation,
      storageMode: result.storageMode,
      savedAt: result.savedAt,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
