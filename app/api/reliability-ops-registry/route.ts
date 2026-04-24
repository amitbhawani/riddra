import {
  getReliabilityOpsRegistryRows,
  toReliabilityOpsCsv,
} from "@/lib/reliability-ops-registry";

export async function GET() {
  const rows = getReliabilityOpsRegistryRows();

  return new Response(toReliabilityOpsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reliability-ops-registry.csv"',
    },
  });
}
