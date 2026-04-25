import { env } from "@/lib/env";
import { getConfiguredPublicSiteUrl } from "@/lib/public-site-url";

type CallbackItem = {
  label: string;
  value: string;
  status: "Ready" | "Needs confirmation";
  notes: string;
};

export function getCallbackMatrix() {
  const siteUrl = getConfiguredPublicSiteUrl();
  const supabaseProjectCallback = env.supabaseUrl
    ? `${env.supabaseUrl.replace(/\/$/, "")}/auth/v1/callback`
    : "Add NEXT_PUBLIC_SUPABASE_URL to reveal the exact Supabase callback";

  const items: CallbackItem[] = [
    {
      label: "Primary site auth callback",
      value: siteUrl ? `${siteUrl}/auth/callback` : "Configure NEXT_PUBLIC_SITE_URL or Launch Config site URL",
      status: siteUrl ? "Ready" : "Needs confirmation",
      notes: "This should exist in Supabase redirect URLs and match the domain that users will actually visit.",
    },
    {
      label: "Supabase Google redirect URI",
      value: supabaseProjectCallback,
      status: env.supabaseUrl ? "Ready" : "Needs confirmation",
      notes: "Use this exact URI inside Google Cloud OAuth credentials because Google redirects to Supabase before the app.",
    },
    {
      label: "Primary site URL",
      value: siteUrl || "Configure NEXT_PUBLIC_SITE_URL or Launch Config site URL",
      status: siteUrl ? "Ready" : "Needs confirmation",
      notes: "This should match the Supabase Site URL and the production domain configured in Vercel.",
    },
  ];

  return {
    items,
    ready: items.filter((item) => item.status === "Ready").length,
    pending: items.filter((item) => item.status === "Needs confirmation").length,
  };
}
