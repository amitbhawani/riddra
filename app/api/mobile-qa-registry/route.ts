import {
  getMobileQaRegistryRows,
  toMobileQaCsv,
} from "@/lib/mobile-qa-registry";

export async function GET() {
  const rows = getMobileQaRegistryRows();

  return new Response(toMobileQaCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mobile-qa-registry.csv"',
    },
  });
}
