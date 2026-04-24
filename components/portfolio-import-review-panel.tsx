"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewItem = {
  importedValue: string;
  suggestedMatch: string;
  issue: string;
  action: string;
  decisionState?: "Pending" | "Accepted" | "Manual review";
};

export function PortfolioImportReviewPanel({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  async function updateDecision(item: ReviewItem, key: string, value: "Accepted" | "Manual review" | "Pending") {
    setStatus((current) => ({ ...current, [key]: "Saving..." }));

    const response = await fetch("/api/portfolio/review-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importedValue: item.importedValue,
        issue: item.issue,
        decisionState: value,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus((current) => ({ ...current, [key]: payload?.error ?? "Unable to save decision." }));
      return;
    }

    setDecisions((current) => ({ ...current, [key]: value }));
    setStatus((current) => ({ ...current, [key]: "Saved to the file-backed review queue." }));
    router.refresh();
  }

  async function dismissRow(item: ReviewItem, key: string) {
    setStatus((current) => ({ ...current, [key]: "Removing..." }));

    const response = await fetch("/api/portfolio/review-queue", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importedValue: item.importedValue,
        issue: item.issue,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus((current) => ({ ...current, [key]: payload?.error ?? "Unable to remove row." }));
      return;
    }

    setStatus((current) => ({ ...current, [key]: "Removed from the file-backed review queue." }));
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const key = `${item.importedValue}-${item.issue}`;
        const decision = decisions[key] ?? item.decisionState ?? "Pending";

        return (
          <div key={key} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-white">{item.importedValue}</p>
              <div className="rounded-full bg-sky/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sky">
                {decision}
              </div>
            </div>
            <p className="mt-3 text-sm text-mist/68">
              Suggested match: <span className="text-white">{item.suggestedMatch}</span>
            </p>
            <p className="mt-3 text-sm leading-7 text-mist/76">{item.issue}</p>
            <p className="mt-3 text-sm leading-7 text-aurora">{item.action}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateDecision(item, key, "Accepted")}
                className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-500/15"
              >
                Accept match
              </button>
              <button
                type="button"
                onClick={() => updateDecision(item, key, "Manual review")}
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Edit manually
              </button>
              <button
                type="button"
                onClick={() => updateDecision(item, key, "Pending")}
                className="rounded-full border border-bloom/30 bg-bloom/10 px-4 py-2 text-sm text-white transition hover:border-bloom/40 hover:bg-bloom/15"
              >
                Skip row
              </button>
              <button
                type="button"
                onClick={() => dismissRow(item, key)}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Remove row
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-mist/55">
              {status[key] ?? "This now writes review decisions into the file-backed import queue instead of only updating local component state."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
