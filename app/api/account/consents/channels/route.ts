import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { recordEmailDeliveryAttempt, recordQueuedEmailDelivery } from "@/lib/email-delivery-log-store";
import { removeNotificationChannelRoute, saveNotificationChannelRoute } from "@/lib/notification-event-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const durableJobs = getDurableJobSystemReadiness();
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
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/consents",
    action: `Updated notification channel: ${body.channel}`,
  });

  const alertHeadline = `Notification channel updated: ${body.channel}`;
  const job = durableJobs.configured
    ? await queueDurableJob({
        taskId: "account-change-alert",
        payload: {
          user: {
            id: user.id,
            email: user.email ?? "local-preview-user",
          },
          headline: alertHeadline,
          detail: `Your ${body.channel} delivery route was updated to ${body.consentStatus}.`,
          changedFields: ["Channel", "Mapped scopes", "Consent status", "Delivery state"],
          routeTarget: "/api/account/consents/channels",
          relatedEntityId: body.channel,
        },
        idempotencyKey: `account-change-alert:channel:${user.id}:${body.channel}:${notificationMemory.updatedAt}`,
        tags: ["durable-job", "notification", "account-change-alert"],
        metadata: {
          routeTarget: "/api/account/consents/channels",
          requestedBy: user.email ?? "local-preview-user",
        },
      })
    : null;
  if (job) {
    await recordQueuedEmailDelivery({
      family: "account_change_alert",
      recipients: user.email ? [user.email] : [],
      subject: alertHeadline,
      relatedEntityId: body.channel,
      userEmail: user.email,
      routeTarget: "/api/account/consents/channels",
    });
  } else {
    await recordEmailDeliveryAttempt({
      family: "account_change_alert",
      status: "Skipped",
      recipients: user.email ? [user.email] : [],
      subject: alertHeadline,
      relatedEntityId: body.channel,
      userEmail: user.email,
      routeTarget: "/api/account/consents/channels",
      error: "Trigger.dev is unavailable, so the account-change alert email was not queued.",
    });
  }
  const alertDelivery = job
    ? {
        status: "queued" as const,
        detail: `Queued durable account-change alert job ${job.id}. Final email state will resolve to sent, failed, or skipped after the worker runs.`,
      }
    : {
        status: "not_queued" as const,
        detail: `Saved the ${body.channel} channel mapping, but Trigger.dev is unavailable so the account-change alert email was not queued.`,
      };

  return NextResponse.json({
    ok: true,
    updatedAt: notificationMemory.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    channelRoutes: notificationMemory.channelRoutes,
    job: job
      ? {
          id: job.id,
          taskId: "account-change-alert",
        }
      : null,
    alertDelivery,
    durableJobs,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const durableJobs = getDurableJobSystemReadiness();
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
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/consents",
      action: `Removed notification channel: ${body.channel}`,
    });

    const alertHeadline = `Notification channel removed: ${body.channel}`;
    const job = durableJobs.configured
      ? await queueDurableJob({
          taskId: "account-change-alert",
          payload: {
            user: {
              id: user.id,
              email: user.email ?? "local-preview-user",
            },
            headline: alertHeadline,
            detail: `Your ${body.channel} delivery route was removed from the consent-aware account map.`,
            changedFields: ["Channel"],
            routeTarget: "/api/account/consents/channels",
            relatedEntityId: body.channel,
          },
          idempotencyKey: `account-change-alert:channel-delete:${user.id}:${body.channel}:${notificationMemory.updatedAt}`,
          tags: ["durable-job", "notification", "account-change-alert"],
          metadata: {
            routeTarget: "/api/account/consents/channels",
            requestedBy: user.email ?? "local-preview-user",
          },
        })
      : null;
    if (job) {
      await recordQueuedEmailDelivery({
        family: "account_change_alert",
        recipients: user.email ? [user.email] : [],
        subject: alertHeadline,
        relatedEntityId: body.channel,
        userEmail: user.email,
        routeTarget: "/api/account/consents/channels",
      });
    } else {
      await recordEmailDeliveryAttempt({
        family: "account_change_alert",
        status: "Skipped",
        recipients: user.email ? [user.email] : [],
        subject: alertHeadline,
        relatedEntityId: body.channel,
        userEmail: user.email,
        routeTarget: "/api/account/consents/channels",
        error: "Trigger.dev is unavailable, so the account-change alert email was not queued.",
      });
    }
    const alertDelivery = job
      ? {
          status: "queued" as const,
          detail: `Queued durable account-change alert job ${job.id}. Final email state will resolve to sent, failed, or skipped after the worker runs.`,
        }
      : {
          status: "not_queued" as const,
          detail: `Removed the ${body.channel} channel mapping, but Trigger.dev is unavailable so the account-change alert email was not queued.`,
        };

    return NextResponse.json({
      ok: true,
      updatedAt: notificationMemory.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      channelRoutes: notificationMemory.channelRoutes,
      job: job
        ? {
            id: job.id,
            taskId: "account-change-alert",
          }
        : null,
      alertDelivery,
      durableJobs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove channel mapping." },
      { status: 400 },
    );
  }
}
