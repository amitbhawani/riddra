"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type FieldDictionaryFamily = {
  family: string;
  status: string;
  note: string;
};

type FieldDictionaryRevisionPanelProps = {
  items: FieldDictionaryFamily[];
};

function getDefaultRevisionState(status: string): (typeof revisionStates)[number] {
  if (status === "Structured") return "Published";
  if (status === "Hybrid") return "Review ready";
  return "Rollback staged";
}

export function FieldDictionaryRevisionPanel({ items }: FieldDictionaryRevisionPanelProps) {
  const router = useRouter();
  const [selectedFamily, setSelectedFamily] = useState(items[0]?.family ?? "");
  const [editor, setEditor] = useState("Schema Governance Operator");
  const selectedItem = items.find((item) => item.family === selectedFamily) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.family.toLowerCase()} governance mutation from the field dictionary` : "",
  );
  const [changedFields, setChangedFields] = useState("status, validation_rule, ownership_boundary");
  const [reason, setReason] = useState(selectedItem?.note ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.status) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(family: string) {
    const nextItem = items.find((item) => item.family === family);
    if (!nextItem) return;
    setSelectedFamily(family);
    setAction(`Logged ${nextItem.family.toLowerCase()} governance mutation from the field dictionary`);
    setChangedFields("status, validation_rule, ownership_boundary");
    setReason(nextItem.note);
    setRevisionState(getDefaultRevisionState(nextItem.status));
    setMessage(null);
  }

  async function saveRevision() {
    if (!selectedItem) return;

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: selectedItem.family,
          assetType: "field dictionary family",
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: "/admin/field-dictionary",
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record field-dictionary revision.");
      }

      setMessage("Saved a write-through field-dictionary revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record field-dictionary revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through schema action</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log validation and ownership changes into the shared revision lane so schema governance also shows up in the editorial audit trail.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Field family</span>
            <select
              value={selectedFamily}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.family} value={item.family} className="bg-slate-950">
                  {item.family} · {item.status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Operator</span>
            <input
              value={editor}
              onChange={(event) => setEditor(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Revision state</span>
            <select
              value={revisionState}
              onChange={(event) => setRevisionState(event.target.value as (typeof revisionStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {revisionStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <input
              value={selectedItem?.status ?? ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Action</span>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Changed fields</span>
            <input
              value={changedFields}
              onChange={(event) => setChangedFields(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveRevision}
            disabled={pending || !selectedItem}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Write schema revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the field dictionary instead of leaving governance changes as static notes."}
          </p>
        </div>
      </div>
    </div>
  );
}
