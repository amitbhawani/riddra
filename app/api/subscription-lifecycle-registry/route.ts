import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getSubscriptionLifecycleRegistryRows,
  toSubscriptionLifecycleRegistryCsv,
} from "@/lib/subscription-lifecycle-registry";

export async function GET() {
  const user = await requireUser();
  const rows = await getSubscriptionLifecycleRegistryRows(user, "account");
  const csv = toSubscriptionLifecycleRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscription-lifecycle-registry.csv"',
    },
  });
}
