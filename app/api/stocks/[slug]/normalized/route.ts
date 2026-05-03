import { NextResponse } from "next/server";

import { getNormalizedStockDetailData } from "@/lib/stock-normalized-detail";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const data = await getNormalizedStockDetailData(slug);

  return NextResponse.json({
    data,
  }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
