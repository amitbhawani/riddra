import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, requireUser } from "@/lib/auth";
import {
  getUserRecentlyViewed,
  recordUserRecentlyViewed,
  type ProductPageType,
} from "@/lib/user-product-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({
    ok: true,
    items: await getUserRecentlyViewed(user),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payload = (await request.json()) as {
    pageType?: ProductPageType;
    slug?: string;
    title?: string;
    href?: string;
  };

  if (!payload.pageType || !payload.slug?.trim() || !payload.title?.trim() || !payload.href?.trim()) {
    return badRequest("Recently viewed items need a page type, slug, title, and page link.");
  }

  return NextResponse.json({
    ok: true,
    items: await recordUserRecentlyViewed(user, {
      pageType: payload.pageType,
      slug: payload.slug,
      title: payload.title,
      href: payload.href,
    }),
  });
}
