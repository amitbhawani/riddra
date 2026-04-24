import { hasSupabaseEnv } from "@/lib/env";
import { getAuthCallbackUrl } from "@/lib/public-site-url";

export type AuthActivationItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  note: string;
};

export function getAuthActivationItems() {
  const callbackUrl = getAuthCallbackUrl("/account/setup").replace("?next=%2Faccount%2Fsetup", "");

  const items: AuthActivationItem[] = [
    {
      title: "Google login code path",
      status: "Ready",
      note: "The UI and server action path for Google-first login are already implemented in the app.",
    },
    {
      title: "Email magic-link or OTP code path",
      status: "Ready",
      note: "The launch auth flow now uses email-link style authentication instead of password-first forms.",
    },
    {
      title: "Supabase auth environment",
      status: hasSupabaseEnv() ? "In progress" : "Blocked",
      note: hasSupabaseEnv()
        ? "Supabase public environment variables are present, so provider activation can continue."
        : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first.",
    },
    {
      title: "Google provider activation in Supabase",
      status: hasSupabaseEnv() ? "In progress" : "Blocked",
      note: `Enable Google provider in Supabase Auth and use ${callbackUrl} as an approved redirect/callback path.`,
    },
    {
      title: "Email provider activation in Supabase",
      status: hasSupabaseEnv() ? "In progress" : "Blocked",
      note: "Enable email OTP or magic link in Supabase Auth and verify the confirmation/login flow.",
    },
    {
      title: "End-to-end auth testing",
      status: "Blocked",
      note: "Test signup, login, callback, account setup redirect, and signout once real provider settings are in place.",
    },
  ];

  return {
    callbackUrl,
    items,
  };
}
