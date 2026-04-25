import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseTimedFetch } from "@/lib/supabase/shared";

export async function createSupabaseRouteHandlerClient(response: NextResponse) {
  if (!hasRuntimeSupabaseEnv()) {
    throw new Error("Supabase environment variables are missing.");
  }

  const cookieStore = await cookies();
  const config = getRuntimeLaunchConfig();

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      fetch: createSupabaseTimedFetch("Supabase auth callback"),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
