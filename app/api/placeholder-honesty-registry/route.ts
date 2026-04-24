import {
  getPlaceholderHonestyRows,
  toPlaceholderHonestyCsv,
} from "@/lib/placeholder-honesty-registry";

export async function GET() {
  const rows = getPlaceholderHonestyRows();

  return new Response(toPlaceholderHonestyCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="placeholder-honesty-registry.csv"',
    },
  });
}
