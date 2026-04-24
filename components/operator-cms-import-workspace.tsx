"use client";

import { useActionState, useState } from "react";

import type { OperatorCmsImportFormState } from "@/app/admin/cms/import-actions";

type OperatorCmsImportWorkspaceProps = {
  entityType: string;
  entityLabel: string;
  previewAction: (
    state: OperatorCmsImportFormState,
    formData: FormData,
  ) => Promise<OperatorCmsImportFormState>;
  createAction: (formData: FormData) => Promise<void>;
  queryError?: string;
};

const initialState: OperatorCmsImportFormState = {};

function suggestDefaultTitleField(entityType: string) {
  switch (entityType) {
    case "stock":
      return "name";
    case "mutual_fund":
      return "fund_name";
    default:
      return "title";
  }
}

export function OperatorCmsImportWorkspace({
  entityType,
  entityLabel,
  previewAction,
  createAction,
  queryError,
}: OperatorCmsImportWorkspaceProps) {
  const [state, previewFormAction, pending] = useActionState(previewAction, initialState);
  const [sourceLabel, setSourceLabel] = useState(state.fields?.sourceLabel ?? `${entityLabel} import`);
  const [sourceReference, setSourceReference] = useState(state.fields?.sourceReference ?? "");
  const [uploadedFilename, setUploadedFilename] = useState(state.fields?.uploadedFilename ?? "");
  const [format, setFormat] = useState<"csv" | "json">(state.fields?.format ?? "csv");
  const [titleField, setTitleField] = useState(
    state.fields?.titleField ?? suggestDefaultTitleField(entityType),
  );
  const [slugField, setSlugField] = useState(state.fields?.slugField ?? "slug");
  const [symbolField, setSymbolField] = useState(state.fields?.symbolField ?? "symbol");
  const [rawPayloadText, setRawPayloadText] = useState(state.fields?.rawPayloadText ?? "");

  return (
    <form action={previewFormAction} className="space-y-6">
      <input type="hidden" name="entityType" value={entityType} />

      <div className="grid gap-5 xl:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Source label</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="sourceLabel"
            onChange={(event) => setSourceLabel(event.target.value)}
            value={sourceLabel}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
            Source reference
          </span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="sourceReference"
            onChange={(event) => setSourceReference(event.target.value)}
            placeholder="Vendor file name, shared sheet, or upload note"
            value={sourceReference}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Format</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="format"
            onChange={(event) => setFormat(event.target.value === "json" ? "json" : "csv")}
            value={format}
          >
            <option value="csv" className="bg-slate-950 text-white">
              CSV
            </option>
            <option value="json" className="bg-slate-950 text-white">
              JSON
            </option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Upload file</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-white/15"
            type="file"
            accept={format === "json" ? ".json,application/json" : ".csv,text/csv"}
            onChange={async (event) => {
              const file = event.target.files?.[0];

              if (!file) {
                return;
              }

              setUploadedFilename(file.name);
              setRawPayloadText(await file.text());
            }}
          />
          <input type="hidden" name="uploadedFilename" value={uploadedFilename} />
          {uploadedFilename ? (
            <span className="text-xs leading-6 text-mist/58">Loaded file: {uploadedFilename}</span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Title field</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="titleField"
            onChange={(event) => setTitleField(event.target.value)}
            placeholder="title"
            value={titleField}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Slug field</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="slugField"
            onChange={(event) => setSlugField(event.target.value)}
            placeholder="slug"
            value={slugField}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-mist/62">Symbol field</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
            name="symbolField"
            onChange={(event) => setSymbolField(event.target.value)}
            placeholder="symbol"
            value={symbolField}
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-mist/62">
          CSV, JSON, or pasted rows
        </span>
        <textarea
          className="min-h-[320px] w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 font-mono text-sm text-white outline-none transition focus:border-white/20"
          name="rawPayloadText"
          onChange={(event) => setRawPayloadText(event.target.value)}
          placeholder={
            format === "json"
              ? '[{"title":"Example","slug":"example"}]'
              : "title,slug,symbol\nExample,example,EXAMPLE"
          }
          value={rawPayloadText}
        />
      </label>

      {state.error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </div>
      ) : null}

      {queryError ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {queryError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center justify-center rounded-full bg-aurora px-5 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending ? "Previewing..." : "Preview validation"}
        </button>
        <button
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!state.preview}
          formAction={createAction}
          type="submit"
        >
          Create import batch
        </button>
      </div>

      {state.preview ? (
        <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
          <div>
            <h3 className="text-2xl font-semibold text-white">Validation preview</h3>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              This preview validates the import before a durable batch is saved.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-6">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{state.preview.rowCount}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Valid</p>
              <p className="mt-2 text-2xl font-semibold text-white">{state.preview.validRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Duplicate</p>
              <p className="mt-2 text-2xl font-semibold text-white">{state.preview.duplicateRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Unmatched</p>
              <p className="mt-2 text-2xl font-semibold text-white">{state.preview.unmatchedRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Invalid</p>
              <p className="mt-2 text-2xl font-semibold text-white">{state.preview.invalidRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Review queue</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {state.preview.pendingReviewRows}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {state.preview.rows.map((row) => (
              <div
                key={`${row.rowNumber}-${row.proposedSlug ?? row.proposedTitle ?? "row"}`}
                className="rounded-3xl border border-white/8 bg-black/15 px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Row {row.rowNumber} · {row.proposedTitle ?? row.proposedSlug ?? "Untitled row"}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-mist/60">
                      {row.proposedSlug ?? "no slug"}
                      {row.proposedSymbol ? ` · ${row.proposedSymbol}` : ""}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-mist/74">
                    {row.validationState.replaceAll("_", " ")}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{row.trustedMatchSummary}</p>
                {row.validationErrors.length ? (
                  <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-100">
                    {row.validationErrors.join(" ")}
                  </div>
                ) : null}
                {row.reviewNotes ? (
                  <p className="mt-3 text-sm leading-7 text-amber-100/90">{row.reviewNotes}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
