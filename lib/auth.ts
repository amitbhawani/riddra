import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import {
  LOCAL_BYPASS_EMAIL_COOKIE,
  isLocalAuthBypassEnabled,
  sanitizeLocalBypassEmail,
} from "@/lib/local-auth-bypass";
import {
  OPEN_ACCESS_SURFACE_HEADER,
  isOpenAdminAccessEnabled,
  isTrustedLocalRequestHost,
} from "@/lib/open-access";
import { isBetaApprovedEmail } from "@/lib/route-access";
import {
  allProductUserCapabilities,
  getEffectiveCapabilities,
  type ProductUserCapability,
} from "@/lib/product-permissions";
import { getConfiguredAdminEmails, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseAuthCookies, logSupabaseServerWarning } from "@/lib/supabase/shared";
import {
  ensureUserProductProfile,
  getUserProductProfile,
  getUserRole,
  type ProductUserRole,
} from "@/lib/user-product-store";

export { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";
export { getAuthContinuityState } from "@/lib/local-auth-bypass";

async function getBypassEmail() {
  const cookieStore = await cookies();
  const overridden = sanitizeLocalBypassEmail(cookieStore.get(LOCAL_BYPASS_EMAIL_COOKIE)?.value);
  if (overridden) {
    return overridden;
  }

  const configured = getConfiguredAdminEmails()[0];

  return configured ?? "amitbhawani@gmail.com";
}

async function getLocalBypassUser() {
  return {
    id: "local-admin-bypass",
    email: await getBypassEmail(),
    app_metadata: {},
    user_metadata: {
      localBypass: true,
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

async function isOpenAccessRequest() {
  if (!isOpenAdminAccessEnabled()) {
    return false;
  }

  const requestHeaders = await headers();
  return (
    isTrustedLocalRequestHost(requestHeaders.get("host")) &&
    requestHeaders.get(OPEN_ACCESS_SURFACE_HEADER) === "admin"
  );
}

async function isTrustedLocalBypassRequest() {
  if (!isLocalAuthBypassEnabled()) {
    return false;
  }

  const requestHeaders = await headers();
  return isTrustedLocalRequestHost(requestHeaders.get("host"));
}

export async function getCurrentUser() {
  if (await isTrustedLocalBypassRequest()) {
    return await getLocalBypassUser();
  }

  if (!hasRuntimeSupabaseEnv()) {
    if (await isOpenAccessRequest()) {
      return await getLocalBypassUser();
    }

    return null;
  }

  const cookieStore = await cookies();
  const hasAuthCookies = hasSupabaseAuthCookies(cookieStore.getAll().map((cookie) => cookie.name));

  if (!hasAuthCookies) {
    if (await isOpenAccessRequest()) {
      return await getLocalBypassUser();
    }

    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return user;
    }
  } catch (error) {
    logSupabaseServerWarning("Unable to resolve the current user from Supabase", error);
  }

  if (await isOpenAccessRequest()) {
    return await getLocalBypassUser();
  }

  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await ensureUserProductProfile(user);
  return user;
}

export async function getCurrentOperatorContext(): Promise<{
  user: User;
  role: ProductUserRole;
  capabilities: ProductUserCapability[];
} | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (await isOpenAccessRequest()) {
    return {
      user,
      role: "admin",
      capabilities: [...allProductUserCapabilities],
    };
  }

  const profile = await getUserProductProfile(user);

  return {
    user,
    role: profile.role,
    capabilities: getEffectiveCapabilities(profile.role, profile.capabilities),
  };
}

function normalizedAdminEmails() {
  return Array.from(new Set(getConfiguredAdminEmails().map((value) => value.toLowerCase())));
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;

  return normalizedAdminEmails().includes(email.toLowerCase());
}

export function isBetaApprovedUserEmail(email: string | null | undefined) {
  if (isAdminEmail(email)) {
    return true;
  }

  return isBetaApprovedEmail(email);
}

export async function isAdminUser() {
  if (await isOpenAccessRequest()) {
    return true;
  }

  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  if (isAdminEmail(user.email)) {
    return true;
  }

  return (await getUserRole(user)) === "admin";
}

export async function isBetaUser() {
  if (await isOpenAccessRequest()) {
    return true;
  }

  const user = await getCurrentUser();

  return isBetaApprovedUserEmail(user?.email);
}

export async function requireAdmin() {
  const context = await getCurrentOperatorContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role !== "admin") {
    redirect("/account");
  }

  return context.user;
}

export async function getCurrentUserRole(): Promise<ProductUserRole | null> {
  return (await getCurrentOperatorContext())?.role ?? null;
}

export async function getCurrentUserCapabilities(): Promise<ProductUserCapability[]> {
  return (await getCurrentOperatorContext())?.capabilities ?? [];
}

export async function requireOperator() {
  const context = await getCurrentOperatorContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role !== "admin" && context.role !== "editor") {
    redirect("/account");
  }

  return context;
}

export async function requireBetaUser() {
  const user = await requireUser();

  if ((await isOpenAccessRequest()) || (await isTrustedLocalBypassRequest())) {
    return user;
  }

  if (!isBetaApprovedUserEmail(user.email)) {
    redirect("/private-beta");
  }

  return user;
}
