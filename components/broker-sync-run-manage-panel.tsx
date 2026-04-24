"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BrokerSyncRun = {
  broker: string;
  queueState: string;
  accountScope: string;
  nextWindow: string;
};

export function BrokerSyncRunManagePanel({ runs }: { runs: BrokerSyncRun[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function removeRun(broker: string, accountScope: string) {
    const key = `${broker}-${accountScope}`;
    setPendingKey(key);
    setMessage(null);

    try {
      const response = await fetch("/api/account/brokers/runs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker, accountScope }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove broker sync run.");
      }

      setMessage(`Removed ${broker} for ${accountScope} from the broker sync history.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove broker sync run.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Manage sync runs</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale sync-window rows from the shared broker-sync store when queue history needs cleanup instead of only more appended runs.
          </p>
        </div>
        <div className="grid gap-3">
          {runs.length > 0 ? (
            runs.map((item) => {
              const key = `${item.broker}-${item.accountScope}`;
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.broker}</p>
                    <p className="mt-1 text-xs text-mist/60">
                      {item.queueState} · {item.accountScope} · {item.nextWindow}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRun(item.broker, item.accountScope)}
                    disabled={pendingKey === key}
                    className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingKey === key ? "Removing…" : "Remove"}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-mist/72">
              No sync runs have been recorded for this account yet.
            </div>
          )}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the broker sync-run lane from behaving like append-only preview memory after create and review flows."}
        </p>
      </div>
    </div>
  );
}
