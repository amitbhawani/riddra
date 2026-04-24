import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getSearchQueryReviewMemory,
  removeSearchQueryReview,
  saveSearchQueryReview,
  toSearchQueryReviewCsv,
} from "@/lib/search-query-review-store";

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const searchQueryReviewMemory = await getSearchQueryReviewMemory();

  if (format === "json") {
    return NextResponse.json(searchQueryReviewMemory);
  }

  return new NextResponse(toSearchQueryReviewCsv(searchQueryReviewMemory.reviews), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="search-query-reviews.csv"',
    },
  });
}

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      query?: string;
      status?: "Open" | "In progress" | "Ready" | "Blocked";
      owner?: string;
      proposedAlias?: string;
      proposedRoute?: string;
      note?: string;
      sourceZeroResultCount?: number;
    };

    const result = await saveSearchQueryReview({
      query: payload.query ?? "",
      status: payload.status ?? "Open",
      owner: payload.owner ?? "Search Truth Owner",
      proposedAlias: payload.proposedAlias,
      proposedRoute: payload.proposedRoute,
      note: payload.note ?? "",
      sourceZeroResultCount: payload.sourceZeroResultCount,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save search query review." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as { query?: string };
    const result = await removeSearchQueryReview({ query: payload.query ?? "" });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove search query review." },
      { status: 400 },
    );
  }
}
