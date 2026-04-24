import {
  getLiveSmokeTestRegistryRows,
  toLiveSmokeTestCsv,
} from "@/lib/live-smoke-tests";

export async function GET() {
  const rows = getLiveSmokeTestRegistryRows();

  return new Response(toLiveSmokeTestCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="smoke-test-journeys.csv"',
    },
  });
}
