"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const snapshotStates = ["Preview snapshot", "Analytics ready", "Awaiting source"] as const;

export function DerivativesSnapshotCreatePanel() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [expiry, setExpiry] = useState("");
  const [snapshotState, setSnapshotState] = useState<(typeof snapshotStates)[number]>("Preview snapshot");
  const [strikeWindow, setStrikeWindow] = useState("");
  const [nextRefresh, setNextRefresh] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createSnapshot() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/derivatives-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          expiry,
          snapshotState,
          strikeWindow,
          nextRefresh,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create derivatives snapshot.");
      }

      setMessage("Created a new derivatives snapshot lane through the unified admin route.");
      setSymbol("");
      setExpiry("");
      setSnapshotState("Preview snapshot");
      setStrikeWindow("");
      setNextRefresh("");
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create derivatives snapshot.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create derivatives snapshot</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Add a new expiry-aware chain row so new derivatives contracts can enter the shared backend memory lane.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Symbol</span>
            <input value={symbol} onChange={(event) => setSymbol(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Expiry</span>
            <input value={expiry} onChange={(event) => setExpiry(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Snapshot state</span>
            <select value={snapshotState} onChange={(event) => setSnapshotState(event.target.value as (typeof snapshotStates)[number])} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20">
              {snapshotStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Strike window</span>
            <input value={strikeWindow} onChange={(event) => setStrikeWindow(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next refresh</span>
            <input value={nextRefresh} onChange={(event) => setNextRefresh(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={createSnapshot} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Creating…" : "Create derivatives snapshot"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Appends a new snapshot into the shared derivatives backend store."}</p>
        </div>
      </div>
    </div>
  );
}
