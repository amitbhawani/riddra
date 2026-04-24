"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import {
  createOperatorCmsImportBatch,
  previewOperatorCmsImport,
  type OperatorCmsImportPreview,
} from "@/lib/operator-cms-imports";

export type OperatorCmsImportFormState = {
  error?: string | null;
  fields?: {
    entityType: string;
    sourceLabel: string;
    sourceReference: string;
    uploadedFilename: string;
    format: "csv" | "json";
    titleField: string;
    slugField: string;
    symbolField: string;
    rawPayloadText: string;
  };
  preview?: OperatorCmsImportPreview | null;
};

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function buildStateFromFormData(formData: FormData): OperatorCmsImportFormState {
  return {
    error: null,
    fields: {
      entityType: getValue(formData, "entityType"),
      sourceLabel: getValue(formData, "sourceLabel"),
      sourceReference: getValue(formData, "sourceReference"),
      uploadedFilename: getValue(formData, "uploadedFilename"),
      format: (getValue(formData, "format") === "json" ? "json" : "csv") as "csv" | "json",
      titleField: getValue(formData, "titleField"),
      slugField: getValue(formData, "slugField"),
      symbolField: getValue(formData, "symbolField"),
      rawPayloadText: getValue(formData, "rawPayloadText"),
    },
  };
}

export async function previewOperatorCmsImportAction(
  _previousState: OperatorCmsImportFormState,
  formData: FormData,
): Promise<OperatorCmsImportFormState> {
  const stateFromForm = buildStateFromFormData(formData);

  try {
    await requireAdmin();
    const fields = stateFromForm.fields!;
    const preview = await previewOperatorCmsImport({
      entityType: fields.entityType,
      format: fields.format,
      rawPayloadText: fields.rawPayloadText,
      mapping: {
        titleField: fields.titleField,
        slugField: fields.slugField,
        symbolField: fields.symbolField,
      },
    });

    return {
      ...stateFromForm,
      preview,
    };
  } catch (error) {
    return {
      ...stateFromForm,
      error:
        error instanceof Error
          ? error.message
          : "The import preview could not be generated right now.",
      preview: null,
    };
  }
}

export async function createOperatorCmsImportBatchAction(formData: FormData) {
  const fields = buildStateFromFormData(formData).fields!;

  try {
    const user = await requireAdmin();
    const result = await createOperatorCmsImportBatch({
      entityType: fields.entityType,
      sourceLabel: fields.sourceLabel,
      sourceReference: fields.sourceReference,
      uploadedFilename: fields.uploadedFilename,
      format: fields.format,
      rawPayloadText: fields.rawPayloadText,
      mapping: {
        titleField: fields.titleField,
        slugField: fields.slugField,
        symbolField: fields.symbolField,
      },
      actorId: user.id,
    });

    revalidatePath("/admin/cms");
    revalidatePath(`/admin/cms/${result.entityType}`);
    revalidatePath(`/admin/cms/${result.entityType}/imports`);
    revalidatePath(`/admin/cms/${result.entityType}/imports/new`);
    revalidatePath(`/admin/cms/${result.entityType}/imports/${result.batchId}`);

    redirect(
      `/admin/cms/${result.entityType}/imports/${result.batchId}?success=${encodeURIComponent(result.message)}`,
    );
  } catch (error) {
    redirect(
      `/admin/cms/${fields.entityType}/imports/new?error=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "The import batch could not be created right now.",
      )}`,
    );
  }
}
