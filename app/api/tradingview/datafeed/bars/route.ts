import { NextResponse } from "next/server";

import { getTradingviewDailyBars } from "@/lib/tradingview-datafeed-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "";
  const resolution = searchParams.get("resolution") ?? "1D";
  const from = Number(searchParams.get("from") ?? "");
  const to = Number(searchParams.get("to") ?? "");

  if (!symbol.trim()) {
    return NextResponse.json(
      {
        bars: [],
        meta: { noData: true },
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
    const payload = await getTradingviewDailyBars({
      symbol,
      resolution,
      from: Number.isFinite(from) ? from : undefined,
      to: Number.isFinite(to) ? to : undefined,
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": payload.meta.noData
          ? "no-store"
          : "public, max-age=300, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "TradingView daily bar read failed.";

    return NextResponse.json(
      {
        bars: [],
        meta: { noData: true },
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
