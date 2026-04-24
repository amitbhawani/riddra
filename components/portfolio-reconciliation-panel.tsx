"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { PortfolioImportReviewMemoryItem, PortfolioImportRun, PortfolioReconciliationRecord } from "@/lib/portfolio-memory-store";

type PortfolioReconciliationPanelProps = {
  runs: PortfolioImportRun[];
  reviewQueue: PortfolioImportReviewMemoryItem[];
  reconciliations: PortfolioReconciliationRecord[];
};

function buildRunKey(fileName: string, createdAt: string) {
  return `${fileName}::${createdAt}`;
}

export function PortfolioReconciliationPanel({
  runs,
  reviewQueue,
  reconciliations,
}: PortfolioReconciliationPanelProps) {
  const router = useRouter();
  const [selectedRunKey, setSelectedRunKey] = useState(
    runs[0] ? buildRunKey(runs[0].fileName, runs[0].createdAt) : "",
  );
  const [note, setNote] = useState("User reviewed the current mismatch queue before the next holdings save.");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reconciliationPreview = useMemo(() => {
    return reviewQueue.reduce(
      (summary, item) => {
        if (item.decisionState === "Accepted") {
          summary.accepted += 1;
        } else if (item.decisionState === "Manual review") {
          summary.manualReview += 1;
        } else {
          summary.pending += 1;
        }

        return summary;
      },
      { accepted: 0, manualReview: 0, pending: 0 },
    );
  }, [reviewQueue]);

  async function submitCheckpoint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRunKey) {
      setMessage("Choose an import run before saving a checkpoint.");
      return;
    }

    const [fileName, createdAt] = selectedRunKey.split("::");
    setPending(true);
    setMessage("Queueing reconciliation checkpoint...");

    try {
      const response = await fetch("/api/portfolio/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          createdAt,
          note,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; job?: { id?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to queue reconciliation checkpoint.");
      }

      setMessage(
        payload?.job?.id
          ? `Queued reconciliation checkpoint job ${payload.job.id}.`
          : "Queued a durable reconciliation checkpoint job.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue reconciliation checkpoint.");
    } finally {
      setPending(false);
    }
  }

  const latestCheckpoint = reconciliations[0];

  return (
    <form onSubmit={submitCheckpoint} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <h3 className="text-base font-semibold text-white">Save reconciliation checkpoint</h3>
      <p className="mt-2 text-sm leading-7 text-mist/72">
        Persist a user-confirmed checkpoint for the current mismatch queue so reconciliation history becomes a real backend record instead of only scattered row updates.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Accepted</p>
          <p className="mt-2 text-2xl font-semibold text-white">{reconciliationPreview.accepted}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Manual review</p>
          <p className="mt-2 text-2xl font-semibold text-white">{reconciliationPreview.manualReview}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Still pending</p>
          <p className="mt-2 text-2xl font-semibold text-white">{reconciliationPreview.pending}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <select
          value={selectedRunKey}
          onChange={(event) => setSelectedRunKey(event.target.value)}
          disabled={runs.length === 0 || pending}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
        >
          {runs.length === 0 ? (
            <option value="">No import runs available yet</option>
          ) : (
            runs.map((run) => (
              <option key={buildRunKey(run.fileName, run.createdAt)} value={buildRunKey(run.fileName, run.createdAt)}>
                {run.fileName} · {run.sourceLabel} · {run.status}
              </option>
            ))
          )}
        </select>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          disabled={pending}
          className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-white placeholder:text-mist/40"
          placeholder="Add the operator note you want to keep with this reconciliation checkpoint."
        />
      </div>

      {latestCheckpoint ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
          <p className="text-sm font-medium text-white">Latest checkpoint</p>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            {latestCheckpoint.fileName} · {latestCheckpoint.acceptedRows} accepted · {latestCheckpoint.manualReviewRows} manual review ·{" "}
            {latestCheckpoint.pendingRows} pending · {latestCheckpoint.status}
          </p>
          <p className="mt-2 text-sm leading-7 text-mist/66">
            {latestCheckpoint.checkpointKind} · {latestCheckpoint.unresolvedBefore} unresolved before checkpoint ·{" "}
            {latestCheckpoint.unresolvedAfter} unresolved after checkpoint · resolved {latestCheckpoint.resolvedDelta} rows
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-mist/60">
          {message ??
            "This stores a durable reconciliation checkpoint in the same portfolio lane that already persists import runs, review rows, manual drafts, and activity history."}
        </p>
        <button
          type="submit"
          disabled={pending || runs.length === 0}
          className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Queueing checkpoint…" : "Queue checkpoint"}
        </button>
      </div>
    </form>
  );
}
