import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  addResearchArchiveRecord,
  getResearchArchiveMemory,
  removeResearchArchiveRecord,
  saveResearchArchiveRecord,
} from "@/lib/research-archive-memory-store";

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
  const title = body.title?.trim() ?? "";
  const publishedAt = body.publishedAt?.trim() ?? "";
  const continuityNote = body.continuityNote?.trim() ?? "";
  const pageTarget = body.pageTarget?.trim() ?? "";
  const assetType = body.assetType;
  const slug = body.slug?.trim() ?? "";
  const family = body.family?.trim() ?? "";
  const sourceLabel = body.sourceLabel?.trim() ?? "";
  const sourceType = body.sourceType;
  const status = body.status;

  if (!id) {
    return NextResponse.json(
      { error: "Record id is required." },
      { status: 400 },
    );
  }

  const archiveMemorySnapshot = await getResearchArchiveMemory();
  const recordExists = archiveMemorySnapshot.records.some((record) => record.id === id);

  if (recordExists && (!title || !publishedAt || !continuityNote || !pageTarget || !status)) {
    return NextResponse.json(
      { error: "Record id, title, published date, continuity note, page target, and status are required." },
      { status: 400 },
    );
  }

  if (
    !recordExists &&
    (!title ||
      !publishedAt ||
      !continuityNote ||
      !pageTarget ||
      !status ||
      !assetType ||
      !slug ||
      !family ||
      !sourceLabel ||
      !sourceType)
  ) {
    return NextResponse.json(
      {
        error:
          "Record id, asset type, slug, title, family, source label, source type, published date, continuity note, page target, and status are required.",
      },
      { status: 400 },
    );
  }

  const archiveMemory = recordExists
    ? await saveResearchArchiveRecord({
        id,
        title,
        publishedAt,
        continuityNote,
        pageTarget,
        status: status!,
      })
    : await addResearchArchiveRecord({
        id,
        assetType: assetType!,
        slug,
        title,
        family,
        sourceLabel,
        sourceType: sourceType!,
        publishedAt,
        continuityNote,
        pageTarget,
        status: status!,
      });

  return NextResponse.json({
    ok: true,
    summary: archiveMemory.summary,
    records: archiveMemory.records,
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as { id?: string };

  const id = body.id?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Record id is required." }, { status: 400 });
  }

  const archiveMemory = await removeResearchArchiveRecord({ id });

  return NextResponse.json({
    ok: true,
    summary: archiveMemory.summary,
    records: archiveMemory.records,
  });
}
