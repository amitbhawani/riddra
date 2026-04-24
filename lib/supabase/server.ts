import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseTimedFetch, logSupabaseServerWarning } from "@/lib/supabase/shared";

export async function createSupabaseServerClient() {
  if (!hasRuntimeSupabaseEnv()) {
    throw new Error("Supabase environment variables are missing.");
  }

  const cookieStore = await cookies();
  const config = getRuntimeLaunchConfig();

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      fetch: createSupabaseTimedFetch("Supabase server request"),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
