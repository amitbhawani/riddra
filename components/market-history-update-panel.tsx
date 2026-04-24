"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type MarketHistoryOption = {
  lane: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  retainedSeries: number;
  verifiedSeries: number;
  previewSeries: number;
  refreshWindow: string;
  continuityNote: string;
  nextStep: string;
};

type MarketHistoryUpdatePanelProps = {
  items: MarketHistoryOption[];
};

const statuses = ["Ready", "In progress", "Blocked", "Planned"] as const;

export function MarketHistoryUpdatePanel({ items }: MarketHistoryUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [lane, setLane] = useState(initialItem?.lane ?? "");
  const activeItem = useMemo(() => items.find((item) => item.lane === lane) ?? initialItem, [initialItem, items, lane]);
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Planned");
  const [retainedSeries, setRetainedSeries] = useState(String(activeItem?.retainedSeries ?? 0));
  const [verifiedSeries, setVerifiedSeries] = useState(String(activeItem?.verifiedSeries ?? 0));
  const [previewSeries, setPreviewSeries] = useState(String(activeItem?.previewSeries ?? 0));
  const [refreshWindow, setRefreshWindow] = useState(activeItem?.refreshWindow ?? "");
  const [continuityNote, setContinuityNote] = useState(activeItem?.continuityNote ?? "");
  const [nextStep, setNextStep] = useState(activeItem?.nextStep ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveLane() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/market-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lane,
          status,
          retainedSeries: Number(retainedSeries),
          verifiedSeries: Number(verifiedSeries),
          previewSeries: Number(previewSeries),
          refreshWindow,
          continuityNote,
          nextStep,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save market-history update.");
      }

      setMessage("Saved market-history posture into the shared backend memory lane.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save market-history update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write market-history lane update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes retained-series and continuity posture into the market-history store instead of leaving chart persistence as read-only ops copy.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Lane</span>
            <select
              value={lane}
              onChange={(event) => {
                const nextLane = event.target.value;
                const nextItem = items.find((item) => item.lane === nextLane);
                setLane(nextLane);
                setStatus(nextItem?.status ?? "Planned");
                setRetainedSeries(String(nextItem?.retainedSeries ?? 0));
                setVerifiedSeries(String(nextItem?.verifiedSeries ?? 0));
                setPreviewSeries(String(nextItem?.previewSeries ?? 0));
                setRefreshWindow(nextItem?.refreshWindow ?? "");
                setContinuityNote(nextItem?.continuityNote ?? "");
                setNextStep(nextItem?.nextStep ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.lane} value={item.lane} className="bg-slate-950">
                  {item.lane}
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
            <span>Retained series</span>
            <input
              value={retainedSeries}
              onChange={(event) => setRetainedSeries(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Verified series</span>
            <input
              value={verifiedSeries}
              onChange={(event) => setVerifiedSeries(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Preview series</span>
            <input
              value={previewSeries}
              onChange={(event) => setPreviewSeries(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Refresh window</span>
            <input
              value={refreshWindow}
              onChange={(event) => setRefreshWindow(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Continuity note</span>
            <textarea
              value={continuityNote}
              onChange={(event) => setContinuityNote(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next step</span>
            <textarea
              value={nextStep}
              onChange={(event) => setNextStep(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveLane}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save market-history update"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same backend lane used by the market-data ops desk."}</p>
        </div>
      </div>
    </div>
  );
}
