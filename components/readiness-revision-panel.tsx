"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

export type ReadinessRevisionItem = {
  label: string;
  status: string;
  detail: string;
  routeTarget?: string;
};

type ReadinessRevisionPanelProps = {
  items: ReadinessRevisionItem[];
  assetType: string;
  panelTitle: string;
  panelDescription: string;
  defaultRouteTarget: string;
  defaultOperator: string;
  defaultChangedFields: string;
  actionNoun: string;
};

function getDefaultRevisionState(status: string): (typeof revisionStates)[number] {
  const normalized = status.toLowerCase();
  if (normalized.includes("ready") || normalized.includes("configured") || normalized.includes("live")) {
    return "Published";
  }
  if (
    normalized.includes("progress") ||
    normalized.includes("partial") ||
    normalized.includes("verification") ||
    normalized.includes("required") ||
    normalized.includes("queued")
  ) {
    return "Review ready";
  }
  return "Rollback staged";
}

export function ReadinessRevisionPanel({
  items,
  assetType,
  panelTitle,
  panelDescription,
  defaultRouteTarget,
  defaultOperator,
  defaultChangedFields,
  actionNoun,
}: ReadinessRevisionPanelProps) {
  const router = useRouter();
  const [selectedLabel, setSelectedLabel] = useState(items[0]?.label ?? "");
  const [editor, setEditor] = useState(defaultOperator);
  const selectedItem = items.find((item) => item.label === selectedLabel) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.label.toLowerCase()} ${actionNoun}` : "",
  );
  const [changedFields, setChangedFields] = useState(defaultChangedFields);
  const [reason, setReason] = useState(selectedItem?.detail ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.status) : "Review ready",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(label: string) {
    const nextItem = items.find((item) => item.label === label);
    if (!nextItem) return;
    setSelectedLabel(label);
    setAction(`Logged ${nextItem.label.toLowerCase()} ${actionNoun}`);
    setChangedFields(defaultChangedFields);
    setReason(nextItem.detail);
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
          asset: selectedItem.label,
          assetType,
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: selectedItem.routeTarget ?? defaultRouteTarget,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record readiness revision.");
      }

      setMessage("Saved a write-through readiness revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record readiness revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{panelTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{panelDescription}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Checklist item</span>
            <select
              value={selectedLabel}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.label} value={item.label} className="bg-slate-950">
                  {item.label} · {item.status}
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
            <span>Related surface</span>
            <input
              value={selectedItem?.routeTarget ?? defaultRouteTarget}
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
            {pending ? "Saving…" : "Write readiness revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from this readiness desk instead of leaving it as a static checklist."}
          </p>
        </div>
      </div>
    </div>
  );
}
