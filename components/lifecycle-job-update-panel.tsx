"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LifecycleJob = {
  id: string;
  title: string;
  triggerEvent: string;
  status: "Queued" | "Running" | "Waiting on support" | "Ready to rerun";
  accountScope: string;
  nextRun: string;
  note: string;
};

type LifecycleJobUpdatePanelProps = {
  jobs: LifecycleJob[];
  endpoint: string;
  title: string;
  description: string;
  actionLabel: string;
};

const statuses = ["Queued", "Running", "Waiting on support", "Ready to rerun"] as const;

export function LifecycleJobUpdatePanel({ jobs, endpoint, title, description, actionLabel }: LifecycleJobUpdatePanelProps) {
  const router = useRouter();
  const initialJob = jobs[0];
  const [jobId, setJobId] = useState(initialJob?.id ?? "");
  const activeJob = jobs.find((item) => item.id === jobId) ?? initialJob;
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeJob?.status ?? "Queued");
  const [nextRun, setNextRun] = useState(activeJob?.nextRun ?? "");
  const [note, setNote] = useState(activeJob?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveJob() {
    if (!activeJob) return;

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeJob.id,
          title: activeJob.title,
          triggerEvent: activeJob.triggerEvent,
          accountScope: activeJob.accountScope,
          status,
          nextRun,
          note,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save lifecycle job.");
      }

      setMessage("Saved lifecycle job state into the shared backend queue.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save lifecycle job.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Lifecycle job</span>
            <select
              value={jobId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextJob = jobs.find((item) => item.id === nextId);
                setJobId(nextId);
                setStatus(nextJob?.status ?? "Queued");
                setNextRun(nextJob?.nextRun ?? "");
                setNote(nextJob?.note ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {jobs.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-950">
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {statuses.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next run</span>
            <input
              value={nextRun}
              onChange={(event) => setNextRun(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Operator note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveJob}
            disabled={pending || !activeJob}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : actionLabel}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same lifecycle queue used by billing lifecycle and payment-event surfaces."}</p>
        </div>
      </div>
    </div>
  );
}
