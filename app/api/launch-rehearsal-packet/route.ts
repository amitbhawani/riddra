import {
  getLaunchRehearsalPacketRows,
  toLaunchRehearsalPacketCsv,
} from "@/lib/launch-rehearsal-packet";

export async function GET() {
  const rows = getLaunchRehearsalPacketRows();

  return new Response(toLaunchRehearsalPacketCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="launch-rehearsal-packet.csv"',
    },
  });
}
