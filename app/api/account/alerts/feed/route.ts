import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import {
  getSubscriberWorkspaceMemory,
  removeWorkspaceAlertFeedItem,
  saveWorkspaceAlertFeedItem,
} from "@/lib/subscriber-workspace-store";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      title?: string;
      timestamp?: string;
      channel?: string;
      status?: "Sent" | "Queued" | "Needs review";
      summary?: string;
    };

    const title = body.title?.trim() ?? "";
    const timestamp = body.timestamp?.trim() ?? "";
    const channel = body.channel?.trim() ?? "";
    const status = body.status;
    const summary = body.summary?.trim() ?? "";

    if (!title || !timestamp || !channel || !status || !summary) {
      return NextResponse.json({ error: "Title, timestamp, channel, status, and summary are required." }, { status: 400 });
    }

    const workspace = await saveWorkspaceAlertFeedItem(user, {
      title,
      timestamp,
      channel,
      status,
      summary,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/alerts",
      action: `Saved alert feed item: ${title}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: workspace.updatedAt,
      storageMode: workspace.storageMode,
      continuityUpdatedAt: continuity.updatedAt,
      alertFeed: workspace.alertFeed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save alert feed item." },
      { status: 500 },
    );
  }
}

export async function GET() {
  const user = await requireUser();
  const workspace = await getSubscriberWorkspaceMemory(user);

  return NextResponse.json({
    updatedAt: workspace.updatedAt,
    storageMode: workspace.storageMode,
    alertFeed: workspace.alertFeed,
  });
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { title?: string };
    const title = body.title?.trim() ?? "";

    if (!title) {
      return NextResponse.json({ error: "Alert feed title is required." }, { status: 400 });
    }

    const workspace = await removeWorkspaceAlertFeedItem(user, { title });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/alerts",
      action: `Removed alert feed item: ${title}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: workspace.updatedAt,
      storageMode: workspace.storageMode,
      continuityUpdatedAt: continuity.updatedAt,
      alertFeed: workspace.alertFeed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove alert feed item." },
      { status: 500 },
    );
  }
}
