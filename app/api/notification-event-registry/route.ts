import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getNotificationEventRegistryRows,
  toNotificationEventRegistryCsv,
} from "@/lib/notification-event-registry";

export async function GET() {
  const user = await requireUser();
  const rows = await getNotificationEventRegistryRows(user, "account");
  const csv = toNotificationEventRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="notification-event-registry.csv"',
    },
  });
}
