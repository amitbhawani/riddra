"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LaunchCutoverChecklistItem } from "@/lib/launch-cutover-checklist-memory-store";

type LaunchCutoverChecklistPanelProps = {
  items: LaunchCutoverChecklistItem[];
};

function autoStatusClasses(status: LaunchCutoverChecklistItem["autoStatus"]) {
  if (status === "Ready") return "bg-aurora/14 text-aurora";
  if (status === "Needs verification") return "bg-flare/14 text-flare";
  if (status === "Deferred") return "bg-white/10 text-white";
  return "bg-bloom/14 text-bloom";
}

function LaunchCutoverChecklistCard({ item }: { item: LaunchCutoverChecklistItem }) {
  const router = useRouter();
  const [completed, setCompleted] = useState(item.completed);
  const [detail, setDetail] = useState(item.detail);
  const [note, setNote] = useState(item.note);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveItem() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/launch-cutover-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          completed,
          detail,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save launch cutover step.");
      }

      setMessage("Saved this launch step.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save launch cutover step.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Step {item.order}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${autoStatusClasses(item.autoStatus)}`}
          >
            {item.autoStatus}
          </span>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Where to do it</p>
          <p className="mt-2 text-sm leading-7 text-mist/74">{item.where}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-mist/52">What exactly to do</p>
          <p className="mt-2 text-sm leading-7 text-mist/74">{item.action}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-mist/52">Detected right now</p>
          <p className="mt-2 text-sm leading-7 text-white">{item.detectedValue}</p>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white">
          <input
            type="checkbox"
            checked={completed}
            onChange={(event) => setCompleted(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-transparent"
          />
          Mark this step completed
        </label>

        <label className="space-y-2 text-sm text-mist/78">
          <span>{item.detailLabel}</span>
          <input
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder={item.detailPlaceholder}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          />
        </label>

        <label className="space-y-2 text-sm text-mist/78">
          <span>Your note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={item.notePlaceholder}
            className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveItem}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save this step"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? (item.updatedAt ? `Last updated ${new Date(item.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "Use this to track your own launch progress and notes in plain English.")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LaunchCutoverChecklistPanel({ items }: LaunchCutoverChecklistPanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <LaunchCutoverChecklistCard key={item.id} item={item} />
      ))}
    </div>
  );
}
