import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  canonicalCoverageRows,
  toCanonicalCoverageCsv,
} from "@/lib/canonical-coverage";

export async function GET() {
  await requireAdmin();

  return new NextResponse(toCanonicalCoverageCsv(canonicalCoverageRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-canonical-coverage-registry.csv"',
    },
  });
}
