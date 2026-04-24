import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { applyOperatorCmsImportBatch } from "@/lib/operator-cms-imports";

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
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const formData = await request.formData();
  const returnTo = sanitizeReturnTo(
    typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
    "/admin/cms",
  );

  try {
    const user = await requireAdmin();
    const result = await applyOperatorCmsImportBatch({
      batchId,
      actorId: user.id,
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
        error instanceof Error ? error.message : "The import batch could not be applied.",
      ),
      { status: 303 },
    );
  }
}
