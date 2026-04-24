import { NextResponse } from "next/server";

import { searchTradingviewSymbols } from "@/lib/tradingview-datafeed-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const limit = Number(searchParams.get("limit") ?? "20");

  try {
    const symbols = await searchTradingviewSymbols(
      query,
      Number.isFinite(limit) ? limit : 20,
    );

    return NextResponse.json(
      { symbols },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "TradingView symbol search failed.";

    return NextResponse.json(
      {
        symbols: [],
        error: message,
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
