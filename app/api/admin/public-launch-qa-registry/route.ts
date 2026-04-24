import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getPublicLaunchQaRegistryRows,
  toPublicLaunchQaCsv,
} from "@/lib/public-launch-qa-registry";

export async function GET() {
  await requireAdmin();
  const rows = getPublicLaunchQaRegistryRows();

  return new NextResponse(toPublicLaunchQaCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-public-launch-qa-registry.csv"',
    },
  });
}
