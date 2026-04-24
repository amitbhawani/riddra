import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getSystemSettings,
  getUserPortfolioState,
  removeUserPortfolioHolding,
  saveUserPortfolioHolding,
} from "@/lib/user-product-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  const user = await requireUser();
  const settings = await getSystemSettings();

  if (!settings.portfolioEnabled) {
    return NextResponse.json({ error: "Portfolio is currently disabled." }, { status: 403 });
  }

  const portfolio = await getUserPortfolioState(user);
  return NextResponse.json({
    ok: true,
    holdings: portfolio.holdings,
    storageMode: portfolio.storageMode,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const settings = await getSystemSettings();
  const payload = (await request.json()) as {
    stockSlug?: string;
    quantity?: number;
    buyPrice?: number;
  };

  if (!settings.portfolioEnabled) {
    return NextResponse.json({ error: "Portfolio is currently disabled." }, { status: 403 });
  }

  if (!payload.stockSlug?.trim()) {
    return badRequest("Stock slug or symbol is required.");
  }

  const result = await saveUserPortfolioHolding(user, {
    stockSlug: payload.stockSlug,
    quantity: Number(payload.quantity),
    buyPrice: Number(payload.buyPrice),
  });
  const portfolio = await getUserPortfolioState(user);
  const savedHolding = portfolio.holdings.find(
    (holding) =>
      holding.stockSlug === result.savedHolding.stockSlug &&
      holding.quantity === result.savedHolding.quantity &&
      holding.buyPrice === result.savedHolding.buyPrice,
  );

  if (!savedHolding) {
    return NextResponse.json(
      { error: "Portfolio changes could not be reloaded after saving." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    holdings: portfolio.holdings,
    storageMode: portfolio.storageMode,
  });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  const settings = await getSystemSettings();
  const payload = (await request.json()) as {
    stockSlug?: string;
  };

  if (!settings.portfolioEnabled) {
    return NextResponse.json({ error: "Portfolio is currently disabled." }, { status: 403 });
  }

  if (!payload.stockSlug?.trim()) {
    return badRequest("Stock slug is required.");
  }

  const result = await removeUserPortfolioHolding(user, {
    stockSlug: payload.stockSlug,
  });
  const portfolio = await getUserPortfolioState(user);

  if (portfolio.holdings.some((holding) => holding.stockSlug === result.removedSlug)) {
    return NextResponse.json(
      { error: "Portfolio holding still appears after removal." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    holdings: portfolio.holdings,
    storageMode: portfolio.storageMode,
  });
}
