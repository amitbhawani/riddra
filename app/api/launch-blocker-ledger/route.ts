import { getLaunchBlockerLedger } from "@/lib/launch-blocker-ledger";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function GET() {
  const ledger = getLaunchBlockerLedger();
  const header = ["title", "owner", "source", "href", "detail"];
  const lines = ledger.items.map((item) =>
    [item.title, item.owner, item.source, item.href, item.detail]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return new Response([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="launch-blocker-ledger.csv"',
    },
  });
}
