import { env } from "@/lib/env";
import { hasConfiguredPublicSiteUrl } from "@/lib/public-site-url";

type CredentialItem = {
  key: string;
  status: "Present" | "Missing" | "Optional";
  usedFor: string;
};

export function getCredentialMatrix() {
  const items: CredentialItem[] = [
    {
      key: "NEXT_PUBLIC_SITE_URL",
      status: hasConfiguredPublicSiteUrl() ? "Present" : "Missing",
      usedFor: "Public domain, auth redirect composition, sitemap base, and trust-facing metadata.",
    },
    {
      key: "NEXT_PUBLIC_LAUNCH_MODE",
      status: env.launchMode ? "Present" : "Missing",
      usedFor: "Controlling whether the platform presents as internal review, launch prep, public beta, or full launch.",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      status: env.supabaseUrl ? "Present" : "Missing",
      usedFor: "Browser and server Supabase clients, auth flows, and protected account/admin access.",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      status: env.supabaseAnonKey ? "Present" : "Missing",
      usedFor: "Public Supabase access for auth and browser-backed session handling.",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      status: env.supabaseServiceRoleKey ? "Present" : "Missing",
      usedFor: "Admin-grade backend activation, migrations, and future privileged workflows.",
    },
    {
      key: "NEXT_PUBLIC_SUPPORT_EMAIL",
      status: env.supportEmail ? "Present" : "Missing",
      usedFor: "Trust pages, support contact, and user-facing recovery/communication paths.",
    },
    {
      key: "RESEND_API_KEY",
      status: env.resendApiKey ? "Present" : "Missing",
      usedFor: "Transactional email delivery, alerts, and future subscriber communication.",
    },
    {
      key: "RAZORPAY_KEY_ID",
      status: env.razorpayKeyId ? "Present" : "Missing",
      usedFor: "Client-facing payment initialization for subscriptions and billing.",
    },
    {
      key: "RAZORPAY_KEY_SECRET",
      status: env.razorpayKeySecret ? "Present" : "Missing",
      usedFor: "Server-side payment operations and secure billing actions.",
    },
    {
      key: "RAZORPAY_WEBHOOK_SECRET",
      status: env.razorpayWebhookSecret ? "Present" : "Missing",
      usedFor: "Webhook verification so payment events can be trusted and entitlements updated safely.",
    },
    {
      key: "OPENAI_API_KEY",
      status: env.openAiApiKey ? "Present" : "Optional",
      usedFor: "Optional live AI usage. Formula-first mode still works without it.",
    },
    {
      key: "AI_REAL_CALLS_ENABLED",
      status: "Present",
      usedFor: "Controls whether real AI calls are enabled or the platform stays formula-first.",
    },
  ];

  return {
    total: items.length,
    present: items.filter((item) => item.status === "Present").length,
    missing: items.filter((item) => item.status === "Missing").length,
    items,
  };
}
