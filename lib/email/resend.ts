import type { ReactElement } from "react";

import { Resend } from "resend";

import { env } from "@/lib/env";
import { recordEmailDeliveryAttempt, type EmailDeliveryFamily } from "@/lib/email-delivery-log-store";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

type SendTransactionalEmailInput = {
  family: EmailDeliveryFamily;
  to: string | string[];
  subject: string;
  react: ReactElement;
  text: string;
  relatedEntityId?: string | null;
  userEmail?: string | null;
  routeTarget?: string | null;
  replyTo?: string | string[];
};

function normalizeEmailList(value: Array<string | null | undefined> | string | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .flatMap((item) => String(item ?? "").split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, allItems) => allItems.indexOf(item) === index);
}

function getDefaultReplyTo() {
  const config = getRuntimeLaunchConfig();
  return normalizeEmailList([env.resendReplyToEmail, config.supportEmail, config.contactEmail]);
}

export function getResendReadiness() {
  const config = getRuntimeLaunchConfig();
  const supportInboxRecipients = normalizeEmailList([config.supportEmail, config.contactEmail, config.feedbackInbox]);
  const apiKey = env.resendApiKey;
  const missing: string[] = [];

  if (!apiKey) {
    missing.push("RESEND_API_KEY");
  }

  if (!env.resendFromEmail) {
    missing.push("RESEND_FROM_EMAIL");
  }

  return {
    configured: missing.length === 0,
    apiKeySource: env.resendApiKey ? "env" : "missing",
    fromEmail: env.resendFromEmail ?? null,
    replyTo: getDefaultReplyTo(),
    supportInboxRecipients,
    missing,
    detail:
      missing.length === 0
        ? "Resend is configured for provider-backed transactional email."
        : `Resend is not configured. Missing ${missing.join(" and ")}.`,
  };
}

export function getSupportInboxRecipients() {
  return getResendReadiness().supportInboxRecipients;
}

async function logSkippedEmail(input: SendTransactionalEmailInput, reason: string, recipients: string[]) {
  await recordEmailDeliveryAttempt({
    family: input.family,
    status: "Skipped",
    recipients,
    subject: input.subject,
    relatedEntityId: input.relatedEntityId,
    userEmail: input.userEmail,
    routeTarget: input.routeTarget,
    error: reason,
  });

  return {
    ok: false as const,
    status: "Skipped" as const,
    messageId: null,
    error: reason,
  };
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const recipients = normalizeEmailList(input.to);
  const resendApiKey = env.resendApiKey;

  if (!recipients.length) {
    return logSkippedEmail(input, "No recipients were provided for the email send attempt.", recipients);
  }

  if (!resendApiKey || !env.resendFromEmail) {
    return logSkippedEmail(input, "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL first.", recipients);
  }

  const resend = new Resend(resendApiKey);
  const replyTo = normalizeEmailList(input.replyTo ?? getDefaultReplyTo());

  try {
    const response = await resend.emails.send({
      from: env.resendFromEmail,
      to: recipients,
      subject: input.subject,
      react: input.react,
      text: input.text,
      replyTo: replyTo.length ? replyTo : undefined,
    });

    if (response.error) {
      const errorMessage = response.error.message || "Resend rejected the email send attempt.";
      await recordEmailDeliveryAttempt({
        family: input.family,
        status: "Failed",
        recipients,
        subject: input.subject,
        relatedEntityId: input.relatedEntityId,
        userEmail: input.userEmail,
        routeTarget: input.routeTarget,
        error: errorMessage,
      });

      return {
        ok: false as const,
        status: "Failed" as const,
        messageId: null,
        error: errorMessage,
      };
    }

      await recordEmailDeliveryAttempt({
        family: input.family,
        status: "Sent",
        recipients,
        subject: input.subject,
        relatedEntityId: input.relatedEntityId,
      userEmail: input.userEmail,
      routeTarget: input.routeTarget,
      messageId: response.data?.id ?? null,
    });

    return {
      ok: true as const,
      status: "Sent" as const,
      messageId: response.data?.id ?? null,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Resend delivery error.";
    await recordEmailDeliveryAttempt({
      family: input.family,
      status: "Failed",
      recipients,
      subject: input.subject,
      relatedEntityId: input.relatedEntityId,
      userEmail: input.userEmail,
      routeTarget: input.routeTarget,
      error: errorMessage,
    });

    return {
      ok: false as const,
      status: "Failed" as const,
      messageId: null,
      error: errorMessage,
    };
  }
}
