import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import {
  getSubscriberWorkspaceMemory,
  removeWorkspaceAlertPreference,
  saveWorkspaceAlertPreference,
} from "@/lib/subscriber-workspace-store";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      label?: string;
      defaultState?: "On" | "Off" | "Priority";
      note?: string;
    };

    const label = body.label?.trim() ?? "";
    const defaultState = body.defaultState;
    const note = body.note?.trim() ?? "";

    if (!label || !defaultState || !note) {
      return NextResponse.json({ error: "Label, default state, and note are required." }, { status: 400 });
    }

    const workspace = await saveWorkspaceAlertPreference(user, {
      label,
      defaultState,
      note,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/alerts",
      action: `Saved alert preference: ${label}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: workspace.updatedAt,
      storageMode: workspace.storageMode,
      summary: workspace.watchlistSummary,
      continuityUpdatedAt: continuity.updatedAt,
      alertPreferences: workspace.alertPreferences,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save alert preference." },
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
    alertPreferences: workspace.alertPreferences,
  });
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      label?: string;
    };

    const label = body.label?.trim() ?? "";

    if (!label) {
      return NextResponse.json({ error: "Label is required." }, { status: 400 });
    }

    const workspace = await removeWorkspaceAlertPreference(user, {
      label,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/alerts",
      action: `Removed alert preference: ${label}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: workspace.updatedAt,
      storageMode: workspace.storageMode,
      summary: workspace.watchlistSummary,
      continuityUpdatedAt: continuity.updatedAt,
      alertPreferences: workspace.alertPreferences,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove alert preference." },
      { status: 500 },
    );
  }
}
