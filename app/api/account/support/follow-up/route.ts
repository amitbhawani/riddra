import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { getResendReadiness, getSupportInboxRecipients } from "@/lib/email/resend";
import { recordQueuedEmailDelivery } from "@/lib/email-delivery-log-store";
import { createSupportFollowUpRequest, updateSupportFollowUpRequest } from "@/lib/support-follow-up-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const durableJobs = getDurableJobSystemReadiness();
  const resend = getResendReadiness();
  const supportInboxRecipients = getSupportInboxRecipients();
  const body = (await request.json()) as {
    topic?: string;
    lane?: "Onboarding" | "Portfolio" | "Support" | "Billing" | "Research" | "Bug";
    preferredChannel?: "Email" | "WhatsApp" | "Phone" | "In-app";
    urgency?: "Today" | "Next business day" | "This week";
    note?: string;
  };

  if (!body.topic?.trim() || !body.lane || !body.preferredChannel || !body.urgency || !body.note?.trim()) {
    return NextResponse.json(
      {
        error: "Topic, lane, preferred channel, urgency, and note are required.",
      },
      { status: 400 },
    );
  }

  if (!durableJobs.configured) {
    return NextResponse.json(
      {
        error: "Trigger.dev is not configured for durable support follow-up jobs yet.",
        durableJobs,
      },
      { status: 503 },
    );
  }

  if (!resend.configured) {
    return NextResponse.json(
      {
        error: resend.detail,
        resend,
      },
      { status: 503 },
    );
  }

  if (!user.email) {
    return NextResponse.json(
      {
        error: "The signed-in account is missing an email address, so support delivery cannot be verified yet.",
      },
      { status: 400 },
    );
  }

  if (!supportInboxRecipients.length) {
    return NextResponse.json(
      {
        error:
          "Support inbox routing is not configured. Set NEXT_PUBLIC_SUPPORT_EMAIL or configure a support/contact inbox in launch-config first.",
        resend,
      },
      { status: 503 },
    );
  }

  const created = await createSupportFollowUpRequest(user, {
    topic: body.topic.trim(),
    lane: body.lane,
    preferredChannel: body.preferredChannel,
    urgency: body.urgency,
    note: body.note.trim(),
  });

  const handle = await queueDurableJob({
    taskId: "support-follow-up",
    payload: {
      user: {
        id: user.id,
        email: user.email,
      },
      requestId: created.request.id,
      topic: created.request.topic,
      lane: created.request.lane,
      urgency: created.request.urgency,
      preferredChannel: created.request.preferredChannel,
      note: created.request.note,
    },
    idempotencyKey: `support-follow-up:${user.id}:${created.request.id}`,
    tags: ["durable-job", "support", "follow-up"],
    metadata: {
      routeTarget: "/api/account/support/follow-up",
      requestId: created.request.id,
      requestedBy: user.email,
    },
  });
  await Promise.all([
    recordQueuedEmailDelivery({
      family: "support_acknowledgement",
      recipients: [user.email],
      subject: `We received your support request: ${created.request.topic}`,
      relatedEntityId: created.request.id,
      userEmail: user.email,
      routeTarget: "/api/account/support/follow-up",
    }),
    recordQueuedEmailDelivery({
      family: "support_follow_up",
      recipients: [user.email],
      subject: `Support follow-up scheduled: ${created.request.topic}`,
      relatedEntityId: created.request.id,
      userEmail: user.email,
      routeTarget: "/api/account/support/follow-up",
    }),
    ...(supportInboxRecipients.length
      ? [
          recordQueuedEmailDelivery({
            family: "support_inbox_notification",
            recipients: supportInboxRecipients,
            subject: `Support request queued: ${created.request.topic}`,
            relatedEntityId: created.request.id,
            userEmail: user.email,
            routeTarget: "/api/account/support/follow-up",
          }),
        ]
      : []),
  ]);
  const updatedMemory = await updateSupportFollowUpRequest(user, {
    id: created.request.id,
    lastJobRunId: handle.id,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/account/support",
    action: `Queued support follow-up: ${created.request.topic}`,
  });

  return NextResponse.json({
    ok: true,
    request: {
      ...created.request,
      lastJobRunId: handle.id,
    },
    summary: updatedMemory.summary,
    continuityUpdatedAt: continuity.updatedAt,
    job: {
      id: handle.id,
      taskId: "support-follow-up",
    },
    delivery: {
      status: "queued",
      detail:
        "Support follow-up was queued into Trigger.dev. Final acknowledgement and follow-up email state will resolve to sent, failed, or skipped after the durable worker runs.",
    },
    durableJobs,
    resend,
  });
}
