"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LifecycleJobCreatePanelProps = {
  endpoint: string;
  title: string;
  description: string;
  actionLabel: string;
  initialStatus?: "Queued" | "Running" | "Waiting on support" | "Ready to rerun";
};

const statuses = ["Queued", "Running", "Waiting on support", "Ready to rerun"] as const;

export function LifecycleJobCreatePanel({
  endpoint,
  title,
  description,
  actionLabel,
  initialStatus = "Queued",
}: LifecycleJobCreatePanelProps) {
  const router = useRouter();
  const [jobId, setJobId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>(initialStatus);
  const [accountScope, setAccountScope] = useState("");
  const [nextRun, setNextRun] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createJob() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: jobId,
          title: jobTitle,
          triggerEvent,
          status,
          accountScope,
          nextRun,
          note,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create lifecycle job.");
      }

      setMessage("Created a new lifecycle job in the shared backend queue.");
      setJobId("");
      setJobTitle("");
      setTriggerEvent("");
      setAccountScope("");
      setNextRun("");
      setNote("");
      setStatus(initialStatus);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create lifecycle job.");
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
            <span>Job ID</span>
            <input
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Job title</span>
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Trigger event</span>
            <input
              value={triggerEvent}
              onChange={(event) => setTriggerEvent(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
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
            <span>Account scope</span>
            <input
              value={accountScope}
              onChange={(event) => setAccountScope(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
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
            onClick={createJob}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : actionLabel}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Creates a new lifecycle queue row in the same backend lane used by subscriber and payment-event surfaces."}</p>
        </div>
      </div>
    </div>
  );
}
