"use client";

import { useActionState, useEffect, useState } from "react";

import type { OperatorCmsRecordFormState } from "@/app/admin/cms/actions";
import type {
  OperatorCmsEditorConfig,
  OperatorCmsEditorRecord,
} from "@/lib/operator-cms-mutations";

const verificationStates = [
  "unverified",
  "trusted_match",
  "verified",
  "needs_review",
  "rejected",
] as const;

type OperatorCmsRecordFormProps = {
  entityType: string;
  entityLabel: string;
  config: OperatorCmsEditorConfig;
  record: OperatorCmsEditorRecord | null;
  action: (
    state: OperatorCmsRecordFormState,
    formData: FormData,
  ) => Promise<OperatorCmsRecordFormState>;
};

const initialState: OperatorCmsRecordFormState = {};

function useEditableField(initialValue: string) {
  const [value, setValue] = useState(initialValue);

  return { value, setValue };
}

export function OperatorCmsRecordForm({
  entityType,
  entityLabel,
  config,
  record,
  action,
}: OperatorCmsRecordFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const title = useEditableField(record?.title ?? "");
  const canonicalSlug = useEditableField(record?.canonicalSlug ?? "");
  const canonicalSymbol = useEditableField(record?.canonicalSymbol ?? "");
  const verificationState = useEditableField(record?.verificationState ?? "unverified");
  const publicationVisibility = useEditableField(record?.publicationVisibility ?? "private");
  const reviewQueueReason = useEditableField(record?.reviewQueueReason ?? "");
  const sourcePayloadText = useEditableField(record?.sourcePayloadText ?? config.sourcePayloadHint);
  const editorialPayloadText = useEditableField(
    record?.editorialPayloadText ?? config.editorialPayloadHint,
  );
  const metadataText = useEditableField(record?.metadataText ?? config.metadataHint);

  useEffect(() => {
    if (!state.fields) {
      return;
    }

    title.setValue(state.fields.title);
    canonicalSlug.setValue(state.fields.canonicalSlug);
    canonicalSymbol.setValue(state.fields.canonicalSymbol);
    verificationState.setValue(state.fields.verificationState || "unverified");
    publicationVisibility.setValue(state.fields.publicationVisibility || "private");
    reviewQueueReason.setValue(state.fields.reviewQueueReason);
    sourcePayloadText.setValue(state.fields.sourcePayloadText);
    editorialPayloadText.setValue(state.fields.editorialPayloadText);
    metadataText.setValue(state.fields.metadataText);
  }, [state.fields]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="recordId" value={record?.id ?? ""} />

      <div className="grid gap-5 xl:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
            {config.titleLabel}
          </span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="title"
            onChange={(event) => title.setValue(event.target.value)}
            placeholder={entityLabel}
            value={title.value}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Canonical slug</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="canonicalSlug"
            onChange={(event) => canonicalSlug.setValue(event.target.value)}
            placeholder="canonical-slug"
            value={canonicalSlug.value}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
            {config.symbolLabel}
          </span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="canonicalSymbol"
            onChange={(event) => canonicalSymbol.setValue(event.target.value)}
            placeholder={config.requiresSymbol ? "Required" : "Optional"}
            value={canonicalSymbol.value}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
            Verification state
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="verificationState"
            onChange={(event) => verificationState.setValue(event.target.value)}
            value={verificationState.value}
          >
            {verificationStates.map((option) => (
              <option key={option} value={option} className="bg-slate-950 text-white">
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
            Publication visibility
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="publicationVisibility"
            onChange={(event) => publicationVisibility.setValue(event.target.value)}
            value={publicationVisibility.value}
          >
            <option value="private" className="bg-slate-950 text-white">
              private
            </option>
            <option value="public" className="bg-slate-950 text-white">
              public
            </option>
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
          Review queue reason
        </span>
        <textarea
          className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
          name="reviewQueueReason"
          onChange={(event) => reviewQueueReason.setValue(event.target.value)}
          placeholder="Explain review blockers, duplicate notes, or operator context."
          value={reviewQueueReason.value}
        />
      </label>

      <div className="grid gap-5 xl:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Source payload JSON</span>
          <textarea
            className="min-h-[260px] w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 font-mono text-sm text-white outline-none transition focus:border-white/20"
            name="sourcePayloadText"
            onChange={(event) => sourcePayloadText.setValue(event.target.value)}
            value={sourcePayloadText.value}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
            Editorial payload JSON
          </span>
          <textarea
            className="min-h-[260px] w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 font-mono text-sm text-white outline-none transition focus:border-white/20"
            name="editorialPayloadText"
            onChange={(event) => editorialPayloadText.setValue(event.target.value)}
            value={editorialPayloadText.value}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Metadata JSON</span>
          <textarea
            className="min-h-[260px] w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 font-mono text-sm text-white outline-none transition focus:border-white/20"
            name="metadataText"
            onChange={(event) => metadataText.setValue(event.target.value)}
            value={metadataText.value}
          />
        </label>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/74">
        Save actions stay internal. Publish still requires a separate operator action, and publish is
        blocked until the verification state is <span className="font-semibold text-white">verified</span>.
      </div>

      {state.error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center justify-center rounded-full bg-aurora px-5 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          name="intent"
          type="submit"
          value="save"
        >
          {pending ? "Saving..." : record ? "Save changes" : "Create record"}
        </button>
        <button
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          name="intent"
          type="submit"
          value="save_draft"
        >
          Save draft
        </button>
        <button
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          name="intent"
          type="submit"
          value="save_and_review"
        >
          Save and send to review
        </button>
      </div>
    </form>
  );
}
