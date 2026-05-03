import { NextRequest, NextResponse } from "next/server";

import { getAdminStockImportDetails } from "@/lib/admin-stock-import-dashboard";
import { requireOperator } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ stockId: string }> },
) {
  try {
    await requireOperator();
    const { stockId } = await context.params;
    const details = await getAdminStockImportDetails({ stockId });

    if (!details) {
      return NextResponse.json({ error: "Stock import details were not found." }, { status: 404 });
    }

    return NextResponse.json({ details });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The stock import details could not be loaded right now.",
      },
      { status: 500 },
    );
  }
}
