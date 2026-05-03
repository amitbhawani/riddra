import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import { listActiveMarketDataSources } from "@/lib/market-data-source-registry";
import { runAllActiveMarketDataSyncs } from "@/lib/market-data-sync";

function revalidateMarketDataSourceSurfaces(routes: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/sources");

  for (const route of routes) {
    revalidatePath(route);
  }
}

export async function GET() {
  try {
    await requireOperator();
    const sources = await listActiveMarketDataSources();

    return NextResponse.json({
      ok: true,
      endpoint: "/api/admin/market-data/sources/sync",
      method: "POST",
      description:
        "Trigger an incremental sync for all active market-data sources. Open this endpoint in the browser for status only; use POST to run the sync.",
      activeSources: sources.length,
      sourceIds: sources.map((source) => source.id),
      sourceTypes: Array.from(new Set(sources.map((source) => source.sourceType))),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/admin/market-data/sources/sync",
        method: "POST",
        error:
          error instanceof Error
            ? error.message
            : "Could not inspect active market-data sync sources right now.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const { user } = await requireOperator();
    const payload = (await request.json().catch(() => ({}))) as {
      duplicateMode?: "replace_matching_dates" | "skip_existing_dates";
    };

    const results = await runAllActiveMarketDataSyncs({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      duplicateMode: payload.duplicateMode,
    });

    const routes = Array.from(
      new Set(results.flatMap((result) => result.affectedRoutes)),
    );
    revalidateMarketDataSourceSurfaces(routes);

    return NextResponse.json({
      results,
      syncedSources: results.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not sync active market-data sources right now.",
      },
      { status: 500 },
    );
  }
}
