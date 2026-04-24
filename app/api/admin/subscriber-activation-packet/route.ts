import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getSubscriberActivationPacketRows,
  toSubscriberActivationPacketCsv,
} from "@/lib/subscriber-activation-packet";

export async function GET() {
  await requireAdmin();
  const rows = getSubscriberActivationPacketRows();

  return new NextResponse(toSubscriberActivationPacketCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-subscriber-activation-packet.csv"',
    },
  });
}
