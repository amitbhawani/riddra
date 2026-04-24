"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type RelationshipSample = {
  source: string;
  relationshipType: string;
  target: string;
  strength: number;
  note: string;
};

type RelationshipRevisionPanelProps = {
  items: RelationshipSample[];
};

function getRouteTarget(source: string) {
  if (source.startsWith("stock:tata-motors")) return "/stocks/tata-motors";
  if (source.startsWith("ipo:hero-fincorp")) return "/ipo/hero-fincorp";
  if (source.startsWith("learn:")) return "/learn/what-is-open-interest";
  return "/admin/relationships";
}

function getDefaultRevisionState(strength: number): (typeof revisionStates)[number] {
  if (strength >= 60) return "Published";
  if (strength >= 40) return "Review ready";
  return "Rollback staged";
}

function getItemKey(item: RelationshipSample) {
  return `${item.source}::${item.relationshipType}::${item.target}`;
}

export function RelationshipRevisionPanel({ items }: RelationshipRevisionPanelProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState(items[0] ? getItemKey(items[0]) : "");
  const [editor, setEditor] = useState("Relationship Graph Operator");
  const selectedItem = items.find((item) => getItemKey(item) === selectedKey) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.relationshipType} graph mutation from the relationships desk` : "",
  );
  const [changedFields, setChangedFields] = useState("relationship_type, target, strength");
  const [reason, setReason] = useState(selectedItem?.note ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.strength) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(key: string) {
    const nextItem = items.find((item) => getItemKey(item) === key);
    if (!nextItem) return;
    setSelectedKey(key);
    setAction(`Logged ${nextItem.relationshipType} graph mutation from the relationships desk`);
    setChangedFields("relationship_type, target, strength");
    setReason(nextItem.note);
    setRevisionState(getDefaultRevisionState(nextItem.strength));
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
          asset: `${selectedItem.source} -> ${selectedItem.target}`,
          assetType: "relationship graph link",
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: getRouteTarget(selectedItem.source),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record relationship revision.");
      }

      setMessage("Saved a write-through relationship revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record relationship revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through graph action</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log relationship-link changes into the shared revision lane so compare candidates, sector references, and learning links stop living only as samples.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Relationship</span>
            <select
              value={selectedKey}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={getItemKey(item)} value={getItemKey(item)} className="bg-slate-950">
                  {item.relationshipType} · {item.source} → {item.target}
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
            <span>Strength</span>
            <input
              value={selectedItem?.strength ?? ""}
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
            {pending ? "Saving…" : "Write graph revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the relationships desk instead of leaving graph changes as sample cards only."}
          </p>
        </div>
      </div>
    </div>
  );
}
