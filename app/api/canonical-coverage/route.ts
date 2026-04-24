import {
  canonicalCoverageRows,
  toCanonicalCoverageCsv,
} from "@/lib/canonical-coverage";

export async function GET() {
  return new Response(toCanonicalCoverageCsv(canonicalCoverageRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="canonical-coverage-registry.csv"',
    },
  });
}
