import { logger, task } from "@trigger.dev/sdk/v3";

import { AccountChangeAlertEmail } from "@/emails/riddra-emails";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export const accountChangeAlertTask = task({
  id: "account-change-alert",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: false,
  },
  run: async (payload: {
    user: {
      id: string;
      email: string;
    };
    headline: string;
    detail: string;
    changedFields: string[];
    routeTarget: string;
    relatedEntityId: string;
  }) => {
    logger.info("Starting account change alert task", {
      email: payload.user.email,
      routeTarget: payload.routeTarget,
      relatedEntityId: payload.relatedEntityId,
    });

    const config = getRuntimeLaunchConfig();
    const accountHref = `${config.siteUrl || "http://localhost:3000"}/account/consents`;
    const sendResult = await sendTransactionalEmail({
      family: "account_change_alert",
      to: payload.user.email,
      subject: payload.headline,
      react: AccountChangeAlertEmail({
        headline: payload.headline,
        detail: payload.detail,
        changedFields: payload.changedFields,
        accountHref,
      }),
      text: [payload.headline, payload.detail, `Changed fields: ${payload.changedFields.join(", ")}`, `Review: ${accountHref}`].join("\n"),
      relatedEntityId: payload.relatedEntityId,
      userEmail: payload.user.email,
      routeTarget: payload.routeTarget,
    });

    logger.info("Completed account change alert task", {
      email: payload.user.email,
      relatedEntityId: payload.relatedEntityId,
      status: sendResult.status,
    });

    return {
      relatedEntityId: payload.relatedEntityId,
      status: sendResult.status,
      messageId: sendResult.messageId,
    };
  },
});
