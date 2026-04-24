"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type ContentRolloutItem = {
  routeFamily: string;
  currentMode: "Fallback-first" | "DB-first with fallback" | "DB-ready";
  backingTables: string[];
  nextStep: string;
};

type ContentRolloutRevisionPanelProps = {
  items: ContentRolloutItem[];
};

function getRouteTarget(routeFamily: string) {
  if (routeFamily === "Stocks") return "/stocks/tata-motors";
  if (routeFamily === "IPOs and SME IPOs") return "/ipo/hero-fincorp";
  if (routeFamily === "Mutual Funds") return "/mutual-funds/hdfc-mid-cap-opportunities";
  if (routeFamily === "Portfolio") return "/portfolio";
  if (routeFamily === "Account and entitlements") return "/account/access/entitlements";
  return "/indices";
}

function getDefaultRevisionState(mode: ContentRolloutItem["currentMode"]): (typeof revisionStates)[number] {
  if (mode === "DB-ready") return "Published";
  if (mode === "DB-first with fallback") return "Review ready";
  return "Rollback staged";
}

export function ContentRolloutRevisionPanel({ items }: ContentRolloutRevisionPanelProps) {
  const router = useRouter();
  const [selectedFamily, setSelectedFamily] = useState(items[0]?.routeFamily ?? "");
  const [editor, setEditor] = useState("Content Rollout Operator");
  const selectedItem = items.find((item) => item.routeFamily === selectedFamily) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.routeFamily} rollout transition from the content-rollout desk` : "",
  );
  const [changedFields, setChangedFields] = useState("current_mode, backing_tables, next_step");
  const [reason, setReason] = useState(selectedItem?.nextStep ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.currentMode) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(routeFamily: string) {
    const nextItem = items.find((item) => item.routeFamily === routeFamily);
    if (!nextItem) return;
    setSelectedFamily(routeFamily);
    setAction(`Logged ${nextItem.routeFamily} rollout transition from the content-rollout desk`);
    setChangedFields("current_mode, backing_tables, next_step");
    setReason(nextItem.nextStep);
    setRevisionState(getDefaultRevisionState(nextItem.currentMode));
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
          asset: selectedItem.routeFamily,
          assetType: "content rollout family",
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: getRouteTarget(selectedItem.routeFamily),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record content rollout revision.");
      }

      setMessage("Saved a write-through content-rollout revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record content rollout revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through rollout transition</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log route-family data-mode changes into the shared revision lane so rollout posture stops living only as architecture notes.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Route family</span>
            <select
              value={selectedFamily}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.routeFamily} value={item.routeFamily} className="bg-slate-950">
                  {item.routeFamily} · {item.currentMode}
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
              value={selectedItem ? getRouteTarget(selectedItem.routeFamily) : ""}
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
            {pending ? "Saving…" : "Write rollout revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the content-rollout desk instead of leaving rollout state as static architecture status."}
          </p>
        </div>
      </div>
    </div>
  );
}
