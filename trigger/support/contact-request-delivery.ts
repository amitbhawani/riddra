import { logger, task } from "@trigger.dev/sdk/v3";

import { ContactAcknowledgementEmail, ContactInboxNoticeEmail } from "@/emails/riddra-emails";
import { getSupportInboxRecipients, sendTransactionalEmail } from "@/lib/email/resend";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { updateContactRequest } from "@/lib/contact-request-memory-store";

export const contactRequestDeliveryTask = task({
  id: "contact-request-delivery",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: false,
  },
  run: async (payload: {
    requestId: string;
    name: string;
    email: string;
    topic: string;
    note: string;
    source: string;
  }) => {
    logger.info("Starting contact request delivery task", {
      email: payload.email,
      requestId: payload.requestId,
      topic: payload.topic,
    });

    const config = getRuntimeLaunchConfig();
    const contactHref = `${config.siteUrl || "http://localhost:3000"}/contact`;
    const inboxRecipients = getSupportInboxRecipients();

    const [ackResult, inboxResult] = await Promise.all([
      sendTransactionalEmail({
        family: "contact_acknowledgement",
        to: payload.email,
        subject: `We received your message: ${payload.topic}`,
        react: ContactAcknowledgementEmail({
          requesterName: payload.name,
          topic: payload.topic,
          note: payload.note,
          contactHref,
        }),
        text: [
          `We received your message: ${payload.topic}`,
          `Name: ${payload.name}`,
          `Note: ${payload.note}`,
          `Contact page: ${contactHref}`,
        ].join("\n"),
        relatedEntityId: payload.requestId,
        userEmail: payload.email,
        routeTarget: "/api/contact/requests",
      }),
      sendTransactionalEmail({
        family: "contact_inbox_notification",
        to: inboxRecipients,
        subject: `New public contact message: ${payload.topic}`,
        react: ContactInboxNoticeEmail({
          requesterName: payload.name,
          requesterEmail: payload.email,
          topic: payload.topic,
          note: payload.note,
          source: payload.source,
        }),
        text: [
          `New public contact message: ${payload.topic}`,
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          `Source: ${payload.source}`,
          `Message: ${payload.note}`,
        ].join("\n"),
        relatedEntityId: payload.requestId,
        userEmail: payload.email,
        routeTarget: "/api/contact/requests",
      }),
    ]);

    const lastEmailError = ackResult.error || inboxResult.error || null;
    const updated = await updateContactRequest(payload.requestId, {
      status: ackResult.ok ? "Acknowledged" : "Needs review",
      acknowledgementEmailState: ackResult.ok ? "Sent" : ackResult.status,
      inboxEmailState: inboxResult.ok ? "Sent" : inboxResult.status,
      lastEmailError,
      lastEmailAt: new Date().toISOString(),
    });

    logger.info("Completed contact request delivery task", {
      email: payload.email,
      requestId: payload.requestId,
      status: updated.status,
      acknowledgementEmailState: updated.acknowledgementEmailState,
      inboxEmailState: updated.inboxEmailState,
    });

    return {
      requestId: updated.id,
      status: updated.status,
      acknowledgementEmailState: updated.acknowledgementEmailState,
      inboxEmailState: updated.inboxEmailState,
    };
  },
});
