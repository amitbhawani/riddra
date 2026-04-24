"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type RollbackScenarioOption = {
  asset: string;
  change: string;
  queueState: "Ready" | "Needs approval" | "Needs source reset";
};

type RollbackScenarioActionPanelProps = {
  items: RollbackScenarioOption[];
};

const queueStates = ["Ready", "Needs approval", "Needs source reset"] as const;

export function RollbackScenarioActionPanel({ items }: RollbackScenarioActionPanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [selectedKey, setSelectedKey] = useState(initialItem ? `${initialItem.asset}__${initialItem.change}` : "");
  const activeItem = useMemo(
    () => items.find((item) => `${item.asset}__${item.change}` === selectedKey) ?? initialItem,
    [initialItem, items, selectedKey],
  );
  const [queueState, setQueueState] = useState<(typeof queueStates)[number]>(activeItem?.queueState ?? "Ready");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveQueueState() {
    if (!activeItem) {
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/rollback-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: activeItem.asset,
          change: activeItem.change,
          queueState,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save rollback queue state.");
      }

      setMessage("Saved rollback queue posture into the editorial memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save rollback queue state.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write rollback queue update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes rollback queue posture into the shared editorial memory store instead of leaving recovery state as read-only snapshots.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Scenario</span>
            <select
              value={selectedKey}
              onChange={(event) => {
                const nextKey = event.target.value;
                const nextItem = items.find((item) => `${item.asset}__${item.change}` === nextKey);
                setSelectedKey(nextKey);
                setQueueState(nextItem?.queueState ?? "Ready");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={`${item.asset}__${item.change}`} value={`${item.asset}__${item.change}`} className="bg-slate-950">
                  {item.asset} · {item.change}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Queue state</span>
            <select value={queueState} onChange={(event) => setQueueState(event.target.value as (typeof queueStates)[number])} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20">
              {queueStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveQueueState} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Saving…" : "Save rollback state"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same rollback lane used by the revision and rollback admin desks."}</p>
        </div>
      </div>
    </div>
  );
}
