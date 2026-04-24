import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addResearchArchiveRecord } from "@/lib/research-archive-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    id?: string;
    assetType?: "stock" | "ipo" | "fund" | "wealth";
    slug?: string;
    title?: string;
    family?: string;
    sourceLabel?: string;
    sourceType?: "official_filing" | "results_watch" | "editorial_note" | "factsheet" | "event_history";
    publishedAt?: string;
    continuityNote?: string;
    pageTarget?: string;
    status?: "Archived" | "Queued";
  };

  const id = body.id?.trim() ?? "";
  const slug = body.slug?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const family = body.family?.trim() ?? "";
  const sourceLabel = body.sourceLabel?.trim() ?? "";
  const publishedAt = body.publishedAt?.trim() ?? "";
  const continuityNote = body.continuityNote?.trim() ?? "";
  const pageTarget = body.pageTarget?.trim() ?? "";
  const assetType = body.assetType;
  const sourceType = body.sourceType;
  const status = body.status;

  if (!id || !assetType || !slug || !title || !family || !sourceLabel || !sourceType || !publishedAt || !continuityNote || !pageTarget || !status) {
    return NextResponse.json(
      {
        error:
          "Record id, asset type, slug, title, family, source label, source type, published date, continuity note, page target, and status are required.",
      },
      { status: 400 },
    );
  }

  const archiveMemory = await addResearchArchiveRecord({
    id,
    assetType,
    slug,
    title,
    family,
    sourceLabel,
    sourceType,
    publishedAt,
    continuityNote,
    pageTarget,
    status,
  });

  return NextResponse.json({
    ok: true,
    summary: archiveMemory.summary,
    records: archiveMemory.records,
  });
}
