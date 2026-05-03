import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function hasAdminServerHelper() {
  return hasRuntimeSupabaseAdminEnv();
}

export function hasUserSessionHelper() {
  return hasRuntimeSupabaseEnv();
}

export function hasPublicReadHelper() {
  return hasRuntimeSupabaseEnv();
}

export function createAdminServerHelper() {
  return createSupabaseAdminClient();
}

export async function createUserSessionHelper() {
  return createSupabaseServerClient();
}

export function createPublicReadHelper() {
  return createSupabaseReadClient();
}
