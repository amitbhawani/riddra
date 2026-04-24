"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const statuses = ["Priority", "Planned", "Later"] as const;
const tokenStates = ["Pending token", "Sandbox token", "Review required"] as const;
const syncModes = ["CSV fallback", "Approval-first API sync", "Manual review queue"] as const;

export function BrokerTargetCreatePanel() {
  const router = useRouter();
  const [brokerName, setBrokerName] = useState("Groww");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Planned");
  const [tokenState, setTokenState] = useState<(typeof tokenStates)[number]>("Pending token");
  const [syncMode, setSyncMode] = useState<(typeof syncModes)[number]>("Manual review queue");
  const [note, setNote] = useState("Track this broker as the next adapter candidate while CSV fallback remains available.");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function storageLabel(storageMode?: string | null) {
    return storageMode === "supabase_private_beta"
      ? "shared private-beta broker lane"
      : "fallback broker-sync store";
  }

  async function createTarget() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/brokers/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokerName, status, tokenState, syncMode, note }),
      });
      const payload = (await response.json()) as { error?: string; storageMode?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create broker target.");
      }

      setMessage(`Broker target written to the ${storageLabel(payload.storageMode)}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create broker target.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Create broker target</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Append a new broker rollout target into the shared broker-sync memory lane instead of limiting coverage to the starter roadmap cards.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Broker name</span>
            <input
              value={brokerName}
              onChange={(event) => setBrokerName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {statuses.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Token state</span>
            <select
              value={tokenState}
              onChange={(event) => setTokenState(event.target.value as (typeof tokenStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {tokenStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Sync mode</span>
            <select
              value={syncMode}
              onChange={(event) => setSyncMode(event.target.value as (typeof syncModes)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {syncModes.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Operator note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={createTarget}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create broker target"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "This now appends broker rollout targets into the same persisted broker lane used by sync runs and review items."}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs leading-6 text-mist/60">
          Existing broker targets can now also be removed from the broker rollout lane from the cards on the main broker page.
        </div>
      </div>
    </div>
  );
}
