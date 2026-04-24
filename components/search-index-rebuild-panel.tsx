"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchIndexRebuildPanel() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function queueRebuild() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/search-index/rebuild", {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; job?: { id?: string } };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to queue search-index rebuild.");
      }

      setMessage(payload.job?.id ? `Queued search rebuild job ${payload.job.id}.` : "Queued search-index rebuild.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue search-index rebuild.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <h3 className="text-lg font-semibold text-white">Queue search-index rebuild</h3>
      <p className="mt-2 text-sm leading-7 text-mist/72">
        This rebuilds the live Meilisearch document layer through a durable Trigger.dev worker run instead of only saving manual lane notes.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={queueRebuild}
          disabled={pending}
          className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Queueing…" : "Queue rebuild"}
        </button>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Use this when route coverage, query misses, or alias review work should refresh the live search engine."}
        </p>
      </div>
    </div>
  );
}
