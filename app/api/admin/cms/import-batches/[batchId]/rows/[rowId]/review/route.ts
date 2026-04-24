import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { reviewOperatorCmsImportRow } from "@/lib/operator-cms-imports";

function sanitizeReturnTo(value: string | null, fallback: string) {
  if (value && value.startsWith("/admin/cms")) {
    return value;
  }

  return fallback;
}

function buildRedirect(request: Request, path: string, key: "success" | "error", message: string) {
  const url = new URL(path, request.url);
  url.searchParams.set(key, message);
  return url;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string; rowId: string }> },
) {
  const { batchId, rowId } = await params;
  const formData = await request.formData();
  const returnTo = sanitizeReturnTo(
    typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
    "/admin/cms",
  );

  try {
    await requireAdmin();
    const decision =
      typeof formData.get("decision") === "string" ? String(formData.get("decision")) : "";
    const reviewNotes =
      typeof formData.get("reviewNotes") === "string" ? String(formData.get("reviewNotes")) : null;
    const result = await reviewOperatorCmsImportRow({
      batchId,
      rowId,
      decision: decision as "approve_for_import" | "reject",
      reviewNotes,
    });

    revalidatePath("/admin/cms");
    revalidatePath(`/admin/cms/${result.entityType}`);
    revalidatePath(`/admin/cms/${result.entityType}/imports`);
    revalidatePath(returnTo);

    return NextResponse.redirect(
      buildRedirect(request, returnTo, "success", result.message),
      { status: 303 },
    );
  } catch (error) {
    return NextResponse.redirect(
      buildRedirect(
        request,
        returnTo,
        "error",
        error instanceof Error ? error.message : "The row review decision could not be saved.",
      ),
      { status: 303 },
    );
  }
}
