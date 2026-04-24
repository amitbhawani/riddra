"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AiDatasetOption = {
  source: string;
  status: "Ready" | "Growing" | "Needs automation";
  retainedChunks: number;
  routeTargets: number;
  freshness: string;
  groundingUse: string;
  note: string;
};

type AiDatasetUpdatePanelProps = {
  items: AiDatasetOption[];
};

const statuses = ["Ready", "Growing", "Needs automation"] as const;

export function AiDatasetUpdatePanel({ items }: AiDatasetUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [source, setSource] = useState(initialItem?.source ?? "");
  const activeItem = useMemo(() => items.find((item) => item.source === source) ?? initialItem, [initialItem, items, source]);
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Needs automation");
  const [retainedChunks, setRetainedChunks] = useState(String(activeItem?.retainedChunks ?? 0));
  const [routeTargets, setRouteTargets] = useState(String(activeItem?.routeTargets ?? 0));
  const [freshness, setFreshness] = useState(activeItem?.freshness ?? "");
  const [groundingUse, setGroundingUse] = useState(activeItem?.groundingUse ?? "");
  const [note, setNote] = useState(activeItem?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveDataset() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
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
        throw new Error(payload.error ?? "Unable to save AI dataset update.");
      }

      setMessage("Saved retrieval-dataset posture into the AI memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save AI dataset update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write retrieval dataset update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes retrieval coverage and grounding posture into the AI memory store instead of leaving knowledge inputs as read-only planning.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Dataset source</span>
            <select
              value={source}
              onChange={(event) => {
                const nextSource = event.target.value;
                const nextItem = items.find((item) => item.source === nextSource);
                setSource(nextSource);
                setStatus(nextItem?.status ?? "Needs automation");
                setRetainedChunks(String(nextItem?.retainedChunks ?? 0));
                setRouteTargets(String(nextItem?.routeTargets ?? 0));
                setFreshness(nextItem?.freshness ?? "");
                setGroundingUse(nextItem?.groundingUse ?? "");
                setNote(nextItem?.note ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.source} value={item.source} className="bg-slate-950">
                  {item.source}
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
          <label className="space-y-2 text-sm text-mist/78">
            <span>Retained chunks</span>
            <input
              value={retainedChunks}
              onChange={(event) => setRetainedChunks(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Route targets</span>
            <input
              value={routeTargets}
              onChange={(event) => setRouteTargets(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Freshness</span>
            <input
              value={freshness}
              onChange={(event) => setFreshness(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Grounding use</span>
            <textarea
              value={groundingUse}
              onChange={(event) => setGroundingUse(event.target.value)}
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
            onClick={saveDataset}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save dataset update"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same AI memory lane used by AI Ops, Knowledge Ops, and Market Copilot."}</p>
        </div>
      </div>
    </div>
  );
}
