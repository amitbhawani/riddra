import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { removeNotificationChannelRoute, saveNotificationChannelRoute } from "@/lib/notification-event-memory-store";

export async function POST(request: Request) {
  const user = await requireAdmin();
  const body = (await request.json()) as {
    channel?: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
    mappedScopes?: string;
    consentStatus?: "Allowed" | "Needs reconfirmation" | "Blocked";
    deliveryState?: "Healthy" | "Retry watch" | "Suppressed";
    preferenceSource?: string;
    note?: string;
  };

  if (!body.channel || !body.mappedScopes?.trim() || !body.consentStatus || !body.deliveryState || !body.preferenceSource?.trim() || !body.note?.trim()) {
    return NextResponse.json(
      { error: "Channel, mapped scopes, consent status, delivery state, preference source, and note are required." },
      { status: 400 },
    );
  }

  const notificationMemory = await saveNotificationChannelRoute(user, {
    channel: body.channel,
    mappedScopes: body.mappedScopes,
    consentStatus: body.consentStatus,
    deliveryState: body.deliveryState,
    preferenceSource: body.preferenceSource,
    note: body.note,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: notificationMemory.updatedAt,
    channelRoutes: notificationMemory.channelRoutes,
  });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  const body = (await request.json()) as {
    channel?: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
  };

  if (!body.channel) {
    return NextResponse.json({ error: "Channel is required." }, { status: 400 });
  }

  try {
    const notificationMemory = await removeNotificationChannelRoute(user, {
      channel: body.channel,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: notificationMemory.updatedAt,
      channelRoutes: notificationMemory.channelRoutes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove channel mapping." },
      { status: 400 },
    );
  }
}
