"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SourceJobRunOption = {
  adapter: string;
  nextRunWindow: string;
};

type SourceJobRunPanelProps = {
  items: SourceJobRunOption[];
};

const outcomes = ["Succeeded", "Queued", "Needs review"] as const;

export function SourceJobRunPanel({ items }: SourceJobRunPanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [adapter, setAdapter] = useState(initialItem?.adapter ?? "");
  const activeItem = useMemo(() => items.find((item) => item.adapter === adapter) ?? initialItem, [adapter, initialItem, items]);
  const [outcome, setOutcome] = useState<(typeof outcomes)[number]>("Succeeded");
  const [trigger, setTrigger] = useState("Manual operator run");
  const [affectedRows, setAffectedRows] = useState("1");
  const [nextRunWindow, setNextRunWindow] = useState(activeItem?.nextRunWindow ?? "");
  const [resultSummary, setResultSummary] = useState("Operator execution saved during backend closure verification.");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function recordRun() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/source-jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapter,
          outcome,
          trigger,
          affectedRows: Number(affectedRows),
          nextRunWindow,
          resultSummary,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record source-job execution.");
      }

      setMessage("Saved source-job execution into the shared run ledger.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record source-job execution.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Record manual source-job run</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This writes a real execution row into the shared run ledger so adapter backlog and queue edits are paired with explicit run outcomes.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Adapter</span>
            <select
              value={adapter}
              onChange={(event) => {
                const nextAdapter = event.target.value;
                const nextItem = items.find((item) => item.adapter === nextAdapter);
                setAdapter(nextAdapter);
                setNextRunWindow(nextItem?.nextRunWindow ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.adapter} value={item.adapter} className="bg-slate-950">
                  {item.adapter}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Outcome</span>
            <select
              value={outcome}
              onChange={(event) => setOutcome(event.target.value as (typeof outcomes)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {outcomes.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Trigger</span>
            <input
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Affected rows</span>
            <input
              value={affectedRows}
              onChange={(event) => setAffectedRows(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next run window</span>
            <input
              value={nextRunWindow}
              onChange={(event) => setNextRunWindow(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Result summary</span>
            <textarea
              value={resultSummary}
              onChange={(event) => setResultSummary(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={recordRun}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Recording…" : "Record source-job run"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same shared execution ledger used by the ingest admin lane."}</p>
        </div>
      </div>
    </div>
  );
}
