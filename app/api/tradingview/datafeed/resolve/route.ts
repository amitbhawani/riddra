import { NextResponse } from "next/server";

import { resolveTradingviewSymbol } from "@/lib/tradingview-datafeed-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "";

  if (!symbol.trim()) {
    return NextResponse.json(
      {
        error: "TradingView symbol is required.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const resolved = await resolveTradingviewSymbol(symbol);

    if (!resolved) {
      return NextResponse.json(
        {
          error: `Unknown TradingView symbol "${symbol}".`,
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      { symbol: resolved },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "TradingView symbol resolution failed.";

    return NextResponse.json(
      {
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
