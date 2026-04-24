import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getPortfolioImportTemplate } from "@/lib/portfolio-imports";

export async function GET() {
  try {
    await requireUser();
    const template = getPortfolioImportTemplate();

    return new NextResponse(template.sampleCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${template.fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not download that template right now." },
      { status: 400 },
    );
  }
}
