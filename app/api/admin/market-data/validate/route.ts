import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { validateMarketDataPayload } from "@/lib/market-data-ingestion";

export async function POST(request: NextRequest) {
  await requireAdmin();

  try {
    const payload = await request.json();
    const validated = validateMarketDataPayload(payload);

    return NextResponse.json({
      ok: true,
      mode: "validation_only",
      summary: {
        stockQuotes: validated.stockQuotes?.length ?? 0,
        stockCharts: validated.stockCharts?.length ?? 0,
        fundNavs: validated.fundNavs?.length ?? 0,
        indexSnapshots: validated.indexSnapshots?.length ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown validation failure";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
