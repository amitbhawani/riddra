import {
  getPublicLaunchQaRegistryRows,
  toPublicLaunchQaCsv,
} from "@/lib/public-launch-qa-registry";

export async function GET() {
  const rows = getPublicLaunchQaRegistryRows();

  return new Response(toPublicLaunchQaCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="public-launch-qa-registry.csv"',
    },
  });
}
