import { NextResponse } from "next/server";

import {
  getAnnouncementReadinessRegistryRows,
  toAnnouncementReadinessRegistryCsv,
} from "@/lib/announcement-readiness-registry";

export async function GET() {
  const rows = getAnnouncementReadinessRegistryRows();
  const csv = toAnnouncementReadinessRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="announcement-readiness-registry.csv"',
    },
  });
}
