import { NextResponse } from "next/server";

import { getServerSearchSuggestions } from "@/lib/search-suggestions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const limit = Number(searchParams.get("limit") ?? "8");

  try {
    const payload = await getServerSearchSuggestions(query, Number.isFinite(limit) ? limit : 8);

    if (payload.degraded && query.trim()) {
      return NextResponse.json(payload, {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Search suggestion read failed.";

    return NextResponse.json(
      {
        suggestions: [],
        degraded: true,
        message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
