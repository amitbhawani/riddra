import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { recordQueuedEmailDelivery } from "@/lib/email-delivery-log-store";
import {
  removeNotificationEvent,
  saveNotificationEvent,
} from "@/lib/notification-event-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
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

  if (
    !body.title?.trim() ||
    !body.channel ||
    !body.audienceScope?.trim() ||
    !body.triggeredBy?.trim() ||
    !body.consentState ||
    !body.deliveryState ||
    !body.nextAttempt?.trim() ||
    !body.note?.trim()
  ) {
    return NextResponse.json(
      {
        error: "Title, channel, audience scope, trigger, consent state, delivery state, next attempt, and note are required.",
      },
      { status: 400 },
    );
  }

  if (!durableJobs.configured) {
    return NextResponse.json(
      {
        error: "Trigger.dev is not configured for durable notification follow-up jobs yet.",
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
          : body.nextAttempt;

  const notificationMemory = await saveNotificationEvent(user, {
    title: body.title,
    channel: body.channel,
    audienceScope: body.audienceScope,
    triggeredBy: body.triggeredBy,
    consentState: body.consentState,
    deliveryState: normalizedDeliveryState,
    nextAttempt: normalizedNextAttempt,
    note: body.note,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/consents",
    action: `Logged delivery event: ${body.title?.trim()}`,
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
    tags: ["durable-job", "notification", "delivery-follow-up"],
    metadata: {
      routeTarget: "/api/account/consents/events",
      eventId: latestEvent.id,
      requestedBy: user.email ?? "local-preview-user",
    },
  });
  if (latestEvent.channel === "Email") {
    await recordQueuedEmailDelivery({
      family: "notification_summary",
      recipients: user.email ? [user.email] : [],
      subject: `Notification summary: ${latestEvent.title}`,
      relatedEntityId: latestEvent.id,
      userEmail: user.email,
      routeTarget: "/api/account/consents/events",
    });
  }

  return NextResponse.json({
    ok: true,
    updatedAt: notificationMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    recentEvents: notificationMemory.recentEvents,
    job: {
      id: job.id,
      taskId: "notification-delivery-follow-up",
    },
    delivery:
      latestEvent.channel === "Email"
        ? {
            status: "queued",
            detail:
              "The notification summary email was queued into Trigger.dev. Final delivery state will resolve to sent, failed, or skipped after the durable worker runs.",
          }
        : {
            status: "queued",
            detail: "The notification follow-up was queued into Trigger.dev for channel-specific handling.",
          },
    durableJobs,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as { id?: string };

  if (!body.id?.trim()) {
    return NextResponse.json({ error: "Notification event id is required." }, { status: 400 });
  }

  const notificationMemory = await removeNotificationEvent(user, { id: body.id.trim() });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/consents",
    action: `Removed delivery event: ${body.id.trim()}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: notificationMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    recentEvents: notificationMemory.recentEvents,
  });
}
