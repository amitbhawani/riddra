"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const continuityStates = ["Stored packet", "Preview packet", "Needs live provider"] as const;

export function AiAnswerPacketCreatePanel() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [audience, setAudience] = useState("");
  const [routeTarget, setRouteTarget] = useState("");
  const [continuityState, setContinuityState] = useState<(typeof continuityStates)[number]>("Preview packet");
  const [groundingSources, setGroundingSources] = useState("");
  const [answerShape, setAnswerShape] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createPacket() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-answer-packets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          workflow,
          audience,
          routeTarget,
          continuityState,
          groundingSources,
          answerShape,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create AI answer packet.");
      }

      setMessage("Created a new answer packet through the unified admin route.");
      setId("");
      setWorkflow("");
      setAudience("");
      setRouteTarget("");
      setContinuityState("Preview packet");
      setGroundingSources("");
      setAnswerShape("");
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create AI answer packet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create answer packet</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Add a new stored or preview packet when grounded response continuity expands beyond the starter playbooks.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Packet id</span>
            <input value={id} onChange={(event) => setId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Workflow</span>
            <input value={workflow} onChange={(event) => setWorkflow(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Audience</span>
            <input value={audience} onChange={(event) => setAudience(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Continuity state</span>
            <select value={continuityState} onChange={(event) => setContinuityState(event.target.value as (typeof continuityStates)[number])} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20">
              {continuityStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Route target</span>
            <input value={routeTarget} onChange={(event) => setRouteTarget(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Grounding sources</span>
            <input value={groundingSources} onChange={(event) => setGroundingSources(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Answer shape</span>
            <textarea value={answerShape} onChange={(event) => setAnswerShape(event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={createPacket} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Creating…" : "Create answer packet"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Appends a new packet into the shared AI answer store."}</p>
        </div>
      </div>
    </div>
  );
}
