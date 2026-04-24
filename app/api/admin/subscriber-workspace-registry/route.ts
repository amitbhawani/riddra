import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getSubscriberWorkspaceRegistryRows,
  toSubscriberWorkspaceRegistryCsv,
} from "@/lib/subscriber-workspace-registry";

export async function GET() {
  const user = await requireAdmin();
  const rows = await getSubscriberWorkspaceRegistryRows(user, "admin");
  const csv = toSubscriberWorkspaceRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-subscriber-workspace-registry.csv"',
    },
  });
}
