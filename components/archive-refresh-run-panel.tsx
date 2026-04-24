"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ArchiveRefreshRunOption = {
  family: string;
  nextWindow: string;
};

type ArchiveRefreshRunPanelProps = {
  items: ArchiveRefreshRunOption[];
};

const outcomes = ["Succeeded", "Queued", "Needs review"] as const;

export function ArchiveRefreshRunPanel({ items }: ArchiveRefreshRunPanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [family, setFamily] = useState(initialItem?.family ?? "");
  const activeItem = useMemo(() => items.find((item) => item.family === family) ?? initialItem, [family, initialItem, items]);
  const [outcome, setOutcome] = useState<(typeof outcomes)[number]>("Succeeded");
  const [trigger, setTrigger] = useState("Source mapping desk operator");
  const [affectedRows, setAffectedRows] = useState("1");
  const [nextWindow, setNextWindow] = useState(activeItem?.nextWindow ?? "");
  const [resultSummary, setResultSummary] = useState("Archive refresh queued during source-mapping verification.");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function recordRun() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/archive-refresh/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family,
          outcome,
          trigger,
          affectedRows: Number(affectedRows),
          nextWindow,
          resultSummary,
        }),
      });

      const payload = (await response.json()) as { error?: string; job?: { id: string } };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record archive execution.");
      }

      setMessage(
        payload.job?.id
          ? `Queued archive refresh into Trigger.dev (${payload.job.id}).`
          : "Queued archive refresh into Trigger.dev.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record archive execution.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Queue archive refresh run</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This queues the internal archive-refresh worker through Trigger.dev so backlog changes update the shared execution ledger and research-archive memory honestly.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Family</span>
            <select
              value={family}
              onChange={(event) => {
                const nextFamily = event.target.value;
                const nextItem = items.find((item) => item.family === nextFamily);
                setFamily(nextFamily);
                setNextWindow(nextItem?.nextWindow ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.family} value={item.family} className="bg-slate-950">
                  {item.family}
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
            <span>Next window</span>
            <input
              value={nextWindow}
              onChange={(event) => setNextWindow(event.target.value)}
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
            {pending ? "Queueing…" : "Queue archive refresh"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ??
              "Queues into the same durable worker lane now reflected by source-mapping and research-archive execution history."}
          </p>
        </div>
      </div>
    </div>
  );
}
