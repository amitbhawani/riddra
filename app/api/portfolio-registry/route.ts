import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getPortfolioRegistryRows, toPortfolioRegistryCsv } from "@/lib/portfolio-registry";

export async function GET() {
  const user = await requireUser();
  const rows = await getPortfolioRegistryRows(user);
  const csv = toPortfolioRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="portfolio-registry.csv"',
    },
  });
}
