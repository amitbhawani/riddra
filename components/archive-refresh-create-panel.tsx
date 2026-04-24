"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["Ready", "In progress", "Blocked", "Planned"] as const;

export function ArchiveRefreshCreatePanel() {
  const router = useRouter();
  const [family, setFamily] = useState("");
  const [sourceClass, setSourceClass] = useState("");
  const [cadence, setCadence] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Planned");
  const [pendingWrites, setPendingWrites] = useState("0");
  const [documentBacklog, setDocumentBacklog] = useState("0");
  const [nextWindow, setNextWindow] = useState("");
  const [coveragePosture, setCoveragePosture] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createRun() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/archive-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family,
          sourceClass,
          cadence,
          status,
          pendingWrites: Number(pendingWrites),
          documentBacklog: Number(documentBacklog),
          nextWindow,
          coveragePosture,
          nextStep,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create archive-refresh family.");
      }

      setMessage("Created a new archive-refresh family through the unified admin route.");
      setFamily("");
      setSourceClass("");
      setCadence("");
      setStatus("Planned");
      setPendingWrites("0");
      setDocumentBacklog("0");
      setNextWindow("");
      setCoveragePosture("");
      setNextStep("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create archive-refresh family.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create archive-refresh family</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Add a new official-source archive lane when research continuity grows beyond the starter refresh queue.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Family</span>
            <input value={family} onChange={(event) => setFamily(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Source class</span>
            <input value={sourceClass} onChange={(event) => setSourceClass(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
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
            <span>Pending writes</span>
            <input value={pendingWrites} onChange={(event) => setPendingWrites(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Document backlog</span>
            <input value={documentBacklog} onChange={(event) => setDocumentBacklog(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next window</span>
            <input value={nextWindow} onChange={(event) => setNextWindow(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Coverage posture</span>
            <textarea value={coveragePosture} onChange={(event) => setCoveragePosture(event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next step</span>
            <textarea value={nextStep} onChange={(event) => setNextStep(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={createRun} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Creating…" : "Create archive-refresh family"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Appends a new official-source family into the shared archive-refresh store."}</p>
        </div>
      </div>
    </div>
  );
}
