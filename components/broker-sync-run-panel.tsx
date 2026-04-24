"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BrokerSyncRunPanel() {
  const router = useRouter();
  const [broker, setBroker] = useState("Zerodha");
  const [queueState, setQueueState] = useState<"Queued" | "Reviewing" | "Ready to rerun">("Queued");
  const [accountScope, setAccountScope] = useState("Primary investing account");
  const [nextWindow, setNextWindow] = useState("Apr 16, 2026 · 6:30 PM");
  const [note, setNote] = useState("Queue the next broker refresh window and keep the approval-first review queue in sync.");
  const [message, setMessage] = useState<string | null>(null);

  function storageLabel(storageMode?: string | null) {
    return storageMode === "supabase_private_beta"
      ? "shared private-beta broker lane"
      : "fallback broker-sync store";
  }

  async function submitRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving broker sync run...");

    const response = await fetch("/api/account/brokers/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broker,
        queueState,
        accountScope,
        nextWindow,
        note,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          storageMode?: string;
          job?: { id: string };
        }
      | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to save broker sync run.");
      return;
    }

    setMessage(
      payload?.job?.id
        ? `Broker sync queued into Trigger.dev (${payload.job.id}) and written to the ${storageLabel(payload?.storageMode)}.`
        : `Broker sync run written to the ${storageLabel(payload?.storageMode)}.`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={submitRun} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <h3 className="text-base font-semibold text-white">Record broker sync run</h3>
      <p className="mt-2 text-sm leading-7 text-mist/72">
        Queue the next broker refresh window into the persisted sync-run lane so the internal adapter worker can hydrate review-ready broker state.
      </p>
      <div className="mt-4 grid gap-3">
        <input
          value={broker}
          onChange={(event) => setBroker(event.target.value)}
          placeholder="Zerodha"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
        />
        <select
          value={queueState}
          onChange={(event) => setQueueState(event.target.value as "Queued" | "Reviewing" | "Ready to rerun")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
        >
          <option value="Queued">Queued</option>
          <option value="Reviewing">Reviewing</option>
          <option value="Ready to rerun">Ready to rerun</option>
        </select>
        <input
          value={accountScope}
          onChange={(event) => setAccountScope(event.target.value)}
          placeholder="Primary investing account"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
        />
        <input
          value={nextWindow}
          onChange={(event) => setNextWindow(event.target.value)}
          placeholder="Apr 16, 2026 · 6:30 PM"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
        />
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Record the next broker refresh window and keep the approval-first review queue in sync."
          
          className="min-h-28 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-mist/55">
          {message ?? "This creates a new sync-run row, queues Trigger.dev broker execution, and appends broker activity history."}
        </p>
        <button
          type="submit"
          className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          Queue sync run
        </button>
      </div>
    </form>
  );
}
