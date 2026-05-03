import { NextResponse } from "next/server";

import { getNativeStockChartData } from "@/lib/native-stock-chart";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const range = url.searchParams.get("range");
  const interval = url.searchParams.get("interval");

  const data = await getNativeStockChartData({
    slug,
    range,
    interval,
  });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
