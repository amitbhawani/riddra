import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  previewPortfolioImport,
  type PortfolioImportFieldKey,
} from "@/lib/portfolio-imports";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const payload = (await request.json()) as {
      csvText?: string;
      fileName?: string;
      fieldMapping?: Record<string, PortfolioImportFieldKey>;
    };

    if (!payload.csvText || !payload.fileName) {
      return badRequest("A CSV file is required.");
    }

    const preview = await previewPortfolioImport({
      csvText: payload.csvText,
      fileName: payload.fileName,
      fieldMapping: payload.fieldMapping,
    });

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not check that file right now." },
      { status: 400 },
    );
  }
}
