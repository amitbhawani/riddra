"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AssetPipelineItem = {
  assetType: "stock" | "ipo" | "mutual_fund";
  slug: string;
  name: string;
  score: number;
  status: string;
  priority: string;
  nextAction: string;
  missingLive: string[];
};

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type ContentPipelineRevisionPanelProps = {
  items: AssetPipelineItem[];
};

function getItemKey(item: AssetPipelineItem) {
  return `${item.assetType}:${item.slug}`;
}

function getRouteTarget(item: AssetPipelineItem) {
  if (item.assetType === "stock") return `/stocks/${item.slug}`;
  if (item.assetType === "ipo") return `/ipo/${item.slug}`;
  return `/mutual-funds/${item.slug}`;
}

function getDefaultRevisionState(item: AssetPipelineItem): (typeof revisionStates)[number] {
  if (item.priority === "P0") return "Review ready";
  if (item.status === "ready_for_depth") return "Published";
  return "Rollback staged";
}

export function ContentPipelineRevisionPanel({ items }: ContentPipelineRevisionPanelProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState(items[0] ? getItemKey(items[0]) : "");
  const [editor, setEditor] = useState("Content Queue Operator");
  const selectedItem = items.find((item) => getItemKey(item) === selectedKey) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.assetType} content-pipeline mutation from the content admin desk` : "",
  );
  const [changedFields, setChangedFields] = useState("status, priority, next_action, missing_live");
  const [reason, setReason] = useState(selectedItem?.nextAction ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(key: string) {
    const nextItem = items.find((item) => getItemKey(item) === key);
    if (!nextItem) return;
    setSelectedKey(key);
    setAction(`Logged ${nextItem.assetType} content-pipeline mutation from the content admin desk`);
    setChangedFields("status, priority, next_action, missing_live");
    setReason(nextItem.nextAction);
    setRevisionState(getDefaultRevisionState(nextItem));
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
          asset: selectedItem.name,
          assetType: `${selectedItem.assetType} content pipeline`,
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: getRouteTarget(selectedItem),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record content pipeline revision.");
      }

      setMessage("Saved a write-through content-pipeline revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record content pipeline revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through pipeline action</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Turn content-queue changes into real revision entries so asset scoring, next-step decisions, and completion posture feed the same editorial audit trail as the other admin desks.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Tracked asset</span>
            <select
              value={selectedKey}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={getItemKey(item)} value={getItemKey(item)} className="bg-slate-950">
                  {item.name} · {item.priority} · {item.status}
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
              value={selectedItem ? getRouteTarget(selectedItem) : ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Score</span>
            <input
              value={selectedItem ? `${selectedItem.score}%` : ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Priority</span>
            <input
              value={selectedItem?.priority ?? ""}
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
            {pending ? "Saving…" : "Write content revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the content pipeline instead of leaving queue movement as a dashboard-only signal."}
          </p>
        </div>
      </div>
    </div>
  );
}
