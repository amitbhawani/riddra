import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import {
  getMarketNewsRewriteReadiness,
  runMarketNewsRewrite,
} from "@/lib/market-news/rewrite";

function getConfiguredMarketNewsSecret() {
  return process.env.MARKET_NEWS_CRON_SECRET?.trim() ?? "";
}

function getProvidedSecret(request: NextRequest) {
  const headerSecret = request.headers.get("x-cron-secret")?.trim();

  if (headerSecret) {
    return headerSecret;
  }

  const authorization = request.headers.get("authorization")?.trim();

  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

function isAuthorized(request: NextRequest) {
  const configuredSecret = getConfiguredMarketNewsSecret();

  if (!configuredSecret) {
    return false;
  }

  return getProvidedSecret(request) === configuredSecret;
}

function parseLimit(request: NextRequest) {
  const rawValue = request.nextUrl.searchParams.get("limit");
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function parseRetryFailed(request: NextRequest) {
  const rawValue = request.nextUrl.searchParams.get("retryFailed")?.trim().toLowerCase();
  return rawValue === "true" || rawValue === "1" || rawValue === "yes";
}

export async function POST(request: NextRequest) {
  if (!getConfiguredMarketNewsSecret()) {
    return NextResponse.json(
      {
        ok: false,
        error: "MARKET_NEWS_CRON_SECRET must be configured.",
        readiness: getMarketNewsRewriteReadiness(),
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized market news rewrite request.",
      },
      { status: 401 },
    );
  }

  if (!hasRuntimeSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase admin environment variables are required for market news rewrite.",
        readiness: getMarketNewsRewriteReadiness(),
      },
      { status: 503 },
    );
  }

  try {
    const result = await runMarketNewsRewrite({
      limit: parseLimit(request),
      retryFailed: parseRetryFailed(request),
    });

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      created: result.created,
      rejected: result.rejected,
      failed: result.failed,
      articles: result.articles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown market news rewrite failure";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        readiness: getMarketNewsRewriteReadiness(),
      },
      { status: 500 },
    );
  }
}
