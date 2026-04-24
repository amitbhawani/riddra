import { canUseDebugFallbackPaths } from "@/lib/durable-data-runtime";
import { env } from "@/lib/env";
import { hasSupabaseEnv } from "@/lib/env";

export type AuthContinuityState = {
  mode: "supabase_session" | "local_bypass" | "auth_unconfigured";
  label: string;
  sessionReliability: "Verified" | "Preview" | "Blocked";
  hasReloadSafeSession: boolean;
  note: string;
};

export const LOCAL_BYPASS_EMAIL_COOKIE = "riddra-local-bypass-email";

export function isLocalAuthBypassEnabled() {
  return canUseDebugFallbackPaths() && env.localAuthBypass === "true";
}

export function sanitizeLocalBypassEmail(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

export function getAuthContinuityState(): AuthContinuityState {
  if (isLocalAuthBypassEnabled()) {
    return {
      mode: "local_bypass",
      label: "Local bypass",
      sessionReliability: "Preview",
      hasReloadSafeSession: false,
      note: "Local bypass is enabled for development, so account state is visible without a verified outside-user session.",
    };
  }

  if (hasSupabaseEnv()) {
    return {
      mode: "supabase_session",
      label: "Supabase session",
      sessionReliability: "Verified",
      hasReloadSafeSession: true,
      note: "Signed-in continuity runs through Supabase session cookies, so refresh and reload can be validated against stored auth state.",
    };
  }

  return {
    mode: "auth_unconfigured",
    label: "Auth unconfigured",
    sessionReliability: "Blocked",
    hasReloadSafeSession: false,
    note: "Supabase auth environment variables are missing, so reliable sign-in, refresh, and reload continuity cannot be verified yet.",
  };
}
