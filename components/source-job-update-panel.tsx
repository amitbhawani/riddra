"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SourceJobOption = {
  adapter: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  queueDepth: number;
  retryBacklog: number;
  nextRunWindow: string;
  nextStep: string;
};

type SourceJobUpdatePanelProps = {
  items: SourceJobOption[];
};

const statuses = ["Ready", "In progress", "Blocked", "Planned"] as const;

export function SourceJobUpdatePanel({ items }: SourceJobUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [adapter, setAdapter] = useState(initialItem?.adapter ?? "");
  const activeItem = useMemo(() => items.find((item) => item.adapter === adapter) ?? initialItem, [adapter, initialItem, items]);
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Planned");
  const [queueDepth, setQueueDepth] = useState(String(activeItem?.queueDepth ?? 0));
  const [retryBacklog, setRetryBacklog] = useState(String(activeItem?.retryBacklog ?? 0));
  const [nextRunWindow, setNextRunWindow] = useState(activeItem?.nextRunWindow ?? "");
  const [nextStep, setNextStep] = useState(activeItem?.nextStep ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveRun() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/source-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapter,
          status,
          queueDepth: Number(queueDepth),
          retryBacklog: Number(retryBacklog),
          nextRunWindow,
          nextStep,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save source-job update.");
      }

      setMessage("Saved queue posture into the source-job memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save source-job update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write adapter queue update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes operator queue posture into the source-job memory store instead of leaving ingest status as read-only planning.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Adapter</span>
            <select
              value={adapter}
              onChange={(event) => {
                const nextAdapter = event.target.value;
                const nextItem = items.find((item) => item.adapter === nextAdapter);
                setAdapter(nextAdapter);
                setStatus(nextItem?.status ?? "Planned");
                setQueueDepth(String(nextItem?.queueDepth ?? 0));
                setRetryBacklog(String(nextItem?.retryBacklog ?? 0));
                setNextRunWindow(nextItem?.nextRunWindow ?? "");
                setNextStep(nextItem?.nextStep ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.adapter} value={item.adapter} className="bg-slate-950">
                  {item.adapter}
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
            <span>Queue depth</span>
            <input
              value={queueDepth}
              onChange={(event) => setQueueDepth(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Retry backlog</span>
            <input
              value={retryBacklog}
              onChange={(event) => setRetryBacklog(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next run window</span>
            <input
              value={nextRunWindow}
              onChange={(event) => setNextRunWindow(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
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
            onClick={saveRun}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save adapter update"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same queue lane used by the source-jobs admin desk."}</p>
        </div>
      </div>
    </div>
  );
}
