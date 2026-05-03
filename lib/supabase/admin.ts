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
    global: {
      fetch: createSupabaseTimedFetch("Supabase admin request"),
    },
  });
}

export function createSupabaseReadClient() {
  if (!hasRuntimeSupabaseEnv()) {
    throw new Error("Supabase public environment variables are missing.");
  }

  const config = getRuntimeLaunchConfig();

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createSupabaseTimedFetch("Supabase public read"),
    },
  });
}
