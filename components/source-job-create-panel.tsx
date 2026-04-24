"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["Ready", "In progress", "Blocked", "Planned"] as const;

export function SourceJobCreatePanel() {
  const router = useRouter();
  const [adapter, setAdapter] = useState("");
  const [domain, setDomain] = useState("");
  const [cadence, setCadence] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Planned");
  const [queueDepth, setQueueDepth] = useState("0");
  const [retryBacklog, setRetryBacklog] = useState("0");
  const [nextRunWindow, setNextRunWindow] = useState("");
  const [cachePosture, setCachePosture] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createRun() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/source-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapter,
          domain,
          cadence,
          status,
          queueDepth: Number(queueDepth),
          retryBacklog: Number(retryBacklog),
          nextRunWindow,
          cachePosture,
          nextStep,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create source-job adapter.");
      }

      setMessage("Created a new source-job adapter lane through the unified admin route.");
      setAdapter("");
      setDomain("");
      setCadence("");
      setStatus("Planned");
      setQueueDepth("0");
      setRetryBacklog("0");
      setNextRunWindow("");
      setCachePosture("");
      setNextStep("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create source-job adapter.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create source-job adapter</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Add a new ingest or refresh adapter row when pipeline coverage expands beyond the starter queue set.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Adapter</span>
            <input value={adapter} onChange={(event) => setAdapter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Domain</span>
            <input value={domain} onChange={(event) => setDomain(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Cadence</span>
            <input value={cadence} onChange={(event) => setCadence(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20">
              {statuses.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Queue depth</span>
            <input value={queueDepth} onChange={(event) => setQueueDepth(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Retry backlog</span>
            <input value={retryBacklog} onChange={(event) => setRetryBacklog(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next run window</span>
            <input value={nextRunWindow} onChange={(event) => setNextRunWindow(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Cache posture</span>
            <textarea value={cachePosture} onChange={(event) => setCachePosture(event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next step</span>
            <textarea value={nextStep} onChange={(event) => setNextStep(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={createRun} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Creating…" : "Create source-job adapter"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Appends a new adapter row into the shared source-job queue store."}</p>
        </div>
      </div>
    </div>
  );
}
