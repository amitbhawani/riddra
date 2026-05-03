import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  findExistingMarketDataSourceByIdentity,
  getMarketDataSourceById,
  listMarketDataSources,
  saveMarketDataSource,
  type SaveMarketDataSourceInput,
} from "@/lib/market-data-source-registry";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function humanizeSlug(value: string) {
  return cleanString(value, 240)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function revalidateMarketDataSourceSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/sources");
  revalidatePath("/admin/market-data/sources/new");
  revalidatePath("/admin/market-data/sources/import");
}

export async function GET() {
  try {
    await requireOperator();
    const sources = await listMarketDataSources();
    return NextResponse.json({ sources });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load market-data sources right now.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireOperator();
    const payload = (await request.json()) as SaveMarketDataSourceInput;
    const existingById = cleanString(payload.id, 160)
      ? await getMarketDataSourceById(cleanString(payload.id, 160))
      : null;
    const existingByIdentity =
      !existingById &&
      cleanString(payload.sourceType, 120) &&
      cleanString(payload.sourceUrl, 2000)
        ? await findExistingMarketDataSourceByIdentity({
            sourceType: payload.sourceType,
            sourceUrl: payload.sourceUrl,
            timeframe: cleanString(payload.timeframe, 20).toUpperCase() || "1D",
            assetSlug: cleanString(payload.assetSlug, 160) || null,
            symbol: cleanString(payload.symbol, 160) || null,
            schemeCode: cleanString(payload.schemeCode, 160) || null,
            benchmarkSlug: cleanString(payload.benchmarkSlug, 160) || null,
          }).catch(() => null)
        : null;
    const previous = existingById ?? existingByIdentity ?? null;
    const saved = await saveMarketDataSource(payload);

    revalidateMarketDataSourceSurfaces();

    const sourceName =
      cleanString(saved.metadata.source_name, 240) ||
      humanizeSlug(saved.assetSlug || "") ||
      saved.benchmarkSlug ||
      saved.symbol ||
      cleanString(saved.schemeCode, 160) ||
      saved.id;
    const previousStatus = previous?.syncStatus ?? null;
    const nextStatus = saved.syncStatus;
    const actionType =
      !previous
        ? "market_data.source_created"
        : previousStatus === "paused" && nextStatus === "active"
          ? "market_data.source_resumed"
          : previousStatus !== "paused" && nextStatus === "paused"
            ? "market_data.source_paused"
            : "market_data.source_updated";
    const summary =
      actionType === "market_data.source_created"
        ? `Created ${saved.sourceType} source for ${sourceName}.`
        : actionType === "market_data.source_resumed"
          ? `Resumed ${saved.sourceType} source for ${sourceName}.`
          : actionType === "market_data.source_paused"
            ? `Paused ${saved.sourceType} source for ${sourceName}.`
            : `Updated ${saved.sourceType} source for ${sourceName}.`;

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType,
      targetType: "market_data_source",
      targetId: saved.id,
      targetFamily: "market_data_source",
      targetSlug: saved.assetSlug || saved.benchmarkSlug || cleanString(saved.schemeCode, 160) || null,
      summary,
      metadata: {
        sourceId: saved.id,
        sourceType: saved.sourceType,
        sourceUrl: saved.sourceUrl,
        assetSlug: saved.assetSlug,
        symbol: saved.symbol,
        benchmarkSlug: saved.benchmarkSlug,
        schemeCode: saved.schemeCode,
        timeframe: saved.timeframe,
        syncStatus: saved.syncStatus,
        previousSyncStatus: previousStatus,
        sourceName: cleanString(saved.metadata.source_name, 240) || null,
      },
    });

    return NextResponse.json({ source: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save that market-data source right now.",
      },
      { status: 500 },
    );
  }
}
