import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { rollbackOperatorCmsRecord } from "@/lib/operator-cms-mutations";

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
  { params }: { params: Promise<{ recordId: string }> },
) {
  const { recordId } = await params;
  const formData = await request.formData();
  const revisionId =
    typeof formData.get("revisionId") === "string" ? String(formData.get("revisionId")) : "";
  const returnTo = sanitizeReturnTo(
    typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
    "/admin/cms",
  );

  try {
    const user = await requireAdmin();
    const result = await rollbackOperatorCmsRecord({
      recordId,
      revisionId,
      actorId: user.id,
    });

    revalidatePath("/admin/cms");
    revalidatePath(`/admin/cms/${result.entityType}`);
    revalidatePath(`/admin/cms/${result.entityType}/${result.recordId}`);

    return NextResponse.redirect(
      buildRedirect(request, returnTo, "success", result.message),
      { status: 303 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The CMS revision rollback could not be completed.";

    return NextResponse.redirect(
      buildRedirect(request, returnTo, "error", message),
      { status: 303 },
    );
  }
}
