import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { addWorkspaceSavedScreen, removeWorkspaceSavedScreen } from "@/lib/subscriber-workspace-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    title?: string;
    type?: string;
    note?: string;
    repeatRunCapable?: boolean;
    sharedLayout?: boolean;
  };

  const title = body.title?.trim() ?? "";
  const type = body.type?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!title || !type || !note) {
    return NextResponse.json({ error: "Title, type, and note are required." }, { status: 400 });
  }

  const workspace = await addWorkspaceSavedScreen(user, {
    title,
    type,
    note,
    repeatRunCapable: Boolean(body.repeatRunCapable),
    sharedLayout: Boolean(body.sharedLayout),
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/screens",
    action: `Saved workspace screen: ${title}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: workspace.updatedAt,
    storageMode: workspace.storageMode,
    continuityUpdatedAt: continuity.updatedAt,
    savedScreens: workspace.savedScreens,
    summary: workspace.savedScreenSummary,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    title?: string;
  };

  const title = body.title?.trim() ?? "";

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const workspace = await removeWorkspaceSavedScreen(user, { title });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/screens",
    action: `Removed workspace screen: ${title}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: workspace.updatedAt,
    storageMode: workspace.storageMode,
    continuityUpdatedAt: continuity.updatedAt,
    savedScreens: workspace.savedScreens,
    summary: workspace.savedScreenSummary,
  });
}
