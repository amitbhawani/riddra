"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DerivativesSnapshotManagePanelProps = {
  items: Array<{
    symbol: string;
    expiry: string;
    snapshotState: string;
  }>;
};

export function DerivativesSnapshotManagePanel({ items }: DerivativesSnapshotManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function removeSnapshot(symbol: string, expiry: string) {
    const key = `${symbol}-${expiry}`;
    setPendingKey(key);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/derivatives-snapshots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, expiry }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove derivatives snapshot.");
      }

      setMessage(`Removed ${symbol} · ${expiry} from the derivatives snapshot lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove derivatives snapshot.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage derivatives snapshots</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale expiry windows and preview rows from the shared derivatives store when this desk needs cleanup instead of only more snapshot appends.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => {
            const key = `${item.symbol}-${item.expiry}`;
            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.symbol}</p>
                  <p className="mt-1 text-xs text-mist/60">
                    {item.expiry} · {item.snapshotState}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSnapshot(item.symbol, item.expiry)}
                  disabled={pendingKey === key}
                  className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingKey === key ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the derivatives snapshot lane from staying append-only after create and update flows."}
        </p>
      </div>
    </div>
  );
}
