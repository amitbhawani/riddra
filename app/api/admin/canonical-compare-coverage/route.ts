import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  canonicalCompareCoverageRows,
  toCanonicalCompareCoverageCsv,
} from "@/lib/canonical-compare-coverage";

export async function GET() {
  await requireAdmin();

  return new NextResponse(toCanonicalCompareCoverageCsv(canonicalCompareCoverageRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-canonical-compare-coverage.csv"',
    },
  });
}
