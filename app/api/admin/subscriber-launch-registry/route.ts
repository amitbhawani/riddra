import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getSubscriberLaunchRegistryRows,
  toSubscriberLaunchCsv,
} from "@/lib/subscriber-launch-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getSubscriberLaunchRegistryRows();
  const csv = toSubscriberLaunchCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-subscriber-launch-registry.csv"',
    },
  });
}
