import type { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseTimedFetch } from "@/lib/supabase/shared";

export function createSupabaseRouteHandlerClient(request: NextRequest, response: NextResponse) {
  if (!hasRuntimeSupabaseEnv()) {
    throw new Error("Supabase environment variables are missing.");
  }

  const config = getRuntimeLaunchConfig();

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      fetch: createSupabaseTimedFetch("Supabase auth callback"),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
}
