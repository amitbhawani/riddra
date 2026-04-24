import { hasDurableAccountStateStore } from "@/lib/account-state-durable-store";
import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

export type SubscriberLaunchItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  note: string;
  href: string;
};

export function getSubscriberLaunchReadinessItems(): SubscriberLaunchItem[] {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const hasBillingCore = Boolean(
    config.razorpayKeyId && config.razorpayKeySecret,
  );
  const hasBillingWebhook = Boolean(config.razorpayWebhookSecret);
  const hasSupportEmail = Boolean(config.supportEmail || config.contactEmail);
  const hasTransactionalEmail = delivery.configured;
  const hasDurableAccountState = hasDurableAccountStateStore();
  const hasVerifiedAuthRuntime = hasRuntimeSupabaseEnv() && !isLocalAuthBypassEnabled();
  const authBlocked = !hasRuntimeSupabaseEnv() || isLocalAuthBypassEnabled();

  return [
    {
      title: "Real auth and subscriber identity",
      status: hasVerifiedAuthRuntime ? "Ready" : authBlocked ? "Blocked" : "In progress",
      note:
        hasVerifiedAuthRuntime
          ? "Supabase session continuity is active and reload-safe, and the real signed-in path has already been proven through protected-route loads and reload-safe continuity. Remaining deployed-host rehearsal belongs to the release pass, not this subscriber-auth readiness lane."
          : !hasRuntimeSupabaseEnv()
            ? "Supabase auth configuration is still missing, so signup, login, session persistence, and plan-linked identity truth cannot be trusted yet."
            : "Account routes and admin surfaces still rely on the local admin bypass for continuity, so true public signup, login, session persistence, and plan-linked identity truth are not yet validated end to end.",
      href: "/account",
    },
    {
      title: "Plan gating and entitlement enforcement",
      status: "In progress",
      note: hasDurableAccountState
        ? "Subscriber routes, billing views, the access-model page, and the protected entitlement-audit route now include clearer gating and preview-vs-verified framing, while per-account entitlement posture can persist in the shared private-beta account-state store. Commercial billing is still deferred and the app still needs final auth and subscription verification before wider Starter, Pro, and Elite enforcement can be trusted end to end."
        : "Subscriber routes, billing views, the access-model page, and the protected entitlement-audit route now include clearer gating and preview-vs-verified framing, but entitlement posture still falls back to the local private-beta memory layer because the shared account-state store is unavailable. The app still leans on a local admin bypass and no real subscription record on core account surfaces, so wider Starter, Pro, and Elite enforcement is not yet trustworthy end to end.",
      href: "/admin/entitlements",
    },
    {
      title: "Checkout and billing core",
      status: hasBillingCore ? "In progress" : "Blocked",
      note: hasBillingCore
        ? "Razorpay core secrets are present, so the next work is real checkout validation, billing-state sync, and plan-to-access verification; the billing workspace plus the new billing-lifecycle and billing-recovery routes now behave more honestly by separating verified truth from preview-only layout and lifecycle guidance, and the first file-backed lifecycle-job layer now keeps renewal and recovery posture visible while that activation work is still pending."
        : "Billing surfaces exist, and the billing workspace plus billing-lifecycle and billing-recovery routes now separate verified truth from preview-only examples more clearly, while the first file-backed lifecycle-job layer keeps renewal and recovery posture visible. Live checkout still cannot be trusted until the core Razorpay credentials are configured.",
      href: "/admin/payment-readiness",
    },
    {
      title: "Webhook-confirmed billing truth",
      status: hasBillingCore && hasBillingWebhook ? "In progress" : "Blocked",
      note: hasBillingCore && hasBillingWebhook
        ? "Webhook secrets are present, which means billing-state truth can move from assumptions into verified lifecycle testing, and the billing-lifecycle route can become part of that subscriber validation."
        : "The webhook layer is coded, and the billing-lifecycle route now explains the intended stages more clearly, but subscriber truth is still blocked until the billing webhook secret is configured.",
      href: "/admin/payment-events",
    },
    {
      title: "Support and transactional delivery",
      status: hasSupportEmail ? "Ready" : "Blocked",
      note:
        hasSupportEmail && hasTransactionalEmail
          ? "Support contact, Resend, and Trigger.dev exist, and the protected account-support route already acts as the subscriber-facing handoff surface. The remaining work is live support acknowledgement and operator escalation proof, which is tracked separately in the blocker lane instead of as missing subscriber-support architecture."
          : hasSupportEmail
            ? "Support contact is present, the account-support route now gives subscriber help posture a clear protected destination, and the email routes fail honestly when the provider is missing. The remaining work is live Resend delivery proof, which is tracked separately in the blocker lane instead of as missing subscriber-support architecture."
            : "Wide signup and paid conversion should wait until support contact and transactional delivery are both production-ready, even though the account-support route now centralizes the intended help path.",
      href: "/admin/communication-readiness",
    },
    {
      title: "Portfolio, watchlists, alerts, and broker continuity",
      status: hasDurableAccountState && hasVerifiedAuthRuntime ? "Ready" : "In progress",
      note: hasDurableAccountState && hasVerifiedAuthRuntime
        ? "Portfolio, watchlists, alerts, broker routes, the saved-screen route, the workspace hub, the inbox route, the setup route, the consent center, the public alerts discovery route, the broker review queue, and the portfolio import plus manual-entry flows now have honest empty states, real per-user persistence, immediate shared account-continuity refreshes, and real storage-mode reporting through the signed-in workspace. Live broker adapters, delivery proof, and quote-backed valuation remain active execution lanes elsewhere, but subscriber continuity itself is no longer a build-side blocker."
        : hasDurableAccountState
          ? "Portfolio, watchlists, alerts, broker routes, the saved-screen route, the workspace hub, the inbox route, the setup route, the consent center, the public alerts discovery route, the broker review queue, and the portfolio import plus manual-entry flows now have stronger structure, clearer preview-state labeling, and better internal account-route continuity. Workspace, broker, portfolio, and per-account entitlement posture can now persist through the shared private-beta account-state store, while remaining fallback lanes still expose their storage mode clearly. The last blocker is proving signed-in continuity everywhere against the real auth path."
          : "Portfolio, watchlists, alerts, broker routes, the saved-screen route, the workspace hub, the inbox route, the setup route, the consent center, the public alerts discovery route, the broker review queue, and the portfolio import plus manual-entry flows now have stronger structure, clearer preview-state labeling, and better internal account-route continuity, but these lanes still fall back to local preview/private-beta files because the shared account-state store is unavailable. Holdings valuation, delivery controls, revision history, broker-review durability, and real broker linkage still need production-grade subscriber storage and sync truth.",
      href: "/account/watchlists",
    },
    {
      title: "Trader workstation and option-chain reality",
      status: "In progress",
      note: "Premium route gating exists, the workstation now frames its strongest verified anchors more honestly, the option-chain route removes fake strike values in favor of a layout-plus-interpretation preview, and the first file-backed derivatives-memory layer now preserves strike windows, chain snapshots, analytics posture, and workstation linkage instead of pure static layout copy. Live trader workflow depth and real derivatives data are still not ready for outside users.",
      href: "/trader-workstation",
    },
    {
      title: "Conversion-path verification",
      status: "In progress",
      note:
        hasVerifiedAuthRuntime
          ? "Pricing, signup, onboarding, account, entitlement-audit, billing-lifecycle, billing-recovery, and account-support routes are all live. The remaining work is one repeated launch-grade pass from landing page to subscriber workspace and support delivery with real providers."
          : "Pricing, signup, onboarding, account, entitlement-audit, billing-lifecycle, billing-recovery, and account-support routes are all live, but the full conversion path still needs one launch-grade pass from landing page to subscriber workspace once auth stops relying on the local admin bypass and billing state becomes real.",
      href: "/get-started",
    },
  ];
}

export const subscriberLaunchRules = [
  "Do not claim paid-plan boundaries are final while signed-in users still receive broad beta generosity in the workspace.",
  "A plan can only be treated as real once checkout, webhook confirmation, entitlement changes, and subscriber-facing account state all agree.",
  "Support, billing, and onboarding emails should be tested together because subscriber trust breaks when only one communication path works.",
  "Broad public promotion should wait until at least one clean conversion path has been validated from homepage to signup to protected workspace.",
];
