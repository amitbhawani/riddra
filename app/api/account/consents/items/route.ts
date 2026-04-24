import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { recordEmailDeliveryAttempt, recordQueuedEmailDelivery } from "@/lib/email-delivery-log-store";
import { removeWorkspaceConsentItem, saveWorkspaceConsentItem } from "@/lib/subscriber-workspace-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const durableJobs = getDurableJobSystemReadiness();
  const body = (await request.json()) as {
    title?: string;
    status?: string;
    summary?: string;
  };

  if (!body.title?.trim() || !body.status?.trim() || !body.summary?.trim()) {
    return NextResponse.json({ error: "Title, status, and summary are required." }, { status: 400 });
  }

  const workspace = await saveWorkspaceConsentItem(user, {
    title: body.title,
    status: body.status,
    summary: body.summary,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/consents",
    action: `Updated consent item: ${body.title?.trim()}`,
  });

  const latestItem = workspace.consentItems.find((item) => item.title === body.title?.trim());
  const alertHeadline = `Consent updated: ${body.title?.trim()}`;
  const job = durableJobs.configured
    ? await queueDurableJob({
        taskId: "account-change-alert",
        payload: {
          user: {
            id: user.id,
            email: user.email ?? "local-preview-user",
          },
          headline: alertHeadline,
          detail: `Your consent settings were updated and the new state is "${body.status?.trim()}".`,
          changedFields: ["Consent item", "Status", "Summary"],
          routeTarget: "/api/account/consents/items",
          relatedEntityId: latestItem?.title ?? body.title?.trim() ?? "consent-item",
        },
        idempotencyKey: `account-change-alert:consent-item:${user.id}:${body.title?.trim()}:${workspace.updatedAt}`,
        tags: ["durable-job", "notification", "account-change-alert"],
        metadata: {
          routeTarget: "/api/account/consents/items",
          requestedBy: user.email ?? "local-preview-user",
        },
      })
    : null;
  if (job) {
    await recordQueuedEmailDelivery({
      family: "account_change_alert",
      recipients: user.email ? [user.email] : [],
      subject: alertHeadline,
      relatedEntityId: latestItem?.title ?? body.title?.trim() ?? "consent-item",
      userEmail: user.email,
      routeTarget: "/api/account/consents/items",
    });
  } else {
    await recordEmailDeliveryAttempt({
      family: "account_change_alert",
      status: "Skipped",
      recipients: user.email ? [user.email] : [],
      subject: alertHeadline,
      relatedEntityId: latestItem?.title ?? body.title?.trim() ?? "consent-item",
      userEmail: user.email,
      routeTarget: "/api/account/consents/items",
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
        detail: "Saved the consent item, but Trigger.dev is unavailable so the account-change alert email was not queued.",
      };

  return NextResponse.json({
    ok: true,
    updatedAt: workspace.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    consentItems: workspace.consentItems,
    activityLog: workspace.activityLog,
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
  try {
    const user = await requireUser();
    const durableJobs = getDurableJobSystemReadiness();
    const body = (await request.json()) as {
      title?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const workspace = await removeWorkspaceConsentItem(user, {
      title: body.title,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/account/consents",
      action: `Removed consent item: ${body.title.trim()}`,
    });

    const alertHeadline = `Consent removed: ${body.title.trim()}`;
    const job = durableJobs.configured
      ? await queueDurableJob({
          taskId: "account-change-alert",
          payload: {
            user: {
              id: user.id,
              email: user.email ?? "local-preview-user",
            },
            headline: alertHeadline,
            detail: "A consent item was removed from your account preferences.",
            changedFields: ["Consent item"],
            routeTarget: "/api/account/consents/items",
            relatedEntityId: body.title.trim(),
          },
          idempotencyKey: `account-change-alert:consent-item-delete:${user.id}:${body.title.trim()}:${workspace.updatedAt}`,
          tags: ["durable-job", "notification", "account-change-alert"],
          metadata: {
            routeTarget: "/api/account/consents/items",
            requestedBy: user.email ?? "local-preview-user",
          },
        })
      : null;
    if (job) {
      await recordQueuedEmailDelivery({
        family: "account_change_alert",
        recipients: user.email ? [user.email] : [],
        subject: alertHeadline,
        relatedEntityId: body.title.trim(),
        userEmail: user.email,
        routeTarget: "/api/account/consents/items",
      });
    } else {
      await recordEmailDeliveryAttempt({
        family: "account_change_alert",
        status: "Skipped",
        recipients: user.email ? [user.email] : [],
        subject: alertHeadline,
        relatedEntityId: body.title.trim(),
        userEmail: user.email,
        routeTarget: "/api/account/consents/items",
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
          detail: "Removed the consent item, but Trigger.dev is unavailable so the account-change alert email was not queued.",
        };

    return NextResponse.json({
      ok: true,
      updatedAt: workspace.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      consentItems: workspace.consentItems,
      activityLog: workspace.activityLog,
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
      { error: error instanceof Error ? error.message : "Unable to remove consent item." },
      { status: 500 },
    );
  }
}
