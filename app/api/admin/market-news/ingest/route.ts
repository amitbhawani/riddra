import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { runMarketNewsIngestion } from "@/lib/market-news/ingest";

function getConfiguredMarketNewsSecret() {
  return process.env.MARKET_NEWS_CRON_SECRET?.trim() ?? "";
}

function getDevelopmentDebugPayload() {
  if (process.env.NODE_ENV === "production") {
    return {};
  }

  return {
    debug: {
      marketNewsCronSecretConfigured: Boolean(process.env.MARKET_NEWS_CRON_SECRET?.trim()),
    },
  };
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

export async function POST(request: NextRequest) {
  if (!getConfiguredMarketNewsSecret()) {
    return NextResponse.json(
      {
        ok: false,
        error: "MARKET_NEWS_CRON_SECRET must be configured.",
        ...getDevelopmentDebugPayload(),
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized market news ingestion request.",
        ...getDevelopmentDebugPayload(),
      },
      { status: 401 },
    );
  }

  if (!hasRuntimeSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase admin environment variables are required for market news ingestion.",
        ...getDevelopmentDebugPayload(),
      },
      { status: 503 },
    );
  }

  try {
    const result = await runMarketNewsIngestion();

    return NextResponse.json({
      ok: true,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      ...getDevelopmentDebugPayload(),
      sources: result.sources.map((source) => ({
        source: source.source,
        status: source.status,
        fetched: source.fetched,
        inserted: source.inserted,
        duplicates: source.duplicates,
        failed: source.failed,
        error: source.error,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown market news ingestion failure";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        ...getDevelopmentDebugPayload(),
      },
      { status: 500 },
    );
  }
}
