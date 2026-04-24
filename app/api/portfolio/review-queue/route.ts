import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import {
  addPortfolioReviewItem,
  removePortfolioReviewItem,
  savePortfolioReviewDecision,
} from "@/lib/portfolio-memory-store";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    importedValue?: string;
    suggestedMatch?: string;
    issue?: string;
    action?: string;
    confidence?: "High" | "Medium" | "Low";
    decisionState?: "Pending" | "Accepted" | "Manual review";
  };

  const importedValue = body.importedValue?.trim() ?? "";
  const suggestedMatch = body.suggestedMatch?.trim() ?? "";
  const issue = body.issue?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  const confidence = body.confidence;
  const decisionState = body.decisionState;

  if (suggestedMatch || action || confidence) {
    if (!importedValue || !suggestedMatch || !issue || !action || !confidence || !decisionState) {
      return NextResponse.json(
        { error: "Imported value, suggested match, issue, action, confidence, and decision state are required." },
        { status: 400 },
      );
    }

    const portfolio = await addPortfolioReviewItem(user, {
      importedValue,
      suggestedMatch,
      issue,
      action,
      confidence,
      decisionState,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/portfolio/import",
      action: `Added portfolio review item: ${importedValue}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: portfolio.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      reviewQueue: portfolio.reviewQueue,
      summary: portfolio.summary,
    });
  }

  if (!importedValue || !issue || !decisionState) {
    return NextResponse.json({ error: "Imported value, issue, and decision state are required." }, { status: 400 });
  }

  const portfolio = await savePortfolioReviewDecision(user, {
    importedValue,
    issue,
    decisionState,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/portfolio/import",
    action: `Updated portfolio review decision: ${importedValue}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: portfolio.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    reviewQueue: portfolio.reviewQueue,
    summary: portfolio.summary,
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as {
    importedValue?: string;
    issue?: string;
  };

  const importedValue = body.importedValue?.trim() ?? "";
  const issue = body.issue?.trim() ?? "";

  if (!importedValue || !issue) {
    return NextResponse.json({ error: "Imported value and issue are required." }, { status: 400 });
  }

  const portfolio = await removePortfolioReviewItem(user, {
    importedValue,
    issue,
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/portfolio/import",
    action: `Removed portfolio review item: ${importedValue}`,
  });

  return NextResponse.json({
    ok: true,
    updatedAt: portfolio.updatedAt,
    continuityUpdatedAt: continuity.updatedAt,
    reviewQueue: portfolio.reviewQueue,
    summary: portfolio.summary,
  });
}
