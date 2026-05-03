import { NextResponse } from "next/server";

import { getCommodityQuotes } from "@/lib/commodity-prices";

export const revalidate = 300;

export async function GET() {
  const quotes = await getCommodityQuotes();
  return NextResponse.json(
    { quotes },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=180",
      },
    },
  );
}
