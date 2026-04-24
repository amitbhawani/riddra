import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { transitionOperatorCmsRecord } from "@/lib/operator-cms-mutations";

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
  const returnTo = sanitizeReturnTo(
    typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
    "/admin/cms",
  );

  try {
    const user = await requireAdmin();
    const action =
      typeof formData.get("action") === "string" ? String(formData.get("action")) : "";
    const notes =
      typeof formData.get("notes") === "string" ? String(formData.get("notes")) : null;
    const result = await transitionOperatorCmsRecord({
      recordId,
      action: action as
        | "send_for_review"
        | "approve"
        | "publish"
        | "unpublish"
        | "archive"
        | "reject",
      actorId: user.id,
      notes,
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
      error instanceof Error
        ? error.message
        : "The CMS workflow action could not be completed.";

    return NextResponse.redirect(
      buildRedirect(request, returnTo, "error", message),
      { status: 303 },
    );
  }
}
