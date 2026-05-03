import type { User } from "@supabase/supabase-js";

export type AccountScopedUser = Pick<User, "id" | "email">;

export function normalizeAccountEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized || undefined;
}

export function buildAccountUserKey(user: AccountScopedUser) {
  return normalizeAccountEmail(user.email) || user.id;
}

export function buildAccountFallbackEmail(user: AccountScopedUser) {
  return normalizeAccountEmail(user.email) ?? `${buildAccountUserKey(user)}@local-preview.riddra`;
}
