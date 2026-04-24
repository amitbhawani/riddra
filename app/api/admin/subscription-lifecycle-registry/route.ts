import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getSubscriptionLifecycleRegistryRows,
  toSubscriptionLifecycleRegistryCsv,
} from "@/lib/subscription-lifecycle-registry";

export async function GET() {
  const user = await requireAdmin();
  const rows = await getSubscriptionLifecycleRegistryRows(user, "admin");
  const csv = toSubscriptionLifecycleRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-subscription-lifecycle-registry.csv"',
    },
  });
}
