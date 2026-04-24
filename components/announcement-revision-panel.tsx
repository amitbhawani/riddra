"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type AnnouncementSample = {
  headline: string;
  assetRef: string;
  announcementType: string;
  workflowState: string;
  sourceLabel: string;
  importance: string;
  note: string;
};

type AnnouncementRevisionPanelProps = {
  items: AnnouncementSample[];
};

function getRouteTarget(assetRef: string) {
  if (assetRef.startsWith("stock:tata-motors")) return "/stocks/tata-motors";
  if (assetRef.startsWith("ipo:hero-fincorp")) return "/ipo/hero-fincorp";
  if (assetRef.startsWith("mutual_fund:hdfc-mid-cap-opportunities")) return "/mutual-funds/hdfc-mid-cap-opportunities";
  return "/admin/announcements";
}

function getAssetType(assetRef: string) {
  if (assetRef.startsWith("stock:")) return "stock announcement";
  if (assetRef.startsWith("ipo:")) return "ipo announcement";
  if (assetRef.startsWith("mutual_fund:")) return "mutual-fund announcement";
  return "announcement";
}

function getDefaultRevisionState(workflowState: string): (typeof revisionStates)[number] {
  if (workflowState === "publish_ready") return "Published";
  if (workflowState === "review") return "Review ready";
  return "Rollback staged";
}

function getItemKey(item: AnnouncementSample) {
  return `${item.assetRef}::${item.headline}`;
}

export function AnnouncementRevisionPanel({ items }: AnnouncementRevisionPanelProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState(items[0] ? getItemKey(items[0]) : "");
  const [editor, setEditor] = useState("Announcement Operator");
  const selectedItem = items.find((item) => getItemKey(item) === selectedKey) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.announcementType} announcement mutation from the announcements desk` : "",
  );
  const [changedFields, setChangedFields] = useState("workflow_state, importance, source_label");
  const [reason, setReason] = useState(selectedItem?.note ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.workflowState) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(key: string) {
    const nextItem = items.find((item) => getItemKey(item) === key);
    if (!nextItem) return;
    setSelectedKey(key);
    setAction(`Logged ${nextItem.announcementType} announcement mutation from the announcements desk`);
    setChangedFields("workflow_state, importance, source_label");
    setReason(nextItem.note);
    setRevisionState(getDefaultRevisionState(nextItem.workflowState));
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
          asset: selectedItem.headline,
          assetType: getAssetType(selectedItem.assetRef),
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: getRouteTarget(selectedItem.assetRef),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record announcement revision.");
      }

      setMessage("Saved a write-through announcement revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record announcement revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through announcement log</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Turn manual result notes, IPO updates, and commentary refreshes into real revision entries so the announcements desk also participates in change control instead of remaining a descriptive queue.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Announcement</span>
            <select
              value={selectedKey}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={getItemKey(item)} value={getItemKey(item)} className="bg-slate-950">
                  {item.headline} · {item.announcementType}
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
            <span>Workflow state</span>
            <input
              value={selectedItem?.workflowState ?? ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Importance</span>
            <input
              value={selectedItem?.importance ?? ""}
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
            {pending ? "Saving…" : "Write announcement revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the announcements desk instead of leaving these updates as queue-only cards."}
          </p>
        </div>
      </div>
    </div>
  );
}
