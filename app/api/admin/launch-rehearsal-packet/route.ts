import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getLaunchRehearsalPacketRows,
  toLaunchRehearsalPacketCsv,
} from "@/lib/launch-rehearsal-packet";

export async function GET() {
  await requireAdmin();
  const rows = getLaunchRehearsalPacketRows();

  return new NextResponse(toLaunchRehearsalPacketCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-launch-rehearsal-packet.csv"',
    },
  });
}
