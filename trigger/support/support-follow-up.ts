import { logger, task } from "@trigger.dev/sdk/v3";

import {
  SupportAcknowledgementEmail,
  SupportFollowUpEmail,
  SupportInboxNoticeEmail,
} from "@/emails/riddra-emails";
import { getSupportInboxRecipients, sendTransactionalEmail } from "@/lib/email/resend";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { updateSupportFollowUpRequest } from "@/lib/support-follow-up-memory-store";

type DurableUserIdentity = {
  id: string;
  email: string;
};

function resolveNextTouchAt(urgency: "Today" | "Next business day" | "This week") {
  if (urgency === "Today") {
    return "Today by 6:00 PM";
  }

  if (urgency === "Next business day") {
    return "Next business day by 12:00 PM";
  }

  return "This week during the support review window";
}

export const supportFollowUpTask = task({
  id: "support-follow-up",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: false,
  },
  run: async (payload: {
    user: DurableUserIdentity;
    requestId: string;
    topic: string;
    lane: "Onboarding" | "Portfolio" | "Support" | "Billing" | "Research" | "Bug";
    urgency: "Today" | "Next business day" | "This week";
    preferredChannel: "Email" | "WhatsApp" | "Phone" | "In-app";
    note: string;
  }) => {
    logger.info("Starting support follow-up task", {
      email: payload.user.email,
      requestId: payload.requestId,
      lane: payload.lane,
      urgency: payload.urgency,
    });

    const nextTouchAt = resolveNextTouchAt(payload.urgency);
    const config = getRuntimeLaunchConfig();
    const accountSupportHref = `${config.siteUrl || "http://localhost:3000"}/account/support`;
    const supportInboxRecipients = getSupportInboxRecipients();
    const [acknowledgementResult, inboxResult, followUpResult] = await Promise.all([
      sendTransactionalEmail({
        family: "support_acknowledgement",
        to: payload.user.email,
        subject: `We received your support request: ${payload.topic}`,
        react: SupportAcknowledgementEmail({
          requesterEmail: payload.user.email,
          topic: payload.topic,
          lane: payload.lane,
          urgency: payload.urgency,
          note: payload.note,
          accountSupportHref,
        }),
        text: [
          `We received your support request: ${payload.topic}`,
          `Lane: ${payload.lane}`,
          `Urgency: ${payload.urgency}`,
          `Note: ${payload.note}`,
          `Review your support lane: ${accountSupportHref}`,
        ].join("\n"),
        relatedEntityId: payload.requestId,
        userEmail: payload.user.email,
        routeTarget: "/api/account/support/follow-up",
      }),
      sendTransactionalEmail({
        family: "support_inbox_notification",
        to: supportInboxRecipients,
        subject: `Support request queued: ${payload.topic}`,
        react: SupportInboxNoticeEmail({
          requesterEmail: payload.user.email,
          topic: payload.topic,
          lane: payload.lane,
          urgency: payload.urgency,
          preferredChannel: payload.preferredChannel,
          note: payload.note,
        }),
        text: [
          `A support request was queued: ${payload.topic}`,
          `Requester: ${payload.user.email}`,
          `Lane: ${payload.lane}`,
          `Urgency: ${payload.urgency}`,
          `Preferred channel: ${payload.preferredChannel}`,
          `Note: ${payload.note}`,
        ].join("\n"),
        relatedEntityId: payload.requestId,
        userEmail: payload.user.email,
        routeTarget: "/api/account/support/follow-up",
      }),
      sendTransactionalEmail({
        family: "support_follow_up",
        to: payload.user.email,
        subject: `Support follow-up scheduled: ${payload.topic}`,
        react: SupportFollowUpEmail({
          topic: payload.topic,
          nextTouchAt,
          preferredChannel: payload.preferredChannel,
          note: payload.note,
          accountSupportHref,
        }),
        text: [
          `Support follow-up scheduled: ${payload.topic}`,
          `Next touch: ${nextTouchAt}`,
          `Preferred channel: ${payload.preferredChannel}`,
          `Note: ${payload.note}`,
          `Review your support lane: ${accountSupportHref}`,
        ].join("\n"),
        relatedEntityId: payload.requestId,
        userEmail: payload.user.email,
        routeTarget: "/api/account/support/follow-up",
      }),
    ]);

    const combinedEmailError =
      acknowledgementResult.error || inboxResult.error || followUpResult.error || null;
    const userFacingEmailHealthy = acknowledgementResult.ok && followUpResult.ok;
    const supportStatus =
      payload.preferredChannel === "Phone" || !userFacingEmailHealthy ? "Needs review" : "Scheduled";
    const memory = await updateSupportFollowUpRequest(payload.user, {
      id: payload.requestId,
      status: supportStatus,
      nextTouchAt,
      note:
        payload.preferredChannel === "Phone"
          ? `Durable follow-up flagged "${payload.topic}" for a manual phone callback review.`
          : !userFacingEmailHealthy
            ? `Durable follow-up was queued for "${payload.topic}", but at least one user-facing email attempt still needs review.`
          : `Durable follow-up scheduled "${payload.topic}" for ${payload.preferredChannel.toLowerCase()} contact.`,
      acknowledgementEmailState: acknowledgementResult.ok ? "Sent" : acknowledgementResult.status,
      followUpEmailState: followUpResult.ok ? "Sent" : followUpResult.status,
      lastEmailError: combinedEmailError,
      lastEmailAt: new Date().toISOString(),
    });

    logger.info("Completed support follow-up task", {
      email: payload.user.email,
      requestId: payload.requestId,
      nextTouchAt,
      acknowledgementEmailState: acknowledgementResult.ok ? "Sent" : acknowledgementResult.status,
      followUpEmailState: followUpResult.ok ? "Sent" : followUpResult.status,
    });

    return {
      updatedAt: memory.updatedAt,
      nextTouchAt,
      summary: memory.summary,
    };
  },
});
