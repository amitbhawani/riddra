import {
  getChartVerificationRows,
  toChartVerificationCsv,
} from "@/lib/chart-verification-registry";

export async function GET() {
  const rows = getChartVerificationRows();

  return new Response(toChartVerificationCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="chart-verification-registry.csv"',
    },
  });
}
