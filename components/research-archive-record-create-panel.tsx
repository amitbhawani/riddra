"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const assetTypes = ["stock", "ipo", "fund", "wealth"] as const;
const sourceTypes = ["official_filing", "results_watch", "editorial_note", "factsheet", "event_history"] as const;
const statuses = ["Archived", "Queued"] as const;

export function ResearchArchiveRecordCreatePanel() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [assetType, setAssetType] = useState<(typeof assetTypes)[number]>("stock");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [family, setFamily] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceType, setSourceType] = useState<(typeof sourceTypes)[number]>("official_filing");
  const [publishedAt, setPublishedAt] = useState("");
  const [continuityNote, setContinuityNote] = useState("");
  const [pageTarget, setPageTarget] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Queued");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createRecord() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/research-archive-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          assetType,
          slug,
          title,
          family,
          sourceLabel,
          sourceType,
          publishedAt,
          continuityNote,
          pageTarget,
          status,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create research-archive record.");
      }

      setMessage("Created a new research-archive row through the unified admin archive route.");
      setId("");
      setSlug("");
      setTitle("");
      setFamily("");
      setSourceLabel("");
      setPublishedAt("");
      setContinuityNote("");
      setPageTarget("");
      setAssetType("stock");
      setSourceType("official_filing");
      setStatus("Queued");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create research-archive record.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create archive record</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This appends a new archive row into the shared research-archive store instead of limiting the archive lane to the seeded starter rows already on the page.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Record ID</span>
            <input
              value={id}
              onChange={(event) => setId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Asset type</span>
            <select
              value={assetType}
              onChange={(event) => setAssetType(event.target.value as (typeof assetTypes)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {assetTypes.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
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
            <span>Family</span>
            <input
              value={family}
              onChange={(event) => setFamily(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Source label</span>
            <input
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Source type</span>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as (typeof sourceTypes)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {sourceTypes.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Published at</span>
            <input
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
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
            onClick={createRecord}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create archive record"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Creates a new row in the same archive lane used by research archive, refresh continuity, and registry surfaces."}</p>
        </div>
      </div>
    </div>
  );
}
