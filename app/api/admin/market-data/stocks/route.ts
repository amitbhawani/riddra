import { NextRequest, NextResponse } from "next/server";

import {
  getAdminStockImportDashboardData,
} from "@/lib/admin-stock-import-dashboard";
import { requireOperator } from "@/lib/auth";

function readPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
}

export async function GET(request: NextRequest) {
  await requireOperator();

  const { searchParams } = new URL(request.url);
  const offset = readPositiveInt(searchParams.get("offset"), 0);
  const limit = Math.min(100, Math.max(1, readPositiveInt(searchParams.get("limit"), 50)));

  const data = await getAdminStockImportDashboardData({
    stockOffset: offset,
    stockLimit: limit,
    includeStockRows: true,
  });

  return NextResponse.json(data);
}
