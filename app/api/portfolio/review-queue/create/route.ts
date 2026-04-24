import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { addPortfolioReviewItem } from "@/lib/portfolio-memory-store";

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
