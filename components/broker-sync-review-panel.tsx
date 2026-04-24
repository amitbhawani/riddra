"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncReviewItem = {
  broker: string;
  issue: string;
  action: string;
  reviewState?: string;
  queueLane?: string;
  sourceRef?: string;
};

export function BrokerSyncReviewPanel({ items }: { items: SyncReviewItem[] }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  function storageLabel(storageMode?: string | null) {
    return storageMode === "supabase_private_beta"
      ? "shared private-beta broker lane"
      : "fallback broker-sync store";
  }

  async function saveDecision(item: SyncReviewItem, key: string, value: "Needs approval" | "Review manually" | "Keep existing") {
    setStatus((current) => ({ ...current, [key]: "Saving..." }));

    const response = await fetch("/api/account/brokers/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broker: item.broker,
        issue: item.issue,
        reviewState: value,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          storageMode?: string;
        }
      | null;

    if (!response.ok) {
      setStatus((current) => ({ ...current, [key]: payload?.error ?? "Unable to save broker review decision." }));
      return;
    }

    setDecisions((current) => ({ ...current, [key]: value }));
    setStatus((current) => ({
      ...current,
      [key]: `Saved to the ${storageLabel(payload?.storageMode)}. No live broker sync was triggered yet.`,
    }));
    router.refresh();
  }

  async function removeReviewItem(item: SyncReviewItem, key: string) {
    setStatus((current) => ({ ...current, [key]: "Removing..." }));

    const response = await fetch("/api/account/brokers/review", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broker: item.broker,
        issue: item.issue,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          storageMode?: string;
        }
      | null;

    if (!response.ok) {
      setStatus((current) => ({ ...current, [key]: payload?.error ?? "Unable to remove broker review row." }));
      return;
    }

    setStatus((current) => ({
      ...current,
      [key]: `Removed from the ${storageLabel(payload?.storageMode)}.`,
    }));
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const key = `${item.broker}-${item.issue}`;
        const decision = decisions[key] ?? item.reviewState ?? "Needs approval";

        return (
          <div key={key} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">{item.broker}</h3>
                <span className="inline-flex rounded-full border border-amber-300/18 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100/88">
                  Persisted review state
                </span>
              </div>
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                {decision}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-mist/74">{item.issue}</p>
            <p className="mt-3 text-sm leading-7 text-aurora">{item.action}</p>
            {item.queueLane ? (
              <p className="mt-3 text-xs leading-6 text-mist/55">
                Queue lane: {item.queueLane}
                {item.sourceRef ? ` · Source ref: ${item.sourceRef}` : ""}
              </p>
            ) : null}
            <p className="mt-3 text-xs leading-6 text-mist/55">
              This decision now persists in the broker review queue for the signed-in account. It still does not trigger a live broker sync or overwrite saved holdings yet.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => saveDecision(item, key, "Needs approval")}
                className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-500/15"
              >
                Approve sync
              </button>
              <button
                type="button"
                onClick={() => saveDecision(item, key, "Review manually")}
                className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Review manually
              </button>
              <button
                type="button"
                onClick={() => saveDecision(item, key, "Keep existing")}
                className="rounded-full border border-bloom/30 bg-bloom/10 px-4 py-2 text-sm text-white transition hover:border-bloom/40 hover:bg-bloom/15"
              >
                Keep existing data
              </button>
              <button
                type="button"
                onClick={() => removeReviewItem(item, key)}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Remove row
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-mist/55">
              {status[key] ??
                "This now writes broker review decisions into the persisted broker queue for the signed-in account instead of only changing local component state."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
