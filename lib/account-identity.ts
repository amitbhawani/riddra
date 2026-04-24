import type { User } from "@supabase/supabase-js";

export type AccountScopedUser = Pick<User, "id" | "email">;

export function normalizeAccountEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized || undefined;
}

export function buildAccountUserKey(user: AccountScopedUser) {
  const emailKey = normalizeAccountEmail(user.email)
    ?.replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return emailKey || user.id;
}

export function buildAccountFallbackEmail(user: AccountScopedUser) {
  return normalizeAccountEmail(user.email) ?? `${buildAccountUserKey(user)}@local-preview.riddra`;
}
