"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ResearchArchiveRecordOption = {
  id: string;
  title: string;
  publishedAt: string;
  continuityNote: string;
  pageTarget: string;
  status: "Archived" | "Queued";
};

type ResearchArchiveRecordUpdatePanelProps = {
  items: ResearchArchiveRecordOption[];
};

const statuses = ["Archived", "Queued"] as const;

export function ResearchArchiveRecordUpdatePanel({ items }: ResearchArchiveRecordUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [recordId, setRecordId] = useState(initialItem?.id ?? "");
  const activeItem = useMemo(() => items.find((item) => item.id === recordId) ?? initialItem, [initialItem, items, recordId]);
  const [title, setTitle] = useState(activeItem?.title ?? "");
  const [publishedAt, setPublishedAt] = useState(activeItem?.publishedAt ?? "");
  const [continuityNote, setContinuityNote] = useState(activeItem?.continuityNote ?? "");
  const [pageTarget, setPageTarget] = useState(activeItem?.pageTarget ?? "");
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Queued");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveRecord() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/research-archive-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          title,
          publishedAt,
          continuityNote,
          pageTarget,
          status,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save research-archive record.");
      }

      setMessage("Saved research-archive enrichment into the archive memory store.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save research-archive record.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write archive enrichment update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes route-targeted archive enrichment into the research-archive memory store instead of leaving filings and factsheet continuity as read-only evidence rows.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Archive record</span>
            <select
              value={recordId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextItem = items.find((item) => item.id === nextId);
                setRecordId(nextId);
                setTitle(nextItem?.title ?? "");
                setPublishedAt(nextItem?.publishedAt ?? "");
                setContinuityNote(nextItem?.continuityNote ?? "");
                setPageTarget(nextItem?.pageTarget ?? "");
                setStatus(nextItem?.status ?? "Queued");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-950">
                  {item.title}
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
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Published at</span>
            <input
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Route target</span>
            <input
              value={pageTarget}
              onChange={(event) => setPageTarget(event.target.value)}
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveRecord}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save archive record"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same archive lane used by research archive, stock filings watch, and archive registries."}</p>
        </div>
      </div>
    </div>
  );
}
