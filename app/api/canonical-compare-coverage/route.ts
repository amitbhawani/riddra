import {
  canonicalCompareCoverageRows,
  toCanonicalCompareCoverageCsv,
} from "@/lib/canonical-compare-coverage";

export async function GET() {
  return new Response(toCanonicalCompareCoverageCsv(canonicalCompareCoverageRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="canonical-compare-coverage.csv"',
    },
  });
}
