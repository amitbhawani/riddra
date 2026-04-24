"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ArchiveRefreshOption = {
  family: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  pendingWrites: number;
  documentBacklog: number;
  nextWindow: string;
  nextStep: string;
};

type ArchiveRefreshUpdatePanelProps = {
  items: ArchiveRefreshOption[];
};

const statuses = ["Ready", "In progress", "Blocked", "Planned"] as const;

export function ArchiveRefreshUpdatePanel({ items }: ArchiveRefreshUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [family, setFamily] = useState(initialItem?.family ?? "");
  const activeItem = useMemo(() => items.find((item) => item.family === family) ?? initialItem, [family, initialItem, items]);
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Planned");
  const [pendingWrites, setPendingWrites] = useState(String(activeItem?.pendingWrites ?? 0));
  const [documentBacklog, setDocumentBacklog] = useState(String(activeItem?.documentBacklog ?? 0));
  const [nextWindow, setNextWindow] = useState(activeItem?.nextWindow ?? "");
  const [nextStep, setNextStep] = useState(activeItem?.nextStep ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveRun() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/archive-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family,
          status,
          pendingWrites: Number(pendingWrites),
          documentBacklog: Number(documentBacklog),
          nextWindow,
          nextStep,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save archive-refresh update.");
      }

      setMessage("Saved archive queue posture into the refresh memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save archive-refresh update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write archive refresh update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes archive-run posture into the refresh memory store instead of leaving official-source continuity as read-only backlog text.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Family</span>
            <select
              value={family}
              onChange={(event) => {
                const nextFamily = event.target.value;
                const nextItem = items.find((item) => item.family === nextFamily);
                setFamily(nextFamily);
                setStatus(nextItem?.status ?? "Planned");
                setPendingWrites(String(nextItem?.pendingWrites ?? 0));
                setDocumentBacklog(String(nextItem?.documentBacklog ?? 0));
                setNextWindow(nextItem?.nextWindow ?? "");
                setNextStep(nextItem?.nextStep ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.family} value={item.family} className="bg-slate-950">
                  {item.family}
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
            <span>Pending writes</span>
            <input
              value={pendingWrites}
              onChange={(event) => setPendingWrites(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Document backlog</span>
            <input
              value={documentBacklog}
              onChange={(event) => setDocumentBacklog(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next window</span>
            <input
              value={nextWindow}
              onChange={(event) => setNextWindow(event.target.value)}
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
            {pending ? "Saving…" : "Save archive update"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same archive-refresh lane used by source-mapping and research-archive surfaces."}</p>
        </div>
      </div>
    </div>
  );
}
