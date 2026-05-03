import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  canUseAdminFamilyImport,
  previewAdminImport,
  type AdminImportBatchRow,
  type AdminImportFieldKey,
  type AdminImportMode,
  type SupportedAdminImportFamily,
} from "@/lib/admin-content-imports";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { role, capabilities } = await requireOperator();
    const payload = (await request.json()) as {
      family?: string;
      csvText?: string;
      fileName?: string;
      importMode?: AdminImportMode;
      fieldMapping?: Record<string, AdminImportFieldKey>;
      rows?: AdminImportBatchRow[];
    };

    if (!payload.family || !payload.fileName || !payload.importMode) {
      return badRequest("Family, file, and import mode are required.");
    }

    if (!payload.csvText && (!Array.isArray(payload.rows) || payload.rows.length === 0)) {
      return badRequest("Choose a CSV file or preview rows before checking this import.");
    }

    const family = payload.family as SupportedAdminImportFamily;
    if (!canUseAdminFamilyImport(role, capabilities, family)) {
      return NextResponse.json(
        { error: "You do not have permission to import this content family." },
        { status: 403 },
      );
    }

    const preview = await previewAdminImport({
      family,
      csvText: payload.csvText,
      fileName: payload.fileName,
      importMode: payload.importMode,
      fieldMapping: payload.fieldMapping,
      previewRows: payload.rows,
    });

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not preview that file right now." },
      { status: 400 },
    );
  }
}
