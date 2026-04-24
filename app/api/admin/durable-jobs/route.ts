import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { listDurableJobRuns, toDurableJobRunsCsv } from "@/lib/durable-jobs";

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const family = searchParams.get("family") ?? undefined;
  const jobs = await listDurableJobRuns({
    family:
      family === "market_data" ||
      family === "reconciliation" ||
      family === "notification" ||
      family === "support" ||
      family === "search" ||
      family === "archive_refresh" ||
      family === "broker_sync"
        ? family
        : undefined,
    limit: 30,
  });

  if (format === "csv") {
    return new Response(toDurableJobRunsCsv(jobs.items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="durable-jobs.csv"',
      },
    });
  }

  return NextResponse.json(jobs);
}
