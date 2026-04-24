import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getSubscriberWorkspaceContinuitySummary,
  toSubscriberWorkspaceContinuityCsv,
} from "@/lib/subscriber-workspace-continuity";

export async function GET(request: Request) {
  const user = await requireUser();
  const summary = await getSubscriberWorkspaceContinuitySummary(user, {
    route: "/api/account/workspace/continuity",
    action: "Exported workspace continuity",
  });
  const { searchParams } = new URL(request.url);

  if (searchParams.get("format") === "json") {
    return NextResponse.json(summary);
  }

  return new NextResponse(toSubscriberWorkspaceContinuityCsv(summary), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscriber-workspace-continuity.csv"',
    },
  });
}
