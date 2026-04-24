import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { getSubscriberWorkspaceMemory, removeWorkspaceInboxItem, saveWorkspaceInboxItem } from "@/lib/subscriber-workspace-store";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      title?: string;
      source?: string;
      timestamp?: string;
      priority?: "High" | "Medium" | "Low";
      status?: "Unread" | "Reviewed" | "Needs action";
      summary?: string;
      actionLabel?: string;
      actionHref?: string;
    };

    const title = body.title?.trim() ?? "";
    const source = body.source?.trim() ?? "";
    const timestamp = body.timestamp?.trim() ?? "";
    const priority = body.priority;
    const status = body.status;
    const summary = body.summary?.trim() ?? "";
    const actionLabel = body.actionLabel?.trim() ?? "";
    const actionHref = body.actionHref?.trim() ?? "";

    if (!title || !source || !timestamp || !priority || !status || !summary || !actionLabel || !actionHref) {
      return NextResponse.json(
        { error: "Title, source, timestamp, priority, status, summary, action label, and action href are required." },
        { status: 400 },
      );
    }

    const workspace = await saveWorkspaceInboxItem(user, {
      title,
      source,
      timestamp,
      priority,
      status,
      summary,
      actionLabel,
      actionHref,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/inbox",
      action: `Updated inbox item: ${title}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: workspace.updatedAt,
      storageMode: workspace.storageMode,
      inboxItems: workspace.inboxItems,
      continuityUpdatedAt: continuity.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save inbox item." },
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
    inboxItems: workspace.inboxItems,
  });
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { title?: string };
    const title = body.title?.trim() ?? "";

    if (!title) {
      return NextResponse.json({ error: "Inbox item title is required." }, { status: 400 });
    }

    const workspace = await removeWorkspaceInboxItem(user, { title });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/inbox",
      action: `Removed inbox item: ${title}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: workspace.updatedAt,
      storageMode: workspace.storageMode,
      inboxItems: workspace.inboxItems,
      continuityUpdatedAt: continuity.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove inbox item." },
      { status: 500 },
    );
  }
}
