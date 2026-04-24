"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const reviewStates = ["Needs approval", "Review manually", "Keep existing"] as const;

export function BrokerReviewItemCreatePanel() {
  const router = useRouter();
  const [broker, setBroker] = useState("Groww");
  const [issue, setIssue] = useState("Imported holding still needs canonical symbol and quantity verification.");
  const [action, setAction] = useState("Keep the row in approval-first review until the holding maps cleanly against the saved portfolio.");
  const [reviewState, setReviewState] = useState<(typeof reviewStates)[number]>("Needs approval");
  const [queueLane, setQueueLane] = useState("Canonical holding verification");
  const [sourceRef, setSourceRef] = useState("sync_run_groww_preview_001");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function storageLabel(storageMode?: string | null) {
    return storageMode === "supabase_private_beta"
      ? "shared private-beta broker lane"
      : "fallback broker-sync store";
  }

  async function createReviewItem() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/brokers/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker, issue, action, reviewState, queueLane, sourceRef }),
      });
      const payload = (await response.json()) as { error?: string; storageMode?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create broker review item.");
      }

      setMessage(`Broker review row written through the unified broker review route into the ${storageLabel(payload.storageMode)}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create broker review item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Create broker review row</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Append a new approval-first broker review item so sync verification is not limited to the starter queue examples.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Broker</span>
            <input
              value={broker}
              onChange={(event) => setBroker(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Review state</span>
            <select
              value={reviewState}
              onChange={(event) => setReviewState(event.target.value as (typeof reviewStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {reviewStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Issue</span>
            <textarea
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Recommended action</span>
            <textarea
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Queue lane</span>
            <input
              value={queueLane}
              onChange={(event) => setQueueLane(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Source ref</span>
            <input
              value={sourceRef}
              onChange={(event) => setSourceRef(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={createReviewItem}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create review row"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "This now appends broker review rows into the same persisted queue used by sync approvals."}</p>
        </div>
      </div>
    </div>
  );
}
