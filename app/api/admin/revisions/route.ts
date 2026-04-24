import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { removeEditorialRevision, saveEditorialRevision } from "@/lib/editorial-revision-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    asset?: string;
    assetType?: string;
    editor?: string;
    action?: string;
    changedFields?: string;
    reason?: string;
    revisionState?: "Published" | "Review ready" | "Rollback staged";
    routeTarget?: string;
  };

  const asset = body.asset?.trim() ?? "";
  const assetType = body.assetType?.trim() ?? "";
  const editor = body.editor?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  const changedFields = body.changedFields?.trim() ?? "";
  const reason = body.reason?.trim() ?? "";
  const revisionState = body.revisionState;
  const routeTarget = body.routeTarget?.trim() ?? "";

  if (!asset || !assetType || !editor || !action || !changedFields || !reason || !revisionState || !routeTarget) {
    return NextResponse.json(
      { error: "Asset, asset type, editor, action, changed fields, reason, revision state, and route target are required." },
      { status: 400 },
    );
  }

  const revisionMemory = await saveEditorialRevision({
    asset,
    assetType,
    editor,
    action,
    changedFields,
    reason,
    revisionState,
    routeTarget,
  });

  return NextResponse.json({
    ok: true,
    summary: revisionMemory.summary,
    revisions: revisionMemory.revisions,
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    id?: string;
  };

  const id = body.id?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Revision id is required." }, { status: 400 });
  }

  try {
    const revisionMemory = await removeEditorialRevision({ id });

    return NextResponse.json({
      ok: true,
      summary: revisionMemory.summary,
      revisions: revisionMemory.revisions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove revision entry." },
      { status: 400 },
    );
  }
}
