import { NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  canUseAdminFamilyImport,
  getAdminImportTemplate,
  type SupportedAdminImportFamily,
} from "@/lib/admin-content-imports";

type Params = Promise<{ family: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  try {
    const { role, capabilities } = await requireOperator();
    const { family } = await params;
    const typedFamily = family as SupportedAdminImportFamily;

    if (!canUseAdminFamilyImport(role, capabilities, typedFamily)) {
      return NextResponse.json(
        { error: "You do not have permission to download this import template." },
        { status: 403 },
      );
    }

    const template = getAdminImportTemplate(typedFamily);

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
