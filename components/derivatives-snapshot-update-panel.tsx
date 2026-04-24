"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DerivativesSnapshotOption = {
  symbol: string;
  expiry: string;
  snapshotState: "Preview snapshot" | "Analytics ready" | "Awaiting source";
  strikeWindow: string;
  nextRefresh: string;
  note: string;
};

type DerivativesSnapshotUpdatePanelProps = {
  items: DerivativesSnapshotOption[];
};

const snapshotStates = ["Preview snapshot", "Analytics ready", "Awaiting source"] as const;

export function DerivativesSnapshotUpdatePanel({ items }: DerivativesSnapshotUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [key, setKey] = useState(`${initialItem?.symbol}::${initialItem?.expiry}`);
  const activeItem = useMemo(
    () => items.find((item) => `${item.symbol}::${item.expiry}` === key) ?? initialItem,
    [initialItem, items, key],
  );
  const [snapshotState, setSnapshotState] = useState<(typeof snapshotStates)[number]>(activeItem?.snapshotState ?? "Preview snapshot");
  const [strikeWindow, setStrikeWindow] = useState(activeItem?.strikeWindow ?? "");
  const [nextRefresh, setNextRefresh] = useState(activeItem?.nextRefresh ?? "");
  const [note, setNote] = useState(activeItem?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveSnapshot() {
    if (!activeItem) return;
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/derivatives-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: activeItem.symbol,
          expiry: activeItem.expiry,
          snapshotState,
          strikeWindow,
          nextRefresh,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save derivatives snapshot.");
      }

      setMessage("Saved derivatives snapshot posture into the backend memory lane.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save derivatives snapshot.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write derivatives snapshot update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes expiry, strike-window, and snapshot posture into the derivatives store instead of leaving the chain lane as read-only preview memory.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Snapshot</span>
            <select
              value={key}
              onChange={(event) => {
                const nextKey = event.target.value;
                const nextItem = items.find((item) => `${item.symbol}::${item.expiry}` === nextKey);
                setKey(nextKey);
                setSnapshotState(nextItem?.snapshotState ?? "Preview snapshot");
                setStrikeWindow(nextItem?.strikeWindow ?? "");
                setNextRefresh(nextItem?.nextRefresh ?? "");
                setNote(nextItem?.note ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={`${item.symbol}::${item.expiry}`} value={`${item.symbol}::${item.expiry}`} className="bg-slate-950">
                  {item.symbol} · {item.expiry}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Snapshot state</span>
            <select
              value={snapshotState}
              onChange={(event) => setSnapshotState(event.target.value as (typeof snapshotStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {snapshotStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Strike window</span>
            <input
              value={strikeWindow}
              onChange={(event) => setStrikeWindow(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Next refresh</span>
            <input
              value={nextRefresh}
              onChange={(event) => setNextRefresh(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveSnapshot}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save derivatives snapshot"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same derivatives lane used by Market Data Ops, Trader Workstation, and Option Chain."}</p>
        </div>
      </div>
    </div>
  );
}
