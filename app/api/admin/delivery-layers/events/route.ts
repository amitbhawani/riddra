import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { removeNotificationEvent, saveNotificationEvent } from "@/lib/notification-event-memory-store";

export async function POST(request: Request) {
  const user = await requireAdmin();
  const durableJobs = getDurableJobSystemReadiness();
  const body = (await request.json()) as {
    title?: string;
    channel?: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
    audienceScope?: string;
    triggeredBy?: string;
    consentState?: "Allowed" | "Needs reconfirmation" | "Blocked";
    deliveryState?: "Queued" | "Delivered" | "Retrying" | "Suppressed";
    nextAttempt?: string;
    note?: string;
  };

  const title = body.title?.trim() ?? "";
  const audienceScope = body.audienceScope?.trim() ?? "";
  const triggeredBy = body.triggeredBy?.trim() ?? "";
  const nextAttempt = body.nextAttempt?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!title || !body.channel || !audienceScope || !triggeredBy || !body.consentState || !body.deliveryState || !nextAttempt || !note) {
    return NextResponse.json(
      { error: "Title, channel, audience scope, triggered by, consent state, delivery state, next attempt, and note are required." },
      { status: 400 },
    );
  }

  if (!durableJobs.configured) {
    return NextResponse.json(
      {
        error: "Trigger.dev is not configured for admin delivery follow-up jobs yet.",
        durableJobs,
      },
      { status: 503 },
    );
  }

  const normalizedDeliveryState =
    body.consentState === "Blocked" || body.consentState === "Needs reconfirmation"
      ? "Suppressed"
      : body.channel === "Email"
        ? "Queued"
        : body.deliveryState;
  const normalizedNextAttempt =
    body.consentState === "Blocked"
      ? "Blocked by consent"
      : body.consentState === "Needs reconfirmation"
        ? "Awaiting consent reconfirmation"
        : body.channel === "Email"
          ? "Queued for Resend delivery"
          : nextAttempt;

  const notificationMemory = await saveNotificationEvent(user, {
    title,
    channel: body.channel,
    audienceScope,
    triggeredBy,
    consentState: body.consentState,
    deliveryState: normalizedDeliveryState,
    nextAttempt: normalizedNextAttempt,
    note,
  });
  const latestEvent = notificationMemory.recentEvents[0];
  const job = await queueDurableJob({
    taskId: "notification-delivery-follow-up",
    payload: {
      user: {
        id: user.id,
        email: user.email ?? "local-preview-user",
      },
      eventId: latestEvent.id,
      title: latestEvent.title,
      channel: latestEvent.channel,
      audienceScope: latestEvent.audienceScope,
      triggeredBy: latestEvent.triggeredBy,
      consentState: latestEvent.consentState,
      note: latestEvent.note,
    },
    idempotencyKey: `notification-delivery-follow-up:${user.id}:${latestEvent.id}`,
    tags: ["durable-job", "notification", "delivery-follow-up", "admin"],
    metadata: {
      routeTarget: "/api/admin/delivery-layers/events",
      eventId: latestEvent.id,
      requestedBy: user.email ?? "local-preview-user",
    },
  });

  return NextResponse.json({
    ok: true,
    updatedAt: notificationMemory.updatedAt,
    recentEvents: notificationMemory.recentEvents,
    job: {
      id: job.id,
      taskId: "notification-delivery-follow-up",
    },
    durableJobs,
  });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  const body = (await request.json()) as {
    id?: string;
  };

  const id = body.id?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Notification event id is required." }, { status: 400 });
  }

  try {
    const notificationMemory = await removeNotificationEvent(user, { id });

    return NextResponse.json({
      ok: true,
      updatedAt: notificationMemory.updatedAt,
      recentEvents: notificationMemory.recentEvents,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove notification event." },
      { status: 400 },
    );
  }
}
