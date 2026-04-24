import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getUserBookmarks,
  removeUserBookmark,
  saveUserBookmark,
  type ProductPageType,
} from "@/lib/user-product-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({
    ok: true,
    items: await getUserBookmarks(user),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const payload = (await request.json()) as {
    pageType?: ProductPageType;
    slug?: string;
    title?: string;
    href?: string;
  };

  if (!payload.pageType || !payload.slug?.trim() || !payload.title?.trim() || !payload.href?.trim()) {
    return badRequest("Bookmark page type, slug, title, and page link are required.");
  }

  return NextResponse.json({
    ok: true,
    items: await saveUserBookmark(user, {
      pageType: payload.pageType,
      slug: payload.slug,
      title: payload.title,
      href: payload.href,
    }),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  const payload = (await request.json()) as {
    pageType?: ProductPageType;
    slug?: string;
  };

  if (!payload.pageType || !payload.slug?.trim()) {
    return badRequest("Bookmark page type and slug are required.");
  }

  return NextResponse.json({
    ok: true,
    items: await removeUserBookmark(user, {
      pageType: payload.pageType,
      slug: payload.slug,
    }),
  });
}
