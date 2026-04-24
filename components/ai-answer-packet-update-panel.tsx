"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AiAnswerPacketOption = {
  workflow: string;
  audience: string;
  routeTarget: string;
  continuityState: "Stored packet" | "Preview packet" | "Needs live provider";
  groundingSources: string;
  answerShape: string;
  note: string;
};

type AiAnswerPacketUpdatePanelProps = {
  items: AiAnswerPacketOption[];
};

const continuityStates = ["Stored packet", "Preview packet", "Needs live provider"] as const;

export function AiAnswerPacketUpdatePanel({ items }: AiAnswerPacketUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [workflow, setWorkflow] = useState(initialItem?.workflow ?? "");
  const activeItem = useMemo(() => items.find((item) => item.workflow === workflow) ?? initialItem, [initialItem, items, workflow]);
  const [audience, setAudience] = useState(activeItem?.audience ?? "");
  const [routeTarget, setRouteTarget] = useState(activeItem?.routeTarget ?? "");
  const [continuityState, setContinuityState] = useState<(typeof continuityStates)[number]>(activeItem?.continuityState ?? "Preview packet");
  const [groundingSources, setGroundingSources] = useState(activeItem?.groundingSources ?? "");
  const [answerShape, setAnswerShape] = useState(activeItem?.answerShape ?? "");
  const [note, setNote] = useState(activeItem?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function savePacket() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-answer-packets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        throw new Error(payload.error ?? "Unable to save AI answer packet.");
      }

      setMessage("Saved answer-packet continuity into the AI memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save AI answer packet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write answer-packet update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes packet continuity and grounded response shape into the AI memory store instead of leaving packet reuse as audit-only display state.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Workflow</span>
            <select
              value={workflow}
              onChange={(event) => {
                const nextWorkflow = event.target.value;
                const nextItem = items.find((item) => item.workflow === nextWorkflow);
                setWorkflow(nextWorkflow);
                setAudience(nextItem?.audience ?? "");
                setRouteTarget(nextItem?.routeTarget ?? "");
                setContinuityState(nextItem?.continuityState ?? "Preview packet");
                setGroundingSources(nextItem?.groundingSources ?? "");
                setAnswerShape(nextItem?.answerShape ?? "");
                setNote(nextItem?.note ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.workflow} value={item.workflow} className="bg-slate-950">
                  {item.workflow}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Continuity state</span>
            <select
              value={continuityState}
              onChange={(event) => setContinuityState(event.target.value as (typeof continuityStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {continuityStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Audience</span>
            <input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Route target</span>
            <input
              value={routeTarget}
              onChange={(event) => setRouteTarget(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Grounding sources</span>
            <input
              value={groundingSources}
              onChange={(event) => setGroundingSources(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Answer shape</span>
            <textarea
              value={answerShape}
              onChange={(event) => setAnswerShape(event.target.value)}
              className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Note</span>
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
            onClick={savePacket}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save answer packet"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same packet-continuity lane used by AI Ops, Knowledge Ops, and Market Copilot."}</p>
        </div>
      </div>
    </div>
  );
}
