"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type EditorialWorkflowItem = {
  entityType: string;
  entityLabel: string;
  workflowState: string;
  assignedTo: string;
  reviewer: string;
  dueAt: string;
  note: string;
};

type EditorialWorkflowTransitionPanelProps = {
  items: EditorialWorkflowItem[];
};

function getWorkflowRouteTarget(item: EditorialWorkflowItem) {
  if (item.entityType === "document") return "/admin/documents";
  if (item.entityLabel.startsWith("stock:tata-motors/")) return "/stocks/tata-motors";
  if (item.entityLabel.startsWith("ipo:hero-fincorp/")) return "/ipo/hero-fincorp";
  return "/admin/editorial-workflows";
}

function getChangedFields(item: EditorialWorkflowItem) {
  return item.entityLabel.split("/")[1] ?? item.entityType;
}

function getDefaultRevisionState(item: EditorialWorkflowItem): (typeof revisionStates)[number] {
  if (item.workflowState === "publish_ready") return "Review ready";
  if (item.workflowState === "review") return "Rollback staged";
  return "Published";
}

export function EditorialWorkflowTransitionPanel({ items }: EditorialWorkflowTransitionPanelProps) {
  const router = useRouter();
  const [selectedLabel, setSelectedLabel] = useState(items[0]?.entityLabel ?? "");
  const [editor, setEditor] = useState("Workflow Operator");
  const selectedItem = items.find((item) => item.entityLabel === selectedLabel) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.workflowState} transition from editorial workflows` : "",
  );
  const [reason, setReason] = useState(selectedItem?.note ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(label: string) {
    const nextItem = items.find((item) => item.entityLabel === label);
    if (!nextItem) return;
    setSelectedLabel(label);
    setAction(`Logged ${nextItem.workflowState} transition from editorial workflows`);
    setReason(nextItem.note);
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
          asset: selectedItem.entityLabel,
          assetType: selectedItem.entityType.replaceAll("_", " "),
          editor,
          action,
          changedFields: getChangedFields(selectedItem),
          reason,
          revisionState,
          routeTarget: getWorkflowRouteTarget(selectedItem),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to log workflow transition into the revision lane.");
      }

      setMessage("Saved a write-through editorial workflow revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to log workflow transition into the revision lane.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through workflow transition</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Capture a real revision row when an editorial entity moves through draft, review, or publish-ready checkpoints instead of keeping workflow state as static queue copy.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Workflow item</span>
            <select
              value={selectedLabel}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.entityLabel} value={item.entityLabel} className="bg-slate-950">
                  {item.entityLabel} · {item.workflowState}
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
              value={selectedItem ? getWorkflowRouteTarget(selectedItem) : ""}
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
            <span>Assigned to</span>
            <input
              value={selectedItem?.assignedTo ?? ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Reviewer</span>
            <input
              value={selectedItem?.reviewer ?? ""}
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
            {pending ? "Logging…" : "Write workflow revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the editorial-workflows desk instead of leaving workflow movement as static sample state."}
          </p>
        </div>
      </div>
    </div>
  );
}
