import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getPortfolioRegistryRows, toPortfolioRegistryCsv } from "@/lib/portfolio-registry";

export async function GET() {
  const user = await requireAdmin();
  const rows = await getPortfolioRegistryRows(user, "admin");
  const csv = toPortfolioRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-portfolio-registry.csv"',
    },
  });
}
