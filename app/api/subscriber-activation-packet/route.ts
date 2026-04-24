import {
  getSubscriberActivationPacketRows,
  toSubscriberActivationPacketCsv,
} from "@/lib/subscriber-activation-packet";

export async function GET() {
  const rows = getSubscriberActivationPacketRows();

  return new Response(toSubscriberActivationPacketCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscriber-activation-packet.csv"',
    },
  });
}
