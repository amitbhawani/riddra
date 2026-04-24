"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { saveOperatorCmsRecord } from "@/lib/operator-cms-mutations";

export type OperatorCmsRecordFormState = {
  error?: string | null;
  fields?: {
    entityType: string;
    recordId: string;
    title: string;
    canonicalSlug: string;
    canonicalSymbol: string;
    verificationState: string;
    publicationVisibility: string;
    reviewQueueReason: string;
    sourcePayloadText: string;
    editorialPayloadText: string;
    metadataText: string;
  };
};

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function buildStateFromFormData(formData: FormData): OperatorCmsRecordFormState {
  return {
    error: null,
    fields: {
      entityType: getValue(formData, "entityType"),
      recordId: getValue(formData, "recordId"),
      title: getValue(formData, "title"),
      canonicalSlug: getValue(formData, "canonicalSlug"),
      canonicalSymbol: getValue(formData, "canonicalSymbol"),
      verificationState: getValue(formData, "verificationState"),
      publicationVisibility: getValue(formData, "publicationVisibility"),
      reviewQueueReason: getValue(formData, "reviewQueueReason"),
      sourcePayloadText: getValue(formData, "sourcePayloadText"),
      editorialPayloadText: getValue(formData, "editorialPayloadText"),
      metadataText: getValue(formData, "metadataText"),
    },
  };
}

export async function submitOperatorCmsRecordAction(
  _previousState: OperatorCmsRecordFormState,
  formData: FormData,
): Promise<OperatorCmsRecordFormState> {
  const stateFromForm = buildStateFromFormData(formData);

  try {
    const user = await requireAdmin();
    const entityType = stateFromForm.fields?.entityType ?? "";
    const recordId = stateFromForm.fields?.recordId || null;
    const result = await saveOperatorCmsRecord({
      entityType,
      recordId,
      title: stateFromForm.fields?.title ?? "",
      canonicalSlug: stateFromForm.fields?.canonicalSlug ?? "",
      canonicalSymbol: stateFromForm.fields?.canonicalSymbol ?? "",
      verificationState: stateFromForm.fields?.verificationState ?? "",
      publicationVisibility: stateFromForm.fields?.publicationVisibility ?? "",
      reviewQueueReason: stateFromForm.fields?.reviewQueueReason ?? "",
      sourcePayloadText: stateFromForm.fields?.sourcePayloadText ?? "",
      editorialPayloadText: stateFromForm.fields?.editorialPayloadText ?? "",
      metadataText: stateFromForm.fields?.metadataText ?? "",
      intent: (getValue(formData, "intent") as "save" | "save_draft" | "save_and_review") || "save",
      actorId: user.id,
    });

    revalidatePath("/admin/cms");
    revalidatePath(`/admin/cms/${result.entityType}`);
    revalidatePath(`/admin/cms/${result.entityType}/new`);
    revalidatePath(`/admin/cms/${result.entityType}/${result.recordId}`);

    redirect(
      `/admin/cms/${result.entityType}/${result.recordId}?success=${encodeURIComponent(result.message)}`,
    );
  } catch (error) {
    return {
      ...stateFromForm,
      error:
        error instanceof Error
          ? error.message
          : "The CMS record could not be saved right now.",
    };
  }
}
