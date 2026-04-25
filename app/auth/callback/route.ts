import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getPublicSafeHref } from "@/lib/public-surface-links";

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

function redirectToLogin(request: NextRequest, error?: "auth_failed") {
  const loginUrl = new URL("/login", getRequestOrigin(request));

  if (error) {
    loginUrl.searchParams.set("error", error);
  }

  return NextResponse.redirect(loginUrl);
}

function resolveSafeNextPath(request: NextRequest) {
  const requestedNext = request.nextUrl.searchParams.get("next");

  if (!requestedNext) {
    return "/account";
  }

  if (requestedNext.startsWith("/")) {
    return getPublicSafeHref(requestedNext) ?? "/account";
  }

  try {
    const parsed = new URL(requestedNext, request.nextUrl.origin);

    if (parsed.origin !== request.nextUrl.origin) {
      return "/account";
    }

    return getPublicSafeHref(`${parsed.pathname}${parsed.search}${parsed.hash}`) ?? "/account";
  } catch {
    return "/account";
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return redirectToLogin(request);
  }

  if (!hasRuntimeSupabaseEnv()) {
    return redirectToLogin(request, "auth_failed");
  }

  const nextPath = resolveSafeNextPath(request);
  const response = NextResponse.redirect(new URL(nextPath, getRequestOrigin(request)));
  const supabase = await createSupabaseRouteHandlerClient(response);

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectToLogin(request, "auth_failed");
    }
  } catch {
    return redirectToLogin(request, "auth_failed");
  }

  return response;
}
