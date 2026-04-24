"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type ContentModelEntity = {
  name: string;
  title: string;
  status: string;
  summary: string;
};

type ContentModelRevisionPanelProps = {
  items: ContentModelEntity[];
};

function getDefaultRevisionState(status: string): (typeof revisionStates)[number] {
  if (status === "In progress") return "Review ready";
  if (status === "Planned") return "Rollback staged";
  return "Published";
}

export function ContentModelRevisionPanel({ items }: ContentModelRevisionPanelProps) {
  const router = useRouter();
  const [selectedName, setSelectedName] = useState(items[0]?.name ?? "");
  const [editor, setEditor] = useState("Content Model Operator");
  const selectedItem = items.find((item) => item.name === selectedName) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.name} model mutation from the content-model registry` : "",
  );
  const [changedFields, setChangedFields] = useState("status, entity_scope, lifecycle_summary");
  const [reason, setReason] = useState(selectedItem?.summary ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.status) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(name: string) {
    const nextItem = items.find((item) => item.name === name);
    if (!nextItem) return;
    setSelectedName(name);
    setAction(`Logged ${nextItem.name} model mutation from the content-model registry`);
    setChangedFields("status, entity_scope, lifecycle_summary");
    setReason(nextItem.summary);
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
          asset: selectedItem.title,
          assetType: "content model entity",
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: "/admin/content-models",
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record content-model revision.");
      }

      setMessage("Saved a write-through content-model revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record content-model revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through model action</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log content-model entity changes into the shared revision lane so architecture planning also shows up in the same change-control history as the rest of the CMS.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Model entity</span>
            <select
              value={selectedName}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.name} value={item.name} className="bg-slate-950">
                  {item.title} · {item.status}
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
            {pending ? "Saving…" : "Write model revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the content-model registry instead of leaving model-state changes as planning-only cards."}
          </p>
        </div>
      </div>
    </div>
  );
}
