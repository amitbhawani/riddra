"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AiGenerationRunOption = {
  workflow: string;
  answerState: "Stored" | "Queued" | "Needs live provider";
  groundingSource: string;
  routeTarget: string;
  costBand: "Lowest cost" | "Budget watch" | "Controlled spend";
  note: string;
};

type AiGenerationRunUpdatePanelProps = {
  items: AiGenerationRunOption[];
};

const answerStates = ["Stored", "Queued", "Needs live provider"] as const;
const costBands = ["Lowest cost", "Budget watch", "Controlled spend"] as const;

export function AiGenerationRunUpdatePanel({ items }: AiGenerationRunUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [workflow, setWorkflow] = useState(initialItem?.workflow ?? "");
  const activeItem = useMemo(() => items.find((item) => item.workflow === workflow) ?? initialItem, [initialItem, items, workflow]);
  const [answerState, setAnswerState] = useState<(typeof answerStates)[number]>(activeItem?.answerState ?? "Queued");
  const [groundingSource, setGroundingSource] = useState(activeItem?.groundingSource ?? "");
  const [routeTarget, setRouteTarget] = useState(activeItem?.routeTarget ?? "");
  const [costBand, setCostBand] = useState<(typeof costBands)[number]>(activeItem?.costBand ?? "Budget watch");
  const [note, setNote] = useState(activeItem?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveRun() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-generation-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow,
          answerState,
          groundingSource,
          routeTarget,
          costBand,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save AI generation run.");
      }

      setMessage("Saved generation-run posture into the AI memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save AI generation run.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write generation-run update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes run-state, grounding, cost posture, and route targeting into the AI memory store instead of leaving workflow execution as read-only cards.
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
                setAnswerState(nextItem?.answerState ?? "Queued");
                setGroundingSource(nextItem?.groundingSource ?? "");
                setRouteTarget(nextItem?.routeTarget ?? "");
                setCostBand(nextItem?.costBand ?? "Budget watch");
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
            <span>Answer state</span>
            <select
              value={answerState}
              onChange={(event) => setAnswerState(event.target.value as (typeof answerStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {answerStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Grounding source</span>
            <input
              value={groundingSource}
              onChange={(event) => setGroundingSource(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Cost band</span>
            <select
              value={costBand}
              onChange={(event) => setCostBand(event.target.value as (typeof costBands)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {costBands.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Route target</span>
            <input
              value={routeTarget}
              onChange={(event) => setRouteTarget(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
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
            onClick={saveRun}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save generation run"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same stored-run lane used by AI Ops and future grounded workflows."}</p>
        </div>
      </div>
    </div>
  );
}
