import { NextResponse } from "next/server";

import { getTradingviewDatafeedConfig } from "@/lib/tradingview-datafeed-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      config: getTradingviewDatafeedConfig(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
