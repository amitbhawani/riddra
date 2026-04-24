"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RollbackScenarioManageItem = {
  id: string;
  asset: string;
  change: string;
  queueState: string;
};

export function RollbackScenarioManagePanel({ items }: { items: RollbackScenarioManageItem[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function removeScenario(id: string, label: string) {
    setPendingId(id);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/rollback-center", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove rollback scenario.");
      }

      setMessage(`Removed ${label} from the rollback-scenario lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove rollback scenario.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Manage rollback scenarios</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale recovery rows from the shared editorial rollback lane when the queue needs cleanup instead of only more appended scenarios.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.asset}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.change} · {item.queueState}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeScenario(item.id, item.asset)}
                disabled={pendingId === item.id}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingId === item.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the rollback-scenario lane from behaving like append-only preview memory after create and queue-state updates."}
        </p>
      </div>
    </div>
  );
}
