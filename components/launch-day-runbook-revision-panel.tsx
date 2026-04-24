"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type LaunchDayRunbookItem = {
  step: string;
  status: string;
  summary: string;
};

type LaunchDayRunbookRevisionPanelProps = {
  items: LaunchDayRunbookItem[];
};

function getDefaultRevisionState(status: string): (typeof revisionStates)[number] {
  return status === "Required" ? "Review ready" : "Published";
}

export function LaunchDayRunbookRevisionPanel({ items }: LaunchDayRunbookRevisionPanelProps) {
  const router = useRouter();
  const [selectedStep, setSelectedStep] = useState(items[0]?.step ?? "");
  const [editor, setEditor] = useState("Launch Day Operator");
  const selectedItem = items.find((item) => item.step === selectedStep) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.step.toLowerCase()} runbook mutation` : "",
  );
  const [changedFields, setChangedFields] = useState("runbook_step, runbook_status, fallback_notes");
  const [reason, setReason] = useState(selectedItem?.summary ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.status) : "Review ready",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(step: string) {
    const nextItem = items.find((item) => item.step === step);
    if (!nextItem) return;
    setSelectedStep(step);
    setAction(`Logged ${nextItem.step.toLowerCase()} runbook mutation`);
    setChangedFields("runbook_step, runbook_status, fallback_notes");
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
          asset: selectedItem.step,
          assetType: "launch-day runbook step",
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: "/admin/launch-day-runbook",
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record launch-day-runbook revision.");
      }

      setMessage("Saved a write-through launch-day-runbook revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record launch-day-runbook revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through runbook action</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log launch-day sequencing changes into the shared revision lane so same-day rollout changes stop living only as a runbook.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Runbook step</span>
            <select
              value={selectedStep}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.step} value={item.step} className="bg-slate-950">
                  {item.step} · {item.status}
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
              value="/admin/launch-day-runbook"
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
            {pending ? "Saving…" : "Write runbook revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from launch-day-runbook instead of leaving same-day changes as static sequence prose."}
          </p>
        </div>
      </div>
    </div>
  );
}
