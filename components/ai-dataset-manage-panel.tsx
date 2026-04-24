"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AiDatasetManagePanelProps = {
  items: Array<{
    source: string;
    role: string;
    status: string;
  }>;
};

export function AiDatasetManagePanel({ items }: AiDatasetManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<string | null>(null);

  async function removeDataset(source: string) {
    setPendingSource(source);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-datasets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove AI dataset.");
      }

      setMessage(`Removed ${source} from the AI dataset lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove AI dataset.");
    } finally {
      setPendingSource(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage retrieval datasets</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale grounded datasets from the shared AI memory lane instead of letting knowledge coverage grow as append-only preview memory.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.source} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{item.source}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.role} · {item.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeDataset(item.source)}
                disabled={pendingSource === item.source}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingSource === item.source ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">{message ?? "Keeps the AI retrieval lane from staying append-only after create and update flows."}</p>
      </div>
    </div>
  );
}
