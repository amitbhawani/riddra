import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

type ActivationStep = {
  step: string;
  status: "Ready to run" | "Blocked" | "Optional";
  owner: "User" | "Shared";
  detail: string;
  href: string;
};

export function getActivationSequence() {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const hasSupport = Boolean(config.supportEmail || config.contactEmail);
  const hasSupabasePublic = hasRuntimeSupabaseEnv();
  const hasPayments = Boolean(config.razorpayKeyId && config.razorpayWebhookSecret);
  const hasEmail = resend.configured;

  const steps: ActivationStep[] = [
    {
      step: "Apply site URL, launch mode, and support email",
      status: hasSupport ? "Ready to run" : "Blocked",
      owner: "User",
      detail:
        "Set NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_LAUNCH_MODE, and NEXT_PUBLIC_SUPPORT_EMAIL first so the rest of launch posture, trust copy, and callbacks point to the right destination.",
      href: "/admin/domain-readiness",
    },
    {
      step: "Apply Supabase public env keys",
      status: hasSupabasePublic ? "Ready to run" : "Blocked",
      owner: "User",
      detail:
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before testing account and auth behavior.",
      href: "/admin/credential-matrix",
    },
    {
      step: "Add Supabase service-role key for deeper admin activation",
      status: hasSupabasePublic && config.supabaseServiceRoleKey ? "Ready to run" : "Optional",
      owner: "User",
      detail:
        "Service-role access strengthens deeper admin and backend activation work, but public auth and controlled launch-prep can move before every privileged workflow is live.",
      href: "/admin/credential-matrix",
    },
    {
      step: "Configure Supabase and Google callback values",
      status: hasSupabasePublic ? "Ready to run" : "Blocked",
      owner: "Shared",
      detail:
        "Use the callback matrix to align local, production, and Supabase redirect URIs before testing Google or email sign-in.",
      href: "/admin/callback-matrix",
    },
    {
      step: "Turn on Google and email auth in Supabase",
      status: hasSupabasePublic ? "Ready to run" : "Blocked",
      owner: "User",
      detail:
        "Enable Google provider and email auth after the redirect URLs are correct so login and callback verification can succeed end to end.",
      href: "/admin/auth-activation",
    },
    {
      step: "Redeploy and run auth/account smoke checks",
      status: hasSupabasePublic ? "Ready to run" : "Blocked",
      owner: "Shared",
      detail:
        "After envs and provider setup are in place, redeploy and test login, callback completion, account setup, and protected admin access.",
      href: "/admin/preflight-checklist",
    },
    {
      step: "Apply payments and webhook secrets if billing is in scope",
      status: hasPayments ? "Ready to run" : "Optional",
      owner: "User",
      detail:
        "Only do this before launch if subscriptions or paid messaging are part of today’s scope; otherwise keep monetization visually present but not operational.",
      href: "/admin/payment-readiness",
    },
    {
      step: "Apply email delivery provider if alerts or auth email polish is in scope",
      status: hasEmail ? "Ready to run" : "Optional",
      owner: "User",
      detail:
        "Resend can stay optional for a controlled beta, but it becomes important once support flows, alert delivery, or subscriber communications need to work reliably. Use deployment env for credentials and launch-config for support routing.",
      href: "/admin/communication-readiness",
    },
    {
      step: "Lock launch scope, beta gate, and preflight owner signoff",
      status: hasSupabasePublic && hasSupport ? "Ready to run" : "Blocked",
      owner: "Shared",
      detail:
        "Make final decisions on what is public, what is gated, and whether the platform should be in launch prep or public beta before inviting outside traffic.",
      href: "/admin/launch-scope",
    },
  ];

  return {
    steps,
    ready: steps.filter((step) => step.status === "Ready to run").length,
    blocked: steps.filter((step) => step.status === "Blocked").length,
    optional: steps.filter((step) => step.status === "Optional").length,
  };
}
