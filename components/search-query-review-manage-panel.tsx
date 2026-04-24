"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SearchQueryReviewManagePanelProps = {
  items: Array<{
    query: string;
    status: string;
    owner: string;
    sourceZeroResultCount: number;
  }>;
};

export function SearchQueryReviewManagePanel({ items }: SearchQueryReviewManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  async function removeReview(query: string) {
    setPendingQuery(query);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/search-query-reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove search query review.");
      }

      setMessage(`Removed ${query} from the search-query review backlog.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove search query review.");
    } finally {
      setPendingQuery(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage query reviews</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove resolved or stale review rows so the zero-result backlog stays like a working queue instead of an append-only memory list.
          </p>
        </div>
        <div className="grid gap-3">
          {items.length ? (
            items.map((item) => (
              <div key={item.query} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.query}</p>
                  <p className="mt-1 text-xs text-mist/60">
                    {item.status} · {item.owner} · {item.sourceZeroResultCount} zero-result signals
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeReview(item.query)}
                  disabled={pendingQuery === item.query}
                  className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingQuery === item.query ? "Removing…" : "Remove"}
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
              No review rows yet. Save one from the tracked query list when repeated zero-result or weak-result searches need alias, route, or indexing follow-up.
            </div>
          )}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the search-review backlog small enough to act on instead of letting it become another passive dashboard."}
        </p>
      </div>
    </div>
  );
}
