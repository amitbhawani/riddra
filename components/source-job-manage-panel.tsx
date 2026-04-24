"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SourceJobManagePanelProps = {
  items: Array<{
    adapter: string;
    status: string;
    domain: string;
  }>;
};

export function SourceJobManagePanel({ items }: SourceJobManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAdapter, setPendingAdapter] = useState<string | null>(null);

  async function removeAdapter(adapter: string) {
    setPendingAdapter(adapter);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/source-jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapter }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove source-job adapter.");
      }

      setMessage(`Removed ${adapter} from the source-job backend lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove source-job adapter.");
    } finally {
      setPendingAdapter(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage source-job adapters</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale adapter rows from the shared queue when the backend handoff changes and this lane needs cleanup, not only more queue appends.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.adapter}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.adapter}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.status} · {item.domain}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAdapter(item.adapter)}
                disabled={pendingAdapter === item.adapter}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAdapter === item.adapter ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the source-job queue from staying append-only after create, update, and run flows."}
        </p>
      </div>
    </div>
  );
}
