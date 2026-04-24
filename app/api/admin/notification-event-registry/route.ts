import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getNotificationEventRegistryRows,
  toNotificationEventRegistryCsv,
} from "@/lib/notification-event-registry";

export async function GET() {
  const user = await requireAdmin();
  const rows = await getNotificationEventRegistryRows(user, "admin");
  const csv = toNotificationEventRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-notification-event-registry.csv"',
    },
  });
}
