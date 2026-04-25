import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { insertMarketNewsAnalyticsEvent } from "@/lib/market-news/queries";
import { isMarketNewsEntityType } from "@/lib/market-news/types";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

type MarketNewsClickBody = {
  articleId?: unknown;
  eventType?: unknown;
  entityType?: unknown;
  entitySlug?: unknown;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  if (!hasRuntimeSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase admin environment variables are required for market news click tracking.",
      },
      { status: 503 },
    );
  }

  let payload: MarketNewsClickBody;

  try {
    payload = (await request.json()) as MarketNewsClickBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid market news click payload.",
      },
      { status: 400 },
    );
  }

  const articleId = normalizeString(payload.articleId);
  const rawEventType = normalizeString(payload.eventType).toLowerCase();
  const rawEntityType = normalizeString(payload.entityType).toLowerCase();
  const entitySlug = normalizeString(payload.entitySlug);
  const referrer = normalizeString(request.headers.get("referer"));

  if (!articleId) {
    return NextResponse.json(
      {
        ok: false,
        error: "articleId is required.",
      },
      { status: 400 },
    );
  }

  const eventType = rawEventType === "impression" ? "impression" : "click";
  const entityType = isMarketNewsEntityType(rawEntityType) ? rawEntityType : null;

  try {
    await insertMarketNewsAnalyticsEvent({
      article_id: articleId,
      event_type: eventType,
      entity_type: entityType,
      entity_slug: entitySlug || null,
      referrer: referrer || null,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown market news click tracking failure";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
