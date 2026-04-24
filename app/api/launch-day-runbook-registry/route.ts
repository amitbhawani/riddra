import {
  getLaunchDayRunbookRegistryRows,
  toLaunchDayRunbookCsv,
} from "@/lib/launch-day-runbook-registry";

export async function GET() {
  const rows = getLaunchDayRunbookRegistryRows();

  return new Response(toLaunchDayRunbookCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="launch-day-runbook-registry.csv"',
    },
  });
}
