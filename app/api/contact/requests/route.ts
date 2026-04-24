import { NextResponse } from "next/server";

import { createContactRequest, updateContactRequest } from "@/lib/contact-request-memory-store";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { getResendReadiness } from "@/lib/email/resend";
import { getSupportInboxRecipients } from "@/lib/email/resend";
import { recordQueuedEmailDelivery } from "@/lib/email-delivery-log-store";
import {
  applyRateLimitHeaders,
  checkRequestRateLimit,
} from "@/lib/request-rate-limit";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const rateLimit = checkRequestRateLimit(request, {
    keyPrefix: "contact-requests",
    windowMs: 10 * 60 * 1000,
    maxRequests: 5,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      NextResponse.json(
        {
          error: "Too many contact requests from this client. Please try again shortly.",
        },
        { status: 429 },
      ),
      rateLimit,
    );
  }

  const durableJobs = getDurableJobSystemReadiness();
  const resend = getResendReadiness();
  const inboxRecipients = getSupportInboxRecipients();
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    topic?: string;
    note?: string;
  };

  if (!body.name?.trim() || !body.email?.trim() || !body.topic?.trim() || !body.note?.trim()) {
    return applyRateLimitHeaders(
      NextResponse.json({ error: "Name, email, topic, and message are required." }, { status: 400 }),
      rateLimit,
    );
  }

  if (!isValidEmail(body.email.trim())) {
    return applyRateLimitHeaders(
      NextResponse.json({ error: "Enter a valid email address." }, { status: 400 }),
      rateLimit,
    );
  }

  if (!durableJobs.configured) {
    return applyRateLimitHeaders(
      NextResponse.json(
        {
          error: "Trigger.dev is not configured for contact delivery yet.",
          durableJobs,
        },
        { status: 503 },
      ),
      rateLimit,
    );
  }

  if (!resend.configured) {
    return applyRateLimitHeaders(
      NextResponse.json(
        {
          error: resend.detail,
          resend,
        },
        { status: 503 },
      ),
      rateLimit,
    );
  }

  if (!inboxRecipients.length) {
    return applyRateLimitHeaders(
      NextResponse.json(
        {
          error:
            "Support inbox routing is not configured. Set NEXT_PUBLIC_SUPPORT_EMAIL or configure a support/contact inbox in launch-config first.",
          resend,
        },
        { status: 503 },
      ),
      rateLimit,
    );
  }

  const created = await createContactRequest({
    name: body.name,
    email: body.email,
    topic: body.topic,
    note: body.note,
    source: "/contact",
  });

  const handle = await queueDurableJob({
    taskId: "contact-request-delivery",
    payload: {
      requestId: created.id,
      name: created.name,
      email: created.email,
      topic: created.topic,
      note: created.note,
      source: created.source,
    },
    idempotencyKey: `contact-request-delivery:${created.id}`,
    tags: ["durable-job", "support", "contact-request"],
    metadata: {
      routeTarget: "/api/contact/requests",
      requestId: created.id,
      requesterEmail: created.email,
    },
  });

  const updated = await updateContactRequest(created.id, {
    lastJobRunId: handle.id,
  });
  await Promise.all([
    recordQueuedEmailDelivery({
      family: "contact_acknowledgement",
      recipients: [updated.email],
      subject: `We received your message: ${updated.topic}`,
      relatedEntityId: updated.id,
      userEmail: updated.email,
      routeTarget: "/api/contact/requests",
    }),
    ...(inboxRecipients.length
      ? [
          recordQueuedEmailDelivery({
            family: "contact_inbox_notification",
            recipients: inboxRecipients,
            subject: `New public contact message: ${updated.topic}`,
            relatedEntityId: updated.id,
            userEmail: updated.email,
            routeTarget: "/api/contact/requests",
          }),
        ]
      : []),
  ]);

  return applyRateLimitHeaders(
    NextResponse.json({
      ok: true,
      request: updated,
      job: {
        id: handle.id,
        taskId: "contact-request-delivery",
      },
      delivery: {
        status: "queued",
        detail:
          "The contact request was queued into Trigger.dev. Final acknowledgement and inbox delivery state will resolve to sent, failed, or skipped after the durable worker runs.",
      },
      durableJobs,
      resend,
    }),
    rateLimit,
  );
}
