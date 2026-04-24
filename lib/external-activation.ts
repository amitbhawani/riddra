import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getCommunicationDeliveryProofStatus } from "@/lib/communication-readiness";
import { getMarketDataRefreshProofStatus, getMarketDataRefreshReadiness } from "@/lib/market-data-refresh";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

export const externalActivationSummary = {
  providerGroups: 5,
  requiredCredentials: 7,
  launchCritical: 4,
};

export function getExternalActivationItems() {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const deliveryProof = getCommunicationDeliveryProofStatus();
  const hasPublicSupabase = hasRuntimeSupabaseEnv();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasSiteUrl = Boolean(config.siteUrl);
  const supportDestination = config.supportEmail || config.contactEmail || config.feedbackInbox;
  const hasSupportEmail = Boolean(supportDestination);
  const hasEmailDelivery = delivery.configured;
  const refreshReadiness = getMarketDataRefreshReadiness();
  const refreshProof = getMarketDataRefreshProofStatus();
  const hasPayments =
    Boolean(config.razorpayKeyId) &&
    Boolean(config.razorpayKeySecret) &&
    Boolean(config.razorpayWebhookSecret);
  const hasRefreshExecution = refreshProof.proofMode === "verification_ready";
  const hasPartialRefreshExecution =
    refreshReadiness.sourceMode !== "configuration_pending" ||
    refreshReadiness.quoteEndpointReady ||
    refreshReadiness.fundNavEndpointReady;

  return [
    {
      title: "Supabase and auth activation",
      status: hasAdminSupabase ? "Configured" : hasPublicSupabase ? "Partial" : "Blocked",
      action: hasAdminSupabase ? "Shared" : "User",
      href: "/admin/auth-activation",
      summary: hasAdminSupabase
        ? "Public and admin Supabase envs are present, and Google login can now be validated against a real project. This lane is config-complete, but it still needs migration, seed, and protected-route verification."
        : hasPublicSupabase
          ? "Public Supabase auth envs are present, so login setup is partially configured. Service-role activation and backend verification still need to be completed."
          : "Project URL, anon key, service role usage, Google auth enablement, and migration execution are still required before account and admin access can be treated as live.",
    },
    {
      title: "Email and support delivery",
      status: hasSupportEmail && hasEmailDelivery ? "Configured" : hasSupportEmail || hasEmailDelivery ? "Partial" : "Blocked",
      action: hasSupportEmail ? "Shared" : "User",
      href: "/admin/communication-readiness",
      summary:
        hasSupportEmail && hasEmailDelivery
          ? "Support contact, Resend, and Trigger.dev are all present. This lane is config-complete, but it still needs end-to-end verification across auth emails, alerts, and support flows."
          : hasSupportEmail
            ? `Support contact is configured as ${supportDestination}, but delivery is still missing ${deliveryProof.exactMissing.join(", ")}, so auth emails and alerts cannot be trusted end to end yet.`
            : "Support email destination, Resend delivery, and Trigger.dev worker activation are still needed before alerts, auth emails, and support flows can work end to end.",
    },
    {
      title: "Payments and webhook secrets",
      status: "Deferred",
      action: hasPayments ? "Shared" : "User",
      href: "/admin/payment-readiness",
      summary: hasPayments
        ? "Payment keys and webhook secret are present, but the entire commercial billing lane remains intentionally deferred outside private-beta activation."
        : "Razorpay live configuration, webhook secret, and plan-to-entitlement verification still need real activation before monetization moves beyond structure, but that commercial lane is intentionally deferred outside the private-beta deployment gate.",
    },
    {
      title: "Deployment environment and domain",
      status: hasSiteUrl ? "Partial" : "Blocked",
      action: "Shared",
      href: "/admin/domain-readiness",
      summary:
        hasSiteUrl
          ? "A canonical site URL is present, but production URL alignment, smoke-test proof, and final deployment confidence still need one operator-owned pass."
          : "Vercel environment values, production URL alignment, and domain confidence still need to be finalized as one deployment step instead of scattered setup.",
    },
    {
      title: "Data-source and indicator inputs",
      status: hasRefreshExecution ? "Configured" : hasPartialRefreshExecution || hasAdminSupabase ? "Partial" : "Blocked",
      action: "Shared",
      href: "/admin/provider-onboarding",
      summary: hasRefreshExecution || hasPartialRefreshExecution || hasAdminSupabase
        ? hasRefreshExecution
          ? `Durable refresh is configured through ${refreshProof.sourceLabel}. The remaining work is one retained refresh proof that lands real quote, fund, and index rows in the intended Supabase project.`
          : `The delayed data bridge, verified ingestion route, provider-sync path, and first trusted stock plus fund refresh rehearsal are now wired in code. Remaining exact inputs: ${refreshProof.exactMissing.join(", ")}${refreshProof.recommendedMissing.length ? `. Recommended next inputs: ${refreshProof.recommendedMissing.join(", ")}` : ""}.`
        : "Official or permitted source decisions plus the Pine Script for the proprietary indicator still need to be supplied before advanced data differentiation can become real.",
    },
  ];
}

export const externalActivationRules = [
  "Blocked provider inputs should be treated as launch blockers, not background TODOs.",
  "Credentials, domains, and webhook secrets must be activated in a known order.",
  "Differentiated features need real source inputs before they should be promised publicly.",
];
