"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  LaunchEvidenceActionItem,
  LaunchEvidenceActionStatus,
} from "@/lib/launch-evidence-action-memory-store";

type LaunchEvidenceActionPanelProps = {
  items: LaunchEvidenceActionItem[];
};

const actionStatuses = [
  "Not started",
  "Working",
  "Captured",
  "Needs refresh",
] as const;

export function LaunchEvidenceActionPanel({
  items,
}: LaunchEvidenceActionPanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [itemId, setItemId] = useState(initialItem?.id ?? "");
  const activeItem = useMemo(
    () => items.find((item) => item.id === itemId) ?? initialItem,
    [initialItem, itemId, items],
  );
  const [actionStatus, setActionStatus] = useState<LaunchEvidenceActionStatus>(
    activeItem?.actionStatus ?? "Not started",
  );
  const [owner, setOwner] = useState(activeItem?.owner ?? "");
  const [proof, setProof] = useState(activeItem?.proof ?? "");
  const [nextStep, setNextStep] = useState(activeItem?.nextStep ?? "");
  const [operatorNote, setOperatorNote] = useState(activeItem?.operatorNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveAction() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/launch-evidence-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          actionStatus,
          owner,
          proof,
          nextStep,
          operatorNote,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save launch evidence action.");
      }

      setMessage("Saved launch-evidence ownership, proof, and next-step posture.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save launch evidence action.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      id="launch-evidence-action-panel"
      className="rounded-[24px] border border-white/8 bg-black/15 p-5"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Write launch evidence action
          </h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Record who owns the proof lane, what evidence exists, and what must
            happen next before this can count as real launch verification.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Evidence lane</span>
            <select
              value={itemId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextItem = items.find((item) => item.id === nextId);
                setItemId(nextId);
                setActionStatus(nextItem?.actionStatus ?? "Not started");
                setOwner(nextItem?.owner ?? "");
                setProof(nextItem?.proof ?? "");
                setNextStep(nextItem?.nextStep ?? "");
                setOperatorNote(nextItem?.operatorNote ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-950">
                  {item.lane} • {item.label}
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
                  event.target.value as LaunchEvidenceActionStatus,
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
              placeholder="QA, Launch Ops, Growth, Data, or a named owner"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Proof</span>
            <textarea
              value={proof}
              onChange={(event) => setProof(event.target.value)}
              placeholder="Paste the proof: deployment URL, screenshot note, query set, run result, or operator verification summary"
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
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
              value={operatorNote}
              onChange={(event) => setOperatorNote(event.target.value)}
              placeholder="Call out what is still blocked, stale, or unverified"
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        {activeItem ? (
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm leading-7 text-mist/72">
            <p className="text-xs uppercase tracking-[0.16em] text-mist/52">
              Current evidence context
            </p>
            <p className="mt-2 text-white">
              {activeItem.status} • {activeItem.source}
            </p>
            <p className="mt-2">{activeItem.note}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveAction}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save evidence action"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ??
              "Saves owner, proof, and follow-up state into the shared launch-evidence action store."}
          </p>
        </div>
      </div>
    </div>
  );
}
