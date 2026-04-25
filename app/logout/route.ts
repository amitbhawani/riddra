import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(/:$/, "");

  if (host) {
    return `${protocol}://${host}`;
  }

  return request.nextUrl.origin;
}

function clearAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-") || cookie.name.toLowerCase().includes("supabase")) {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        path: "/",
      });
    }
  });
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", getRequestOrigin(request)));

  if (hasRuntimeSupabaseEnv()) {
    try {
      const supabase = await createSupabaseRouteHandlerClient(response);
      await supabase.auth.signOut();
    } catch {
      // Best-effort logout still clears known auth cookies below.
    }
  }

  clearAuthCookies(request, response);
  return response;
}
