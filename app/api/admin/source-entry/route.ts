import { NextRequest, NextResponse } from "next/server";

import type { CandlePoint } from "@/lib/advanced-chart-data";
import { requireAdmin } from "@/lib/auth";
import {
  getCommodityHistory,
  saveCommodityHistoryEntry,
  normalizeCommodityHistoryPayload,
  removeCommodityHistoryEntry,
} from "@/lib/commodity-history";
import {
  getSourceEntryStore,
  removeFundFactsheetEntry,
  removeFundNavEntry,
  removeIndexSourceEntry,
  removeRouteOverrideEntry,
  removeStockChartEntry,
  removeStockCloseEntry,
  saveFundFactsheetEntry,
  saveFundNavEntry,
  saveIndexSourceEntry,
  saveRouteOverrideEntry,
  saveStockChartEntry,
  saveStockCloseEntry,
} from "@/lib/source-entry-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeChartBars(value: unknown): CandlePoint[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const bars = value
    .map((bar) => {
      if (!bar || typeof bar !== "object") {
        return null;
      }

      const time = String((bar as Record<string, unknown>).time ?? "").trim();
      const open = Number((bar as Record<string, unknown>).open);
      const high = Number((bar as Record<string, unknown>).high);
      const low = Number((bar as Record<string, unknown>).low);
      const close = Number((bar as Record<string, unknown>).close);

      if (!time || ![open, high, low, close].every(Number.isFinite)) {
        return null;
      }

      return { time, open, high, low, close };
    })
    .filter((bar): bar is CandlePoint => Boolean(bar));

  return bars.length > 1 ? bars : null;
}

async function requireAdminApi() {
  await requireAdmin();
  return null;
}

export async function GET() {
  const authError = await requireAdminApi();

  if (authError) {
    return authError;
  }

  const [sourceStore, goldHistory, silverHistory] = await Promise.all([
    getSourceEntryStore(),
    getCommodityHistory("gold", 10),
    getCommodityHistory("silver", 10),
  ]);

  return NextResponse.json({
    ...sourceStore,
    goldHistory: [...goldHistory].reverse(),
    silverHistory: [...silverHistory].reverse(),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminApi();

  if (authError) {
    return authError;
  }

  const payload = (await request.json()) as
    | {
        type: "commodity-history";
        tool: "gold" | "silver";
        data: Record<string, unknown>;
      }
    | {
        type: "index-entry";
        data: Record<string, unknown>;
      }
    | {
        type: "route-override";
        data: Record<string, unknown>;
      }
    | {
        type: "stock-close";
        data: Record<string, unknown>;
      }
    | {
        type: "stock-chart";
        data: Record<string, unknown>;
      }
    | {
        type: "fund-nav";
        data: Record<string, unknown>;
      }
    | {
        type: "fund-factsheet";
        data: Record<string, unknown>;
      };

  if (payload.type === "commodity-history") {
    if (payload.tool !== "gold" && payload.tool !== "silver") {
      return badRequest("Unsupported commodity tool.");
    }

    const normalized = normalizeCommodityHistoryPayload(payload.tool, payload.data ?? {});

    if (!normalized) {
      return badRequest("Invalid commodity history payload.");
    }

    await saveCommodityHistoryEntry(payload.tool, normalized);
    return NextResponse.json({ ok: true });
  }

  if (payload.type === "index-entry") {
    const indexSlug = String(payload.data.indexSlug ?? "").trim();
    const companyName = String(payload.data.companyName ?? "").trim();
    const symbol = String(payload.data.symbol ?? "").trim().toUpperCase();
    const sourceDate = String(payload.data.sourceDate ?? "").trim();
    const weightPercent = Number(payload.data.weightPercent);
    const dailyMovePercent = Number(payload.data.dailyMovePercent);

    if (!indexSlug || !companyName || !symbol || !sourceDate) {
      return badRequest("Index entry fields are required.");
    }

    if (![weightPercent, dailyMovePercent].every(Number.isFinite)) {
      return badRequest("Index entry numbers are invalid.");
    }

    await saveIndexSourceEntry({
      indexSlug,
      companyName,
      symbol,
      sourceDate,
      weightPercent,
      dailyMovePercent,
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.type === "route-override") {
    const route = String(payload.data.route ?? "").trim();
    const field = String(payload.data.field ?? "").trim();
    const currentValue = String(payload.data.currentValue ?? "").trim();
    const correctedValue = String(payload.data.correctedValue ?? "").trim();
    const reason = String(payload.data.reason ?? "").trim();
    const reviewDate = String(payload.data.reviewDate ?? "").trim();

    if (!route || !field || !correctedValue || !reason || !reviewDate) {
      return badRequest("Route override fields are required.");
    }

    await saveRouteOverrideEntry({
      route,
      field,
      currentValue,
      correctedValue,
      reason,
      reviewDate,
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.type === "stock-close") {
    const slug = String(payload.data.slug ?? "").trim();
    const companyName = String(payload.data.companyName ?? "").trim();
    const symbol = String(payload.data.symbol ?? "").trim().toUpperCase();
    const source = String(payload.data.source ?? "").trim();
    const sourceDate = String(payload.data.sourceDate ?? "").trim();
    const price = Number(payload.data.price);
    const changePercent = Number(payload.data.changePercent);

    if (!slug || !companyName || !symbol || !source || !sourceDate) {
      return badRequest("Stock close fields are required.");
    }

    if (![price, changePercent].every(Number.isFinite)) {
      return badRequest("Stock close numbers are invalid.");
    }

    await saveStockCloseEntry({
      slug,
      companyName,
      symbol,
      source,
      sourceDate,
      price,
      changePercent,
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.type === "stock-chart") {
    const slug = String(payload.data.slug ?? "").trim();
    const companyName = String(payload.data.companyName ?? "").trim();
    const symbol = String(payload.data.symbol ?? "").trim().toUpperCase();
    const timeframe = String(payload.data.timeframe ?? "").trim().toUpperCase();
    const source = String(payload.data.source ?? "").trim();
    const sourceDate = String(payload.data.sourceDate ?? "").trim();
    const bars = normalizeChartBars(payload.data.bars);

    if (!slug || !companyName || !symbol || !timeframe || !source || !sourceDate) {
      return badRequest("Stock OHLCV fields are required.");
    }

    if (!bars) {
      return badRequest("Stock OHLCV bars are invalid.");
    }

    await saveStockChartEntry({
      slug,
      companyName,
      symbol,
      timeframe,
      source,
      sourceDate,
      bars,
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.type === "fund-nav") {
    const slug = String(payload.data.slug ?? "").trim();
    const fundName = String(payload.data.fundName ?? "").trim();
    const category = String(payload.data.category ?? "").trim();
    const source = String(payload.data.source ?? "").trim();
    const sourceDate = String(payload.data.sourceDate ?? "").trim();
    const nav = Number(payload.data.nav);
    const returns1Y = Number(payload.data.returns1Y);

    if (!slug || !fundName || !category || !source || !sourceDate) {
      return badRequest("Fund NAV fields are required.");
    }

    if (![nav, returns1Y].every(Number.isFinite)) {
      return badRequest("Fund NAV numbers are invalid.");
    }

    await saveFundNavEntry({
      slug,
      fundName,
      category,
      source,
      sourceDate,
      nav,
      returns1Y,
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.type === "fund-factsheet") {
    const slug = String(payload.data.slug ?? "").trim();
    const fundName = String(payload.data.fundName ?? "").trim();
    const amcName = String(payload.data.amcName ?? "").trim();
    const documentLabel = String(payload.data.documentLabel ?? "").trim();
    const source = String(payload.data.source ?? "").trim();
    const sourceDate = String(payload.data.sourceDate ?? "").trim();
    const referenceUrl = String(payload.data.referenceUrl ?? "").trim();

    if (!slug || !fundName || !amcName || !documentLabel || !source || !sourceDate) {
      return badRequest("Fund factsheet fields are required.");
    }

    await saveFundFactsheetEntry({
      slug,
      fundName,
      amcName,
      documentLabel,
      source,
      sourceDate,
      referenceUrl: referenceUrl || undefined,
    });

    return NextResponse.json({ ok: true });
  }

  return badRequest("Unsupported source entry action.");
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminApi();

  if (authError) {
    return authError;
  }

  const payload = (await request.json()) as
    | {
        type: "commodity-history";
        tool: "gold" | "silver";
        data: Record<string, unknown>;
      }
    | {
        type: "index-entry";
        data: Record<string, unknown>;
      }
    | {
        type: "route-override";
        data: Record<string, unknown>;
      }
    | {
        type: "stock-close";
        data: Record<string, unknown>;
      }
    | {
        type: "stock-chart";
        data: Record<string, unknown>;
      }
    | {
        type: "fund-nav";
        data: Record<string, unknown>;
      }
    | {
        type: "fund-factsheet";
        data: Record<string, unknown>;
      };

  if (payload.type === "commodity-history") {
    if (payload.tool !== "gold" && payload.tool !== "silver") {
      return badRequest("Unsupported commodity tool.");
    }

    const date = String(payload.data.date ?? "").trim();

    if (!date) {
      return badRequest("Commodity history date is required.");
    }

    await removeCommodityHistoryEntry(payload.tool, date);
    return NextResponse.json({ ok: true });
  }

  if (payload.type === "index-entry") {
    const createdAt = String(payload.data.createdAt ?? "").trim();
    const indexSlug = String(payload.data.indexSlug ?? "").trim();
    const symbol = String(payload.data.symbol ?? "").trim().toUpperCase();

    if (!createdAt || !indexSlug || !symbol) {
      return badRequest("Index entry created-at, index slug, and symbol are required.");
    }

    await removeIndexSourceEntry({ createdAt, indexSlug, symbol });
    return NextResponse.json({ ok: true });
  }

  if (payload.type === "route-override") {
    const createdAt = String(payload.data.createdAt ?? "").trim();
    const route = String(payload.data.route ?? "").trim();
    const field = String(payload.data.field ?? "").trim();

    if (!createdAt || !route || !field) {
      return badRequest("Route override created-at, route, and field are required.");
    }

    await removeRouteOverrideEntry({ createdAt, route, field });
    return NextResponse.json({ ok: true });
  }

  if (payload.type === "stock-close") {
    const slug = String(payload.data.slug ?? "").trim();

    if (!slug) {
      return badRequest("Stock close slug is required.");
    }

    await removeStockCloseEntry({ slug });
    return NextResponse.json({ ok: true });
  }

  if (payload.type === "stock-chart") {
    const slug = String(payload.data.slug ?? "").trim();

    if (!slug) {
      return badRequest("Stock OHLCV slug is required.");
    }

    await removeStockChartEntry({ slug });
    return NextResponse.json({ ok: true });
  }

  if (payload.type === "fund-nav") {
    const slug = String(payload.data.slug ?? "").trim();

    if (!slug) {
      return badRequest("Fund NAV slug is required.");
    }

    await removeFundNavEntry({ slug });
    return NextResponse.json({ ok: true });
  }

  if (payload.type === "fund-factsheet") {
    const slug = String(payload.data.slug ?? "").trim();

    if (!slug) {
      return badRequest("Fund factsheet slug is required.");
    }

    await removeFundFactsheetEntry({ slug });
    return NextResponse.json({ ok: true });
  }

  return badRequest("Unsupported source entry action.");
}
