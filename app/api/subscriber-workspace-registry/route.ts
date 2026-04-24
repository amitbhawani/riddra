import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getSubscriberWorkspaceRegistryRows,
  toSubscriberWorkspaceRegistryCsv,
} from "@/lib/subscriber-workspace-registry";

export async function GET() {
  const user = await requireUser();
  const rows = await getSubscriberWorkspaceRegistryRows(user);
  const csv = toSubscriberWorkspaceRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscriber-workspace-registry.csv"',
    },
  });
}
