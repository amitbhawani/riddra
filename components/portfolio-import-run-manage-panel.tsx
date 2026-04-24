"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PortfolioImportRun } from "@/lib/portfolio-memory-store";

type PortfolioImportRunManagePanelProps = {
  items: PortfolioImportRun[];
};

export function PortfolioImportRunManagePanel({ items }: PortfolioImportRunManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function removeImportRun(fileName: string, createdAt: string) {
    const key = `${fileName}-${createdAt}`;
    setPendingKey(key);
    setMessage(null);

    try {
      const response = await fetch("/api/portfolio/import-runs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, createdAt }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove import run.");
      }

      setMessage(`Removed ${fileName} from the persisted import history.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove import run.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Manage import history</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale import-run rows from the shared portfolio memory store when import history needs cleanup instead of only more appended preview runs.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => {
            const key = `${item.fileName}-${item.createdAt}`;
            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.fileName}</p>
                  <p className="mt-1 text-xs text-mist/60">
                    {item.sourceLabel} · {item.status} · {item.importedRows} imported · {item.unresolvedRows} unresolved
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeImportRun(item.fileName, item.createdAt)}
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
          {message ?? "Keeps the portfolio import-history lane from behaving like append-only preview memory after create and review flows."}
        </p>
      </div>
    </div>
  );
}
