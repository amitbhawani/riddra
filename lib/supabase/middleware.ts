import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env, hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";
import {
  OPEN_ACCESS_SURFACE_HEADER,
  REQUEST_PATH_HEADER,
  isOpenAccessSurfacePath,
  isOpenAdminAccessEnabled,
  isTrustedLocalRequestHost,
} from "@/lib/open-access";
import {
  isAdminEmailFromEnv,
  isOperatorApiPath,
  isOperatorSurfacePath,
} from "@/lib/route-access";
import { createSupabaseTimedFetch, hasSupabaseAuthCookies, logSupabaseServerWarning } from "@/lib/supabase/shared";

const DEFAULT_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function isAdminEmail(email: string | null | undefined) {
  return isAdminEmailFromEnv(email);
}

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  for (const [key, value] of Object.entries(DEFAULT_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (isOperatorSurfacePath(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  if (request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

function withHeaders(request: NextRequest, response: NextResponse) {
  return applySecurityHeaders(request, response);
}

function buildRequestHeaders(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, request.nextUrl.pathname);

  if (
    isOpenAdminAccessEnabled() &&
    isTrustedLocalRequestHost(request.headers.get("host")) &&
    isOpenAccessSurfacePath(request.nextUrl.pathname)
  ) {
    requestHeaders.set(OPEN_ACCESS_SURFACE_HEADER, "admin");
  } else {
    requestHeaders.delete(OPEN_ACCESS_SURFACE_HEADER);
  }

  return requestHeaders;
}

function shouldRefreshSupabaseSession(pathname: string) {
  const protectedPrefixes = [
    "/account",
    "/portfolio",
    "/auth",
    "/api/account",
    "/api/portfolio",
    "/api/auth",
    "/admin",
    "/api/admin",
    "/build-tracker",
    "/launch-readiness",
    "/source-readiness",
  ];

  return (
    protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    isOperatorSurfacePath(pathname)
  );
}

function redirectToLogin(request: NextRequest) {
  if (isOperatorApiPath(request.nextUrl.pathname)) {
    return withHeaders(request, NextResponse.json({ error: "Sign-in required." }, { status: 401 }));
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return withHeaders(request, NextResponse.redirect(loginUrl));
}

function redirectToAccount(request: NextRequest) {
  const accountUrl = request.nextUrl.clone();
  accountUrl.pathname = "/account";
  accountUrl.search = "";
  return withHeaders(request, NextResponse.redirect(accountUrl));
}

function forbiddenOperatorResponse(request: NextRequest) {
  if (isOperatorApiPath(request.nextUrl.pathname)) {
    return withHeaders(request, NextResponse.json({ error: "Admin access required." }, { status: 403 }));
  }

  return redirectToAccount(request);
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = buildRequestHeaders(request);
  const pathname = request.nextUrl.pathname;
  const localBypassEnabled =
    isLocalAuthBypassEnabled() && isTrustedLocalRequestHost(request.headers.get("host"));
  const hasAuthCookies = hasSupabaseAuthCookies(request.cookies.getAll().map((cookie) => cookie.name));
  const isOperatorSurface = isOperatorSurfacePath(pathname);

  if (localBypassEnabled || !hasSupabaseEnv() || !shouldRefreshSupabaseSession(pathname) || !hasAuthCookies) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    if (isOperatorSurface && !localBypassEnabled && !hasAuthCookies) {
      return redirectToLogin(request);
    }

    return withHeaders(request, response);
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    global: {
      fetch: createSupabaseTimedFetch("Supabase middleware auth refresh"),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isOperatorSurface && !user) {
      return redirectToLogin(request);
    }

    if (isOperatorSurface && !isAdminEmail(user?.email)) {
      const isAdminTree =
        pathname === "/admin" ||
        pathname.startsWith("/admin/") ||
        pathname === "/api/admin" ||
        pathname.startsWith("/api/admin/");

      if (!isAdminTree) {
        return forbiddenOperatorResponse(request);
      }
    }
  } catch (error) {
    logSupabaseServerWarning(`Skipping session refresh for ${pathname}`, error);

    if (isOperatorSurface) {
      return redirectToLogin(request);
    }
  }

  return withHeaders(request, response);
}
