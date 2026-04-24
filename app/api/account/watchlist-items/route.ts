import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  addWatchlistItem,
  getSystemSettings,
  getUserWatchlist,
  removeWatchlistItem,
} from "@/lib/user-product-store";
import { buildWatchlistDisplayItems } from "@/lib/user-watchlist-view";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  const user = await requireUser();
  const settings = await getSystemSettings();

  if (!settings.watchlistEnabled) {
    return NextResponse.json({ error: "Watchlists are currently disabled." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    items: await buildWatchlistDisplayItems(await getUserWatchlist(user)),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const settings = await getSystemSettings();
  const payload = (await request.json()) as {
    stockSlug?: string;
    query?: string;
    pageType?: "stock" | "mutual_fund";
  };

  if (!settings.watchlistEnabled) {
    return NextResponse.json({ error: "Watchlists are currently disabled." }, { status: 403 });
  }

  const query = payload.query?.trim() || payload.stockSlug?.trim();

  if (!query) {
    return badRequest("Enter a stock or mutual fund name, slug, or symbol.");
  }

  return NextResponse.json({
    ok: true,
    items: await buildWatchlistDisplayItems(
      await addWatchlistItem(user, { query, pageType: payload.pageType }),
    ),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  const settings = await getSystemSettings();
  const payload = (await request.json()) as {
    stockSlug?: string;
    slug?: string;
    pageType?: "stock" | "mutual_fund";
  };

  if (!settings.watchlistEnabled) {
    return NextResponse.json({ error: "Watchlists are currently disabled." }, { status: 403 });
  }

  const slug = payload.slug?.trim() || payload.stockSlug?.trim();

  if (!slug) {
    return badRequest("Watchlist item slug is required.");
  }

  return NextResponse.json({
    ok: true,
    items: await buildWatchlistDisplayItems(
      await removeWatchlistItem(user, { slug, pageType: payload.pageType }),
    ),
  });
}
