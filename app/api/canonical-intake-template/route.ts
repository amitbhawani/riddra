import { NextRequest } from "next/server";

import { canonicalAssetIntakeTemplates } from "@/lib/canonical-asset-intake";

function toCsv(columns: string[]) {
  return `${columns.join(",")}\n`;
}

export async function GET(request: NextRequest) {
  const family = request.nextUrl.searchParams.get("family");
  const template = canonicalAssetIntakeTemplates.find((item) => item.family.toLowerCase() === family?.toLowerCase());

  if (!template) {
    return new Response("Template not found", { status: 404 });
  }

  return new Response(toCsv(template.columns), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${template.family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-template.csv"`,
    },
  });
}
