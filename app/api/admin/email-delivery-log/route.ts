import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getEmailDeliveryLog,
  summarizeEmailDeliveryLog,
  toEmailDeliveryLogCsv,
  type EmailDeliveryFamily,
} from "@/lib/email-delivery-log-store";

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const family = searchParams.get("family") as EmailDeliveryFamily | null;
  const format = searchParams.get("format");
  const entries = await getEmailDeliveryLog({
    family: family ?? undefined,
    limit: Number(searchParams.get("limit") ?? "100"),
  });

  if (format === "csv") {
    return new NextResponse(toEmailDeliveryLogCsv(entries), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${family ?? "email-delivery-log"}.csv"`,
      },
    });
  }

  const summary = summarizeEmailDeliveryLog(entries);

  return NextResponse.json({
    total: entries.length,
    summary,
    storageMode: "file_backed_private_beta",
    limitation:
      "Email delivery logs are still file-backed private-beta continuity. Queue and send truth is operationally honest, but the log is not yet stored in a production database.",
    entries,
  });
}
