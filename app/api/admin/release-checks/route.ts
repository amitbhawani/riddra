import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { releaseCheckRegistryRows, toReleaseCheckCsv } from "@/lib/release-checks";

export async function GET() {
  await requireAdmin();

  return new NextResponse(toReleaseCheckCsv(releaseCheckRegistryRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-release-checks-registry.csv"',
    },
  });
}
