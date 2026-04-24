import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getAnnouncementReadinessRegistryRows,
  toAnnouncementReadinessRegistryCsv,
} from "@/lib/announcement-readiness-registry";

export async function GET() {
  await requireAdmin();
  const rows = getAnnouncementReadinessRegistryRows();
  const csv = toAnnouncementReadinessRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-announcement-readiness-registry.csv"',
    },
  });
}
