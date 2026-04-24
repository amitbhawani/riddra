import { createClient } from "@supabase/supabase-js";

import {
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
  hasRuntimeSupabaseEnv,
} from "@/lib/runtime-launch-config";
import { createSupabaseTimedFetch } from "@/lib/supabase/shared";

export function createSupabaseAdminClient() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  const config = getRuntimeLaunchConfig();

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseReadClient() {
  if (!hasRuntimeSupabaseEnv()) {
    throw new Error("Supabase public environment variables are missing.");
  }

  const config = getRuntimeLaunchConfig();
  const key = hasRuntimeSupabaseAdminEnv()
    ? config.supabaseServiceRoleKey
    : config.supabaseAnonKey;

  return createClient(config.supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createSupabaseTimedFetch("Supabase durable CMS read"),
    },
  });
}
