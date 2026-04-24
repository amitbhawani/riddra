"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarketHistoryManagePanelProps = {
  items: Array<{
    lane: string;
    status: string;
    retainedSeries: number;
  }>;
};

export function MarketHistoryManagePanel({ items }: MarketHistoryManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingLane, setPendingLane] = useState<string | null>(null);

  async function removeLane(lane: string) {
    setPendingLane(lane);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/market-history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lane }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove market-history lane.");
      }

      setMessage(`Removed ${lane} from the market-history backend lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove market-history lane.");
    } finally {
      setPendingLane(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage market-history lanes</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale history-retention rows from the shared store when this desk needs correction instead of more append-only backend planning.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.lane}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.lane}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.status} · {item.retainedSeries} retained series
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeLane(item.lane)}
                disabled={pendingLane === item.lane}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingLane === item.lane ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the market-history lane from staying append-only after create and update flows."}
        </p>
      </div>
    </div>
  );
}
