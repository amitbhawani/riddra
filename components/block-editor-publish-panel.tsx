"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type BlockEditorSample = {
  asset: string;
  block: string;
  mode: string;
  note: string;
};

type BlockEditorPublishPanelProps = {
  items: BlockEditorSample[];
};

function getRouteTarget(asset: string) {
  if (asset === "Hero FinCorp IPO") return "/ipo/hero-fincorp";
  if (asset === "Tata Motors") return "/stocks/tata-motors";
  return "/mutual-funds/hdfc-mid-cap-opportunities";
}

function getDefaultRevisionState(mode: string): (typeof revisionStates)[number] {
  return mode === "Editorial" ? "Review ready" : "Published";
}

export function BlockEditorPublishPanel({ items }: BlockEditorPublishPanelProps) {
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] = useState(items[0]?.asset ?? "");
  const [editor, setEditor] = useState("CMS Operator");
  const selectedItem = items.find((item) => item.asset === selectedAsset) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Published ${selectedItem.block} block update from the block editor` : "",
  );
  const [changedFields, setChangedFields] = useState(selectedItem?.block ?? "");
  const [reason, setReason] = useState(selectedItem?.note ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.mode) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(asset: string) {
    const nextItem = items.find((item) => item.asset === asset);
    if (!nextItem) return;
    setSelectedAsset(asset);
    setAction(`Published ${nextItem.block} block update from the block editor`);
    setChangedFields(nextItem.block);
    setReason(nextItem.note);
    setRevisionState(getDefaultRevisionState(nextItem.mode));
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
          asset: selectedItem.asset,
          assetType: `${selectedItem.mode} block`,
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: getRouteTarget(selectedItem.asset),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to publish block edit into the revision lane.");
      }

      setMessage("Saved a write-through block-editor revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish block edit into the revision lane.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through block publish</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log a block-level publish action directly from this editor so page-edit style changes start creating real revision rows instead of living only as preview cards.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Block sample</span>
            <select
              value={selectedAsset}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={`${item.asset}-${item.block}`} value={item.asset} className="bg-slate-950">
                  {item.asset} · {item.block}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Editor</span>
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
              value={selectedItem ? getRouteTarget(selectedItem.asset) : ""}
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
          <label className="space-y-2 text-sm text-mist/78">
            <span>Changed fields</span>
            <input
              value={changedFields}
              onChange={(event) => setChangedFields(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Mode</span>
            <input
              value={selectedItem?.mode ?? ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
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
            {pending ? "Publishing…" : "Write block revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Creates a real editorial revision row from the block-editor desk instead of only showing static queue samples."}
          </p>
        </div>
      </div>
    </div>
  );
}
