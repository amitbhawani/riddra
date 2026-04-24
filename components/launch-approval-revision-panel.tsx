"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type LaunchApprovalItem = {
  owner: string;
  lane: string;
  status: "Approved" | "Pending";
  detail: string;
};

type LaunchApprovalRevisionPanelProps = {
  items: LaunchApprovalItem[];
};

function getDefaultRevisionState(status: LaunchApprovalItem["status"]): (typeof revisionStates)[number] {
  return status === "Approved" ? "Published" : "Review ready";
}

function getRouteTarget(item: LaunchApprovalItem) {
  if (item.owner === "Engineering") return "/admin/auth-activation";
  if (item.owner === "Payments owner") return "/admin/payment-readiness";
  if (item.owner === "Growth / communications") return "/admin/announcement-readiness";
  if (item.owner === "Support / operations") return "/admin/support-ops";
  if (item.owner === "Product owner") return "/build-tracker";
  return "/admin/launch-approvals";
}

function getAssetLabel(item: LaunchApprovalItem) {
  return `${item.owner}: ${item.lane}`;
}

export function LaunchApprovalRevisionPanel({ items }: LaunchApprovalRevisionPanelProps) {
  const router = useRouter();
  const [selectedLabel, setSelectedLabel] = useState(items[0] ? getAssetLabel(items[0]) : "");
  const [editor, setEditor] = useState("Launch Approval Operator");
  const selectedItem = items.find((item) => getAssetLabel(item) === selectedLabel) ?? items[0];
  const [action, setAction] = useState(
    selectedItem ? `Logged ${selectedItem.owner.toLowerCase()} approval mutation from launch approvals` : "",
  );
  const [changedFields, setChangedFields] = useState("approval_state, launch_lane, owner_signoff");
  const [reason, setReason] = useState(selectedItem?.detail ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedItem ? getDefaultRevisionState(selectedItem.status) : "Review ready",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(label: string) {
    const nextItem = items.find((item) => getAssetLabel(item) === label);
    if (!nextItem) return;
    setSelectedLabel(label);
    setAction(`Logged ${nextItem.owner.toLowerCase()} approval mutation from launch approvals`);
    setChangedFields("approval_state, launch_lane, owner_signoff");
    setReason(nextItem.detail);
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
          asset: getAssetLabel(selectedItem),
          assetType: "launch approval lane",
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
        throw new Error(payload.error ?? "Unable to record launch-approval revision.");
      }

      setMessage("Saved a write-through launch-approval revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record launch-approval revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through approval action</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log owner signoff changes into the shared revision lane so launch approvals stop living only as a static review board.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Approval lane</span>
            <select
              value={selectedLabel}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => {
                const label = getAssetLabel(item);
                return (
                  <option key={label} value={label} className="bg-slate-950">
                    {label} · {item.status}
                  </option>
                );
              })}
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
              value={selectedItem ? getRouteTarget(selectedItem) : ""}
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
            {pending ? "Saving…" : "Write approval revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from launch approvals instead of leaving owner signoff changes as static board copy."}
          </p>
        </div>
      </div>
    </div>
  );
}
