import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getResendReadiness, getSupportInboxRecipients } from "@/lib/email/resend";

export type CommunicationReadinessItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  note: string;
  href: string;
};

export function getCommunicationReadinessItems(): CommunicationReadinessItem[] {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const supportEmail = config.supportEmail || config.contactEmail;
  const helpChannels = [
    config.supportWhatsapp,
    config.telegramHandle,
    config.xHandle,
    config.discordInviteUrl,
  ].filter(Boolean);

  return [
    {
      title: "Support email",
      status: supportEmail ? "Ready" : "Blocked",
      note: supportEmail
        ? `Support contact is configured as ${supportEmail}.`
        : "Add a support or contact email in the launch-config console so public trust surfaces stop relying on placeholder support language.",
      href: "/admin/launch-config-console",
    },
    {
      title: "Transactional email provider",
      status: delivery.configured ? "In progress" : delivery.resendReady || delivery.triggerReady ? "In progress" : "Blocked",
      note: delivery.configured
        ? "Resend and Trigger.dev are both configured, so support and notification email flows can move into full send testing next."
        : delivery.resendReady || delivery.triggerReady
          ? "Part of the delivery runtime exists, but both Resend and Trigger.dev must be active before support acknowledgements, contact delivery, and account alerts can be trusted."
          : "Add RESEND_API_KEY, RESEND_FROM_EMAIL, and Trigger.dev worker env before support acknowledgements, contact delivery, and account alerts can be trusted.",
      href: "/admin/launch-config-console",
    },
    {
      title: "Billing support handoff",
      status: config.billingSupportEmail ? "Ready" : "In progress",
      note: config.billingSupportEmail
        ? `Billing support mail is configured as ${config.billingSupportEmail}.`
        : "Add a dedicated billing support email so invoice, payment, and subscription recovery paths have a cleaner operator handoff.",
      href: "/admin/launch-config-console",
    },
    {
      title: "Operator help channels",
      status: helpChannels.length >= 2 ? "Ready" : helpChannels.length === 1 ? "In progress" : "Blocked",
      note:
        helpChannels.length >= 2
          ? `Multiple support channels are configured (${helpChannels.length} active), so users can be directed beyond email if needed.`
          : helpChannels.length === 1
            ? "One support channel beyond email is configured, but launch resilience improves once at least two operator channels are ready."
            : "Add at least one operator channel such as WhatsApp, Telegram, X, or Discord so support is not email-only during launch.",
      href: "/admin/launch-config-console",
    },
    {
      title: "Feedback inbox and escalation queue",
      status: config.feedbackInbox ? "In progress" : "Blocked",
      note: config.feedbackInbox
        ? `Feedback inbox is configured as ${config.feedbackInbox}, so launch-day issues and qualitative reports can be triaged centrally.`
        : "Add a feedback inbox so bug reports, launch-day observations, and customer follow-up can be triaged from one place.",
      href: "/admin/launch-config-console",
    },
    {
      title: "Alert channel model",
      status: "Ready",
      note: "The app already has alerts, inbox, and preference surfaces ready for email, WhatsApp, SMS, and future push mapping.",
      href: "/alerts",
    },
  ];
}

export function getCommunicationDeliveryProofStatus() {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const resend = getResendReadiness();
  const supportInboxRecipients = getSupportInboxRecipients();
  const exactMissing = [...resend.missing];

  if (!delivery.triggerReady) {
    exactMissing.push("TRIGGER_SECRET_KEY and TRIGGER_PROJECT_REF");
  }

  if (!supportInboxRecipients.length) {
    exactMissing.push("NEXT_PUBLIC_SUPPORT_EMAIL or launch-config support/contact inbox");
  }

  return {
    configured: delivery.configured,
    proofMode: delivery.configured ? "verification_ready" : "blocked",
    supportInboxRecipients,
    resend,
    exactMissing,
    contactProofRoute: "/api/contact/requests",
    supportProofRoute: "/api/account/support/follow-up",
    deliveryLogEndpoints: [
      "/api/admin/email-delivery-log?family=contact_acknowledgement",
      "/api/admin/email-delivery-log?family=contact_inbox_notification",
      "/api/admin/email-delivery-log?family=support_acknowledgement",
      "/api/admin/email-delivery-log?family=support_follow_up",
      "/api/admin/email-delivery-log?family=support_inbox_notification",
    ],
    proofPages: ["/contact", "/account/support"],
    supportEmail: config.supportEmail || config.contactEmail || null,
  };
}
