import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { addWorkspaceWatchlist, removeWorkspaceWatchlist } from "@/lib/subscriber-workspace-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    title?: string;
    assetCount?: number;
    linkedAlerts?: number;
    note?: string;
  };

  const title = body.title?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!title || !note) {
    return NextResponse.json({ error: "Title and note are required." }, { status: 400 });
  }

  const workspace = await addWorkspaceWatchlist(user, {
    title,
    assetCount: Number.isFinite(body.assetCount) ? Number(body.assetCount) : 0,
    linkedAlerts: Number.isFinite(body.linkedAlerts) ? Number(body.linkedAlerts) : 0,
    note,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/watchlists",
    action: `Saved workspace watchlist: ${title}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: workspace.updatedAt,
    storageMode: workspace.storageMode,
    continuityUpdatedAt: continuity.updatedAt,
    watchlists: workspace.watchlists,
    summary: workspace.watchlistSummary,
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

  const workspace = await removeWorkspaceWatchlist(user, { title });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/watchlists",
    action: `Removed workspace watchlist: ${title}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: workspace.updatedAt,
    storageMode: workspace.storageMode,
    continuityUpdatedAt: continuity.updatedAt,
    watchlists: workspace.watchlists,
    summary: workspace.watchlistSummary,
  });
}
