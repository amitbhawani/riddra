"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const confidenceLevels = ["High", "Medium", "Low"] as const;
const decisionStates = ["Pending", "Accepted", "Manual review"] as const;

export function PortfolioReviewItemCreatePanel() {
  const router = useRouter();
  const [importedValue, setImportedValue] = useState("BSE:500112");
  const [suggestedMatch, setSuggestedMatch] = useState("SBIN");
  const [issue, setIssue] = useState("Imported broker code still needs symbol normalization before holdings can be merged.");
  const [action, setAction] = useState("Confirm the exchange mapping and keep the row in review until symbol truth is verified.");
  const [confidence, setConfidence] = useState<(typeof confidenceLevels)[number]>("Medium");
  const [decisionState, setDecisionState] = useState<(typeof decisionStates)[number]>("Pending");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createReviewItem() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/portfolio/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importedValue,
          suggestedMatch,
          issue,
          action,
          confidence,
          decisionState,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create review item.");
      }

      setMessage("Review row created through the unified portfolio review route.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create review item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create review-queue row</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This appends a new mismatch row into the persisted portfolio review queue so reconciliation coverage is not limited to starter import rows.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Imported value</span>
            <input
              value={importedValue}
              onChange={(event) => setImportedValue(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Suggested match</span>
            <input
              value={suggestedMatch}
              onChange={(event) => setSuggestedMatch(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Confidence</span>
            <select
              value={confidence}
              onChange={(event) => setConfidence(event.target.value as (typeof confidenceLevels)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {confidenceLevels.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Decision state</span>
            <select
              value={decisionState}
              onChange={(event) => setDecisionState(event.target.value as (typeof decisionStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {decisionStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Issue</span>
            <textarea
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Recommended action</span>
            <textarea
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={createReviewItem}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create review row"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same file-backed queue used by decision updates and row removals."}</p>
        </div>
      </div>
    </div>
  );
}
