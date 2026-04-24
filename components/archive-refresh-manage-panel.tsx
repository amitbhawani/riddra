"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ArchiveRefreshManagePanelProps = {
  items: Array<{
    family: string;
    status: string;
    sourceClass: string;
  }>;
};

export function ArchiveRefreshManagePanel({ items }: ArchiveRefreshManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingFamily, setPendingFamily] = useState<string | null>(null);

  async function removeFamily(family: string) {
    setPendingFamily(family);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/archive-refresh", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove archive-refresh family.");
      }

      setMessage(`Removed ${family} from the archive-refresh backend lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove archive-refresh family.");
    } finally {
      setPendingFamily(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage archive-refresh families</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale archive families from the shared refresh queue so this desk can correct the official-source plan instead of only appending new rows.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.family}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.family}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.status} · {item.sourceClass}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFamily(item.family)}
                disabled={pendingFamily === item.family}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingFamily === item.family ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the archive-refresh queue from staying append-only after create, update, and run flows."}
        </p>
      </div>
    </div>
  );
}
