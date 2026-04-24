import { logger, task } from "@trigger.dev/sdk/v3";

import { NotificationSummaryEmail } from "@/emails/riddra-emails";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { recordEmailDeliveryAttempt } from "@/lib/email-delivery-log-store";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { updateNotificationEvent } from "@/lib/notification-event-memory-store";

type DurableUserIdentity = {
  id: string;
  email: string;
};

export const notificationDeliveryFollowUpTask = task({
  id: "notification-delivery-follow-up",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 12_000,
    randomize: false,
  },
  run: async (payload: {
    user: DurableUserIdentity;
    eventId: string;
    title: string;
    channel: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
    audienceScope: string;
    triggeredBy: string;
    consentState: "Allowed" | "Needs reconfirmation" | "Blocked";
    note: string;
  }) => {
    logger.info("Starting notification follow-up task", {
      email: payload.user.email,
      eventId: payload.eventId,
      channel: payload.channel,
      consentState: payload.consentState,
    });

    const config = getRuntimeLaunchConfig();
    const accountHref = `${config.siteUrl || "http://localhost:3000"}/account/consents`;
    const recordSkippedNotificationEmail = async (reason: string) =>
      recordEmailDeliveryAttempt({
        family: "notification_summary",
        status: "Skipped",
        recipients: payload.user.email ? [payload.user.email] : [],
        subject: `Notification summary: ${payload.title}`,
        relatedEntityId: payload.eventId,
        userEmail: payload.user.email,
        routeTarget: "/api/account/consents/events",
        error: reason,
      });

    const nextState =
      payload.consentState === "Blocked"
        ? await (async () => {
            await recordSkippedNotificationEmail("Notification summary email was skipped because consent is blocked.");
            return {
            deliveryState: "Suppressed" as const,
            emailDeliveryState: "Skipped" as const,
            emailMessageId: null,
            emailError: null,
            nextAttempt: "Blocked by consent",
            note: `${payload.note} Delivery was suppressed by the durable follow-up worker because consent is blocked.`,
          };
          })()
        : payload.consentState === "Needs reconfirmation"
          ? await (async () => {
              await recordSkippedNotificationEmail(
                "Notification summary email was skipped until consent is reconfirmed.",
              );
              return {
              deliveryState: "Suppressed" as const,
              emailDeliveryState: "Skipped" as const,
              emailMessageId: null,
              emailError: null,
              nextAttempt: "Awaiting consent reconfirmation",
              note: `${payload.note} Delivery is waiting for consent reconfirmation before the next external send attempt.`,
            };
            })()
          : payload.channel === "Email"
            ? await (async () => {
                const sendResult = await sendTransactionalEmail({
                  family: "notification_summary",
                  to: payload.user.email,
                  subject: `Notification summary: ${payload.title}`,
                  react: NotificationSummaryEmail({
                    title: payload.title,
                    audienceScope: payload.audienceScope,
                    triggeredBy: payload.triggeredBy,
                    note: payload.note,
                    accountHref,
                  }),
                  text: [
                    `Notification summary: ${payload.title}`,
                    `Audience scope: ${payload.audienceScope}`,
                    `Triggered by: ${payload.triggeredBy}`,
                    `Summary: ${payload.note}`,
                    `Review: ${accountHref}`,
                  ].join("\n"),
                  relatedEntityId: payload.eventId,
                  userEmail: payload.user.email,
                  routeTarget: "/api/account/consents/events",
                });

                return sendResult.ok
                  ? {
                      deliveryState: "Delivered" as const,
                      emailDeliveryState: "Sent" as const,
                      emailMessageId: sendResult.messageId,
                      emailError: null,
                      nextAttempt: "Delivered through Resend",
                      note: `${payload.note} Email delivery was completed through Resend by the durable follow-up worker.`,
                    }
                  : {
                      deliveryState: "Retrying" as const,
                      emailDeliveryState: sendResult.status === "Skipped" ? "Skipped" as const : "Failed" as const,
                      emailMessageId: null,
                      emailError: sendResult.error,
                      nextAttempt:
                        sendResult.status === "Skipped"
                          ? "Awaiting Resend activation"
                          : "Retrying after Resend delivery failure",
                      note: `${payload.note} Email delivery is still pending because the durable follow-up worker could not complete the Resend send attempt.`,
                    };
              })()
            : payload.channel === "In-app"
              ? {
                  deliveryState: "Delivered" as const,
                  emailDeliveryState: "Skipped" as const,
                  emailMessageId: null,
                  emailError: null,
                  nextAttempt: "Delivered in-app via durable job",
                  note: `${payload.note} In-app delivery was marked completed by the durable follow-up worker.`,
                }
            : {
                deliveryState: "Retrying" as const,
                emailDeliveryState: "Skipped" as const,
                emailMessageId: null,
                emailError: null,
                nextAttempt: "Awaiting external provider activation",
                note: `${payload.note} External delivery is now owned by the durable follow-up lane and will retry once provider delivery is activated.`,
              };

    const memory = await updateNotificationEvent(payload.user, {
      id: payload.eventId,
      deliveryState: nextState.deliveryState,
      emailDeliveryState: nextState.emailDeliveryState,
      emailMessageId: nextState.emailMessageId,
      emailError: nextState.emailError,
      nextAttempt: nextState.nextAttempt,
      note: nextState.note,
    });

    logger.info("Completed notification follow-up task", {
      email: payload.user.email,
      eventId: payload.eventId,
      deliveryState: nextState.deliveryState,
    });

    return {
      updatedAt: memory.updatedAt,
      deliveryState: nextState.deliveryState,
      nextAttempt: nextState.nextAttempt,
    };
  },
});
