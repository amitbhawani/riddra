import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

export type LaunchCommitmentItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked" | "Deferred";
  detail: string;
  href: string;
};

export function getLaunchCommitmentItems(): LaunchCommitmentItem[] {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const normalizedLaunchMode = config.launchMode.toLowerCase();
  const billingDeferred = !["public_live", "public-launch", "public_launch", "live"].includes(
    normalizedLaunchMode,
  );
  const authReady = hasRuntimeSupabaseEnv();
  const adminReady = hasRuntimeSupabaseAdminEnv();
  const paymentReady = Boolean(
    config.razorpayKeyId && config.razorpayKeySecret && config.razorpayWebhookSecret,
  );
  const supportReady = Boolean(config.supportEmail || config.contactEmail);
  const emailReady = delivery.configured;
  const providerReady = Boolean(
    config.marketDataProviderUrl && (config.marketDataProviderToken || config.marketDataRefreshSecret),
  );

  return [
    {
      title: "Auth activation posture",
      status: authReady ? "In progress" : "Blocked",
      detail: authReady
        ? adminReady
          ? "Public auth envs and admin credentials exist in app config, but provider dashboard activation and callback verification still need completion."
          : "Public auth envs exist, but admin/service credentials still need completion before end-to-end activation can be treated as production-ready."
        : "Supabase auth envs are still incomplete, so public auth cannot be treated as activated yet.",
      href: "/admin/auth-activation",
    },
    {
      title: "Payment and subscription truth",
      status: billingDeferred ? "Deferred" : paymentReady ? "In progress" : "Blocked",
      detail: billingDeferred
        ? paymentReady
          ? "Razorpay credentials exist in app config, but commercial checkout, webhook-confirmed state, and entitlement truth remain deliberately deferred until the paid launch path resumes."
          : "Razorpay configuration is still incomplete, but commercial billing commitments are intentionally deferred and should not be treated as private-beta blockers."
        : paymentReady
          ? "Razorpay credentials exist in app config, but checkout flow, webhook-confirmed state, and entitlement truth remain part of the later commercial launch path."
          : "Razorpay key and webhook configuration are not fully present yet, so public billing commitments remain deferred and should not be treated as private-beta blockers.",
      href: "/admin/payment-readiness",
    },
    {
      title: "Support and transactional delivery",
      status: supportReady && emailReady ? "In progress" : supportReady ? "In progress" : "Blocked",
      detail:
        supportReady && emailReady
          ? "Support contact, Resend, and Trigger.dev exist in app config, but delivery, onboarding, and recovery flows still need production verification."
          : supportReady
            ? "Support contact exists, but Resend or Trigger.dev still needs activation before signup and billing recovery can be trusted."
            : "Support and communications still need a real public contact path before broad launch commitments are safe.",
      href: "/admin/communication-readiness",
    },
    {
      title: "Live-data commitment discipline",
      status: providerReady ? "In progress" : "Blocked",
      detail: providerReady
        ? "Provider wiring is configured enough for sync work, but verified payload flow, disclosure discipline, and production freshness checks still need completion."
        : "Provider credentials or refresh auth are still incomplete, so live-data claims remain blocked at the external activation layer.",
      href: "/admin/provider-onboarding",
    },
    {
      title: "Trust, legal, and launch promise signoff",
      status: supportReady ? "In progress" : "Blocked",
      detail: supportReady
        ? "The trust layer is structurally present, but broad-public claims still need final human signoff on scope, support promises, and legal posture."
        : "Trust copy exists, but final public commitments are still blocked by missing support and operational readiness.",
      href: "/admin/trust-signoff",
    },
  ];
}
