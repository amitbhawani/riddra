"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["Ready", "Growing", "Needs automation"] as const;

export function AiDatasetCreatePanel() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [source, setSource] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Needs automation");
  const [retainedChunks, setRetainedChunks] = useState("0");
  const [routeTargets, setRouteTargets] = useState("0");
  const [freshness, setFreshness] = useState("");
  const [groundingUse, setGroundingUse] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createDataset() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          source,
          role,
          status,
          retainedChunks: Number(retainedChunks),
          routeTargets: Number(routeTargets),
          freshness,
          groundingUse,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create AI dataset.");
      }

      setMessage("Created a new retrieval dataset through the unified admin route.");
      setId("");
      setSource("");
      setRole("");
      setStatus("Needs automation");
      setRetainedChunks("0");
      setRouteTargets("0");
      setFreshness("");
      setGroundingUse("");
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create AI dataset.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create retrieval dataset</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Add a new grounded dataset row when retrieval coverage expands beyond the starter knowledge sources.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Dataset id</span>
            <input value={id} onChange={(event) => setId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Source</span>
            <input value={source} onChange={(event) => setSource(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Role</span>
            <input value={role} onChange={(event) => setRole(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
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
            <span>Retained chunks</span>
            <input value={retainedChunks} onChange={(event) => setRetainedChunks(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Route targets</span>
            <input value={routeTargets} onChange={(event) => setRouteTargets(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Freshness</span>
            <input value={freshness} onChange={(event) => setFreshness(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Grounding use</span>
            <textarea value={groundingUse} onChange={(event) => setGroundingUse(event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={createDataset} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Creating…" : "Create retrieval dataset"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Appends a new dataset into the shared AI memory store."}</p>
        </div>
      </div>
    </div>
  );
}
