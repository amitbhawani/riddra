import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getLaunchPendingAuditActionMemory,
} from "@/lib/launch-pending-audit-action-memory-store";

export const dynamic = "force-dynamic";

function toCsvRow(values: string[]) {
  return values
    .map((value) => `"${value.replaceAll('"', '""')}"`)
    .join(",");
}

export async function GET(request: NextRequest) {
  await requireAdmin();

  const memory = await getLaunchPendingAuditActionMemory();
  const format = request.nextUrl.searchParams.get("format");

  if (format === "csv") {
    const csv = [
      toCsvRow([
        "id",
        "lane",
        "perspective",
        "title",
        "status",
        "actionStatus",
        "owner",
        "nextStep",
        "note",
        "detail",
        "href",
        "source",
        "updatedAt",
      ]),
      ...memory.items.map((item) =>
        toCsvRow([
          item.id,
          item.lane,
          item.perspective,
          item.title,
          item.status,
          item.actionStatus,
          item.owner,
          item.nextStep,
          item.note,
          item.detail,
          item.href,
          item.source,
          item.updatedAt,
        ]),
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="launch-pending-audit.csv"',
      },
    });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: memory.summary,
    groups: memory.groups,
    items: memory.items,
  });
}
