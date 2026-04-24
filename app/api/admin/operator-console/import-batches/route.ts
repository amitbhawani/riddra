import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  canUseAdminFamilyImport,
  executeAdminImport,
  listAdminImportBatches,
  type AdminImportFieldKey,
  type AdminImportMode,
  type SupportedAdminImportFamily,
} from "@/lib/admin-content-imports";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const { role, capabilities } = await requireOperator();
    const family = request.nextUrl.searchParams.get("family") as SupportedAdminImportFamily | null;

    if (role !== "admin" && !family) {
      return badRequest("Choose a family to view import batches.");
    }

    if (family && !canUseAdminFamilyImport(role, capabilities, family)) {
      return NextResponse.json(
        { error: "You do not have permission to view import batches for this family." },
        { status: 403 },
      );
    }

    const batches = await listAdminImportBatches(family ?? null);
    return NextResponse.json({ ok: true, batches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load import batches right now." },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    const payload = (await request.json()) as {
      family?: string;
      csvText?: string;
      fileName?: string;
      importMode?: AdminImportMode;
      fieldMapping?: Record<string, AdminImportFieldKey>;
    };

    if (!payload.family || !payload.csvText || !payload.fileName || !payload.importMode) {
      return badRequest("Family, file, and import mode are required.");
    }

    const family = payload.family as SupportedAdminImportFamily;
    if (!canUseAdminFamilyImport(role, capabilities, family)) {
      return NextResponse.json(
        { error: "You do not have permission to import this content family." },
        { status: 403 },
      );
    }

    const result = await executeAdminImport({
      role,
      capabilities,
      actorUserId: user.id ?? null,
      actorEmail: user.email ?? "Operator",
      family,
      csvText: payload.csvText,
      fileName: payload.fileName,
      importMode: payload.importMode,
      fieldMapping: payload.fieldMapping,
    });

    return NextResponse.json({
      ok: true,
      batch: result.batch,
      rows: result.rows,
      savedAt: result.batch.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not import that file right now." },
      { status: 400 },
    );
  }
}
