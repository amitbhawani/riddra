"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BrokerTarget = {
  brokerName: string;
  status: string;
  tokenState: string;
  syncMode: string;
};

export function BrokerTargetManagePanel({ targets }: { targets: BrokerTarget[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  async function removeTarget(brokerName: string) {
    setPendingTarget(brokerName);
    setMessage(null);

    try {
      const response = await fetch("/api/account/brokers/targets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokerName }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove broker target.");
      }

      setMessage(`Removed ${brokerName} from the broker rollout targets.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove broker target.");
    } finally {
      setPendingTarget(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Manage broker targets</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale broker rollout targets from the same file-backed broker-sync lane instead of letting preview targets grow without state management.
          </p>
        </div>
        <div className="grid gap-3">
          {targets.length > 0 ? (
            targets.map((item) => (
              <div key={item.brokerName} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.brokerName}</p>
                  <p className="mt-1 text-xs text-mist/60">
                    {item.status} · {item.tokenState} · {item.syncMode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeTarget(item.brokerName)}
                  disabled={pendingTarget === item.brokerName}
                  className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingTarget === item.brokerName ? "Removing…" : "Remove"}
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-mist/72">
              No broker targets have been saved for this account yet.
            </div>
          )}
        </div>
        <p className="text-xs leading-6 text-mist/60">{message ?? "Keeps the broker rollout lane from behaving like append-only preview memory."}</p>
      </div>
    </div>
  );
}
