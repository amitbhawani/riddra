import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  executePortfolioImport,
  type PortfolioImportFieldKey,
} from "@/lib/portfolio-imports";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const payload = (await request.json()) as {
      csvText?: string;
      fileName?: string;
      fieldMapping?: Record<string, PortfolioImportFieldKey>;
    };

    if (!payload.csvText || !payload.fileName) {
      return badRequest("A CSV file is required.");
    }

    const result = await executePortfolioImport(user, {
      csvText: payload.csvText,
      fileName: payload.fileName,
      fieldMapping: payload.fieldMapping,
      skipInvalid: true,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not import that portfolio file right now." },
      { status: 400 },
    );
  }
}
