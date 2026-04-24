import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getCanonicalAssetIntakeTemplate,
  getCanonicalAssetIntakeTemplateFilename,
  toCanonicalAssetIntakeTemplateCsv,
} from "@/lib/canonical-asset-intake";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const family = request.nextUrl.searchParams.get("family");
  const template = getCanonicalAssetIntakeTemplate(family);

  if (!template) {
    return new Response("Template not found", { status: 404 });
  }

  return new Response(toCanonicalAssetIntakeTemplateCsv(template.columns), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${getCanonicalAssetIntakeTemplateFilename(template.family)}"`,
    },
  });
}
