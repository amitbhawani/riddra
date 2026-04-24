"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type AdminDocumentItem = {
  title: string;
  asset: string;
  assetType: string;
  category: string;
  source: string;
  owner: string;
  updatedAt: string;
  status: "Live" | "Review" | "Draft";
  note: string;
};

type DocumentRevisionPanelProps = {
  items: AdminDocumentItem[];
};

function getRouteTarget(item: AdminDocumentItem) {
  if (item.assetType === "IPO page") return "/ipo/hero-fincorp";
  if (item.assetType === "Stock page") return "/stocks/tata-motors";
  if (item.assetType === "Mutual fund page") return "/mutual-funds/hdfc-mid-cap-opportunities";
  return "/admin/documents";
}

function getDefaultRevisionState(status: AdminDocumentItem["status"]): (typeof revisionStates)[number] {
  if (status === "Live") return "Published";
  if (status === "Review") return "Review ready";
  return "Rollback staged";
}

export function DocumentRevisionPanel({ items }: DocumentRevisionPanelProps) {
  const router = useRouter();
  const [selectedTitle, setSelectedTitle] = useState(items[0]?.title ?? "");
  const [editor, setEditor] = useState("Document Ops Operator");
  const selectedItem = items.find((item) => item.title === selectedTitle) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.category.toLowerCase()} document mutation from document operations` : "",
  );
  const [changedFields, setChangedFields] = useState("status, category, source, owner, updated_at");
  const [reason, setReason] = useState(selectedItem?.note ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.status) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(title: string) {
    const nextItem = items.find((item) => item.title === title);
    if (!nextItem) return;
    setSelectedTitle(title);
    setAction(`Logged ${nextItem.category.toLowerCase()} document mutation from document operations`);
    setChangedFields("status, category, source, owner, updated_at");
    setReason(nextItem.note);
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
          asset: selectedItem.title,
          assetType: `${selectedItem.assetType} document`,
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
        throw new Error(payload.error ?? "Unable to record document revision.");
      }

      setMessage("Saved a write-through document revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record document revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through document log</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log document status and ownership changes into the shared revision lane so filing, factsheet, and report operations stop living as static cards only.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Document</span>
            <select
              value={selectedTitle}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.title} value={item.title} className="bg-slate-950">
                  {item.title} · {item.status}
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
            <span>Status</span>
            <input
              value={selectedItem?.status ?? ""}
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
            {pending ? "Saving…" : "Write document revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from document operations instead of leaving document status changes as descriptive-only metadata."}
          </p>
        </div>
      </div>
    </div>
  );
}
