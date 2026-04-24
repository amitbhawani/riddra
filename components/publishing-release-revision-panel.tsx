"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type PublishingCalendarItem = {
  title: string;
  assetRef: string;
  publishWindow: string;
  priority: string;
  owner: string;
  note: string;
};

type PublishingReleaseRevisionPanelProps = {
  items: PublishingCalendarItem[];
};

function getRouteTarget(assetRef: string) {
  if (assetRef.startsWith("stock:tata-motors")) return "/stocks/tata-motors";
  if (assetRef.startsWith("ipo:hero-fincorp")) return "/ipo/hero-fincorp";
  if (assetRef.startsWith("mutual_fund:hdfc-mid-cap-opportunities")) {
    return "/mutual-funds/hdfc-mid-cap-opportunities";
  }
  return "/admin/publishing-calendar";
}

function getDefaultRevisionState(priority: string): (typeof revisionStates)[number] {
  return priority === "High" ? "Review ready" : "Published";
}

export function PublishingReleaseRevisionPanel({ items }: PublishingReleaseRevisionPanelProps) {
  const router = useRouter();
  const [selectedTitle, setSelectedTitle] = useState(items[0]?.title ?? "");
  const [editor, setEditor] = useState("Publishing Operator");
  const selectedItem = items.find((item) => item.title === selectedTitle) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.title} release-window mutation from the publishing calendar` : "",
  );
  const [reason, setReason] = useState(selectedItem?.note ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.priority) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(title: string) {
    const nextItem = items.find((item) => item.title === title);
    if (!nextItem) return;
    setSelectedTitle(title);
    setAction(`Logged ${nextItem.title} release-window mutation from the publishing calendar`);
    setReason(nextItem.note);
    setRevisionState(getDefaultRevisionState(nextItem.priority));
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
          assetType: "publishing release window",
          editor,
          action,
          changedFields: "publish_window, priority, owner",
          reason,
          revisionState,
          routeTarget: getRouteTarget(selectedItem.assetRef),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record publishing release mutation.");
      }

      setMessage("Saved a write-through publishing-calendar revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record publishing release mutation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through release log</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Turn scheduled publishing windows into real revision entries so release planning, review posture, and publish timing also feed the shared editorial audit trail.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Scheduled item</span>
            <select
              value={selectedTitle}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.title} value={item.title} className="bg-slate-950">
                  {item.title} · {item.priority}
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
            <span>Route target</span>
            <input
              value={selectedItem ? getRouteTarget(selectedItem.assetRef) : ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Owner</span>
            <input
              value={selectedItem?.owner ?? ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Publish window</span>
            <input
              value={selectedItem?.publishWindow ?? ""}
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
            {pending ? "Saving…" : "Write release revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Creates a real revision row from the publishing-calendar desk instead of leaving release timing as queue-only planning."}
          </p>
        </div>
      </div>
    </div>
  );
}
