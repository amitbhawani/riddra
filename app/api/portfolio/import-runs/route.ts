import { NextResponse } from "next/server";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { createPortfolioImportRun, removePortfolioImportRun } from "@/lib/portfolio-memory-store";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      sourceLabel?: string;
      fileName?: string;
      importedRows?: number;
      unresolvedRows?: number;
      status?: "Reviewed" | "Needs action" | "Ready to save";
    };

    const sourceLabel = body.sourceLabel?.trim() ?? "";
    const fileName = body.fileName?.trim() ?? "";
    const importedRows = Number.isFinite(body.importedRows) ? Number(body.importedRows) : 0;
    const unresolvedRows = Number.isFinite(body.unresolvedRows) ? Number(body.unresolvedRows) : 0;
    const status = body.status;

    if (!sourceLabel || !fileName || !status) {
      return NextResponse.json({ error: "Source label, file name, and status are required." }, { status: 400 });
    }

    const portfolio = await createPortfolioImportRun(user, {
      sourceLabel,
      fileName,
      importedRows,
      unresolvedRows,
      status,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/portfolio/import",
      action: `Created portfolio import run: ${fileName}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: portfolio.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      importRuns: portfolio.importRuns,
      summary: portfolio.summary,
      activityLog: portfolio.activityLog,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create import run." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      fileName?: string;
      createdAt?: string;
    };

    const fileName = body.fileName?.trim() ?? "";
    const createdAt = body.createdAt?.trim() ?? "";

    if (!fileName || !createdAt) {
      return NextResponse.json({ error: "File name and timestamp are required." }, { status: 400 });
    }

    const portfolio = await removePortfolioImportRun(user, {
      fileName,
      createdAt,
    });
    const continuity = await syncAccountContinuityRecord(user, {
      route: "/portfolio/import",
      action: `Removed portfolio import run: ${fileName}`,
    });

    return NextResponse.json({
      ok: true,
      updatedAt: portfolio.updatedAt,
      continuityUpdatedAt: continuity.updatedAt,
      importRuns: portfolio.importRuns,
      summary: portfolio.summary,
      activityLog: portfolio.activityLog,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove import run." },
      { status: 500 },
    );
  }
}
