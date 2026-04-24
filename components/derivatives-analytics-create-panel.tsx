"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["In progress", "Planned", "Blocked"] as const;

export function DerivativesAnalyticsCreatePanel() {
  const router = useRouter();
  const [lane, setLane] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Planned");
  const [retainedSessions, setRetainedSessions] = useState("0");
  const [nextJob, setNextJob] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createLane() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/derivatives-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lane,
          status,
          retainedSessions: Number(retainedSessions),
          nextJob,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create derivatives analytics lane.");
      }

      setMessage("Created a new derivatives analytics lane through the unified admin route.");
      setLane("");
      setStatus("Planned");
      setRetainedSessions("0");
      setNextJob("");
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create derivatives analytics lane.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create derivatives analytics lane</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Add a new retained-session analytics lane when option-chain depth expands beyond the starter metrics.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Analytics lane</span>
            <input value={lane} onChange={(event) => setLane(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
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
            <span>Retained sessions</span>
            <input value={retainedSessions} onChange={(event) => setRetainedSessions(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Next job</span>
            <input value={nextJob} onChange={(event) => setNextJob(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={createLane} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Creating…" : "Create analytics lane"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Appends a new analytics lane into the shared derivatives backend store."}</p>
        </div>
      </div>
    </div>
  );
}
