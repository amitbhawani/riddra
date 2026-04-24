import {
  getSubscriberLaunchRegistryRows,
  toSubscriberLaunchCsv,
} from "@/lib/subscriber-launch-registry";

export async function GET() {
  const rows = await getSubscriberLaunchRegistryRows();

  return new Response(toSubscriberLaunchCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscriber-launch-registry.csv"',
    },
  });
}
