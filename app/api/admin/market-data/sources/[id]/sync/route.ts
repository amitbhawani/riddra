import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import { getMarketDataSourceById } from "@/lib/market-data-source-registry";
import { runMarketDataSync } from "@/lib/market-data-sync";

function revalidateMarketDataSourceSurfaces(routes: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/sources");

  for (const route of routes) {
    revalidatePath(route);
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireOperator();
    const { id } = await context.params;
    const source = await getMarketDataSourceById(id);

    if (!source) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: `/api/admin/market-data/sources/${id}/sync`,
          method: "POST",
          error: "Market-data source not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      endpoint: `/api/admin/market-data/sources/${id}/sync`,
      method: "POST",
      description:
        "Trigger an incremental sync for this market-data source. Open this endpoint in the browser for source status only; use POST to run the sync.",
      source: {
        id: source.id,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        assetSlug: source.assetSlug,
        symbol: source.symbol,
        benchmarkSlug: source.benchmarkSlug,
        schemeCode: source.schemeCode,
        timeframe: source.timeframe,
        syncStatus: source.syncStatus,
        lastSyncedAt: source.lastSyncedAt,
        lastSyncedDate: source.lastSyncedDate,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        method: "POST",
        error:
          error instanceof Error
            ? error.message
            : "Could not inspect that market-data source right now.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireOperator();
    const payload = (await request.json().catch(() => ({}))) as {
      allowPaused?: boolean;
      duplicateMode?: "replace_matching_dates" | "skip_existing_dates";
    };
    const { id } = await context.params;

    const result = await runMarketDataSync(id, {
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      allowPaused: payload.allowPaused === true,
      duplicateMode: payload.duplicateMode,
    });

    revalidateMarketDataSourceSurfaces(result.affectedRoutes);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not sync that market-data source right now.",
      },
      { status: 500 },
    );
  }
}
