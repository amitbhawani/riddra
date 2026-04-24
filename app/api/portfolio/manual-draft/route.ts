import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { clearManualPortfolioDraft, saveManualPortfolioDraft } from "@/lib/portfolio-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    symbol?: string;
    quantity?: string;
    avgCost?: string;
    portfolioTag?: string;
  };

  const symbol = body.symbol?.trim() ?? "";
  const quantity = body.quantity?.trim() ?? "";
  const avgCost = body.avgCost?.trim() ?? "";
  const portfolioTag = body.portfolioTag?.trim() ?? "";

  if (!symbol || !quantity || !avgCost || !portfolioTag) {
    return NextResponse.json({ error: "Symbol, quantity, average cost, and portfolio tag are required." }, { status: 400 });
  }

  const portfolio = await saveManualPortfolioDraft(user, {
    symbol,
    quantity,
    avgCost,
    portfolioTag,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/portfolio/manual",
    action: `Saved manual portfolio draft: ${symbol}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: portfolio.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    storageMode: portfolio.storageMode,
    summary: portfolio.summary,
    portfolioSnapshot: portfolio.portfolioSnapshot,
    draft: portfolio.manualDraft,
  });
}

export async function DELETE() {
  const user = await requireUser();
  const portfolio = await clearManualPortfolioDraft(user);
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/portfolio/manual",
    action: "Cleared manual portfolio draft",
  });

  return NextResponse.json({
    ok: true,
    updatedAt: portfolio.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    storageMode: portfolio.storageMode,
    summary: portfolio.summary,
    portfolioSnapshot: portfolio.portfolioSnapshot,
    draft: portfolio.manualDraft,
  });
}
