"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type LaunchPostureBlocker = {
  title: string;
  status: "Resolved" | "Blocking";
  requiredFor: string;
  detail: string;
};

type LaunchPostureRevisionPanelProps = {
  items: LaunchPostureBlocker[];
};

export function LaunchPostureRevisionPanel({ items }: LaunchPostureRevisionPanelProps) {
  const router = useRouter();
  const [selectedTitle, setSelectedTitle] = useState(items[0]?.title ?? "");
  const [editor, setEditor] = useState("Launch Posture Operator");
  const selectedItem = items.find((item) => item.title === selectedTitle) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.title.toLowerCase()} launch-posture mutation` : "",
  );
  const [changedFields, setChangedFields] = useState("posture_blocker, required_mode, blocker_detail");
  const [reason, setReason] = useState(selectedItem?.detail ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>("Rollback staged");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(title: string) {
    const nextItem = items.find((item) => item.title === title);
    if (!nextItem) return;
    setSelectedTitle(title);
    setAction(`Logged ${nextItem.title.toLowerCase()} launch-posture mutation`);
    setChangedFields("posture_blocker, required_mode, blocker_detail");
    setReason(nextItem.detail);
    setRevisionState("Rollback staged");
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
          assetType: "launch posture blocker",
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: "/admin/launch-posture-board",
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record launch-posture revision.");
      }

      setMessage("Saved a write-through launch-posture revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record launch-posture revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through posture action</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log launch-posture changes into the shared revision lane so posture-blocker changes stop living only as a combined review board.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Posture blocker</span>
            <select
              value={selectedTitle}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.title} value={item.title} className="bg-slate-950">
                  {item.title} · {item.requiredFor.replaceAll("_", " ")}
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
              value="/admin/launch-posture-board"
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
            {pending ? "Saving…" : "Write posture revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from launch-posture-board instead of leaving posture-blocker changes as static review logic."}
          </p>
        </div>
      </div>
    </div>
  );
}
