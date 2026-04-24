import {
  getMarketDataTargetRegistryRows,
  toMarketDataTargetCsv,
} from "@/lib/market-data-target-registry";

export async function GET() {
  const rows = await getMarketDataTargetRegistryRows();

  return new Response(toMarketDataTargetCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="market-data-target-registry.csv"',
    },
  });
}
