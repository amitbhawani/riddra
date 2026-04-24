import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addSearchIndexLane } from "@/lib/search-index-memory-store";

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      lane?: string;
      status?: "Ready" | "In progress" | "Blocked" | "Planned";
      indexedRecords?: number;
      aliasGroups?: number;
      typoProtectedRoutes?: number;
      filterCoverage?: string;
      nextStep?: string;
    };

    if (!payload.lane?.trim()) {
      return NextResponse.json({ error: "Lane is required." }, { status: 400 });
    }

    const memory = await addSearchIndexLane({
      lane: payload.lane.trim(),
      status: payload.status ?? "Planned",
      indexedRecords: Number(payload.indexedRecords ?? 0),
      aliasGroups: Number(payload.aliasGroups ?? 0),
      typoProtectedRoutes: Number(payload.typoProtectedRoutes ?? 0),
      filterCoverage: payload.filterCoverage?.trim() || "Operator create saved without a coverage note yet.",
      nextStep: payload.nextStep?.trim() || "Operator create saved without a next step yet.",
    });

    return NextResponse.json(memory);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create search-index lane." },
      { status: 500 },
    );
  }
}
