import { NextRequest, NextResponse } from "next/server";

import { getCommodityHistory } from "@/lib/commodity-history";

export async function GET(request: NextRequest) {
  const tool = request.nextUrl.searchParams.get("tool");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "90");
  const resolvedLimit = Number.isFinite(limit) ? limit : 90;

  if (tool !== "gold" && tool !== "silver") {
    return NextResponse.json([]);
  }

  const history =
    tool === "gold"
      ? await getCommodityHistory("gold", resolvedLimit)
      : await getCommodityHistory("silver", resolvedLimit);
  return NextResponse.json(history);
}
