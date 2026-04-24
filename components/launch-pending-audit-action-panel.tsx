"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  LaunchPendingAuditActionItem,
  LaunchPendingAuditActionStatus,
} from "@/lib/launch-pending-audit-action-memory-store";

type LaunchPendingAuditActionPanelProps = {
  items: LaunchPendingAuditActionItem[];
};

const actionStatuses = ["Open", "Working", "Waiting", "Closed"] as const;

export function LaunchPendingAuditActionPanel({
  items,
}: LaunchPendingAuditActionPanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [itemId, setItemId] = useState(initialItem?.id ?? "");
  const activeItem = useMemo(
    () => items.find((item) => item.id === itemId) ?? initialItem,
    [initialItem, itemId, items],
  );
  const [actionStatus, setActionStatus] = useState<LaunchPendingAuditActionStatus>(
    activeItem?.actionStatus ?? "Open",
  );
  const [owner, setOwner] = useState(activeItem?.owner ?? "");
  const [nextStep, setNextStep] = useState(activeItem?.nextStep ?? "");
  const [note, setNote] = useState(activeItem?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveAction() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/launch-pending-audit/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          actionStatus,
          owner,
          nextStep,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save launch backlog action.");
      }

      setMessage("Saved launch-backlog action ownership and next-step posture.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save launch backlog action.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      id="launch-action-panel"
      className="rounded-[24px] border border-white/8 bg-black/15 p-5"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Write launch-backlog action
          </h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This turns the top-100 audit into a working lane with ownership,
            active state, and a concrete next step instead of leaving it as a
            read-only backlog export.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Pending item</span>
            <select
              value={itemId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextItem = items.find((item) => item.id === nextId);
                setItemId(nextId);
                setActionStatus(nextItem?.actionStatus ?? "Open");
                setOwner(nextItem?.owner ?? "");
                setNextStep(nextItem?.nextStep ?? "");
                setNote(nextItem?.note ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-950">
                  {item.perspective} • {item.lane} • {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Action status</span>
            <select
              value={actionStatus}
              onChange={(event) =>
                setActionStatus(
                  event.target.value as LaunchPendingAuditActionStatus,
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {actionStatuses.map((status) => (
                <option key={status} value={status} className="bg-slate-950">
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Owner</span>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Growth, data, auth, content, or an owner name"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next step</span>
            <textarea
              value={nextStep}
              onChange={(event) => setNextStep(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Operator note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What is actually blocked, what changed, or what must happen next"
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        {activeItem ? (
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm leading-7 text-mist/72">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/52">
              Current audit context
            </p>
            <p className="mt-2 text-white">
              {activeItem.status} • {activeItem.perspective} • {activeItem.source}
            </p>
            <p className="mt-2">{activeItem.detail}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveAction}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save backlog action"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ??
              "Saves owner and working state into the shared launch-backlog action store."}
          </p>
        </div>
      </div>
    </div>
  );
}
