"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

export function EditorialRevisionLogPanel() {
  const router = useRouter();
  const [asset, setAsset] = useState("Tata Motors");
  const [assetType, setAssetType] = useState("Stock page");
  const [editor, setEditor] = useState("Ops Editor");
  const [action, setAction] = useState("Logged backend closure revision");
  const [changedFields, setChangedFields] = useState("backend_lane_summary, operator_note");
  const [reason, setReason] = useState("Persisted revision entry added during backend closure pass.");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>("Published");
  const [routeTarget, setRouteTarget] = useState("/stocks/tata-motors");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveRevision() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          assetType,
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save revision log entry.");
      }

      setMessage("Saved revision entry into the editorial memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save revision log entry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write revision log entry</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes a real revision row into the editorial memory store instead of leaving change control as audit-only planning.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Asset</span>
            <input value={asset} onChange={(event) => setAsset(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Asset type</span>
            <input value={assetType} onChange={(event) => setAssetType(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Editor</span>
            <input value={editor} onChange={(event) => setEditor(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Revision state</span>
            <select value={revisionState} onChange={(event) => setRevisionState(event.target.value as (typeof revisionStates)[number])} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20">
              {revisionStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Action</span>
            <input value={action} onChange={(event) => setAction(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Changed fields</span>
            <input value={changedFields} onChange={(event) => setChangedFields(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Route target</span>
            <input value={routeTarget} onChange={(event) => setRouteTarget(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Reason</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveRevision} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Saving…" : "Save revision entry"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same editorial memory lane used by revisions and rollback surfaces."}</p>
        </div>
      </div>
    </div>
  );
}
