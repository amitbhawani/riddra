"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["Open", "In progress", "Ready", "Blocked"] as const;

type SearchQueryReviewPanelProps = {
  suggestions: Array<{
    query: string;
    zeroResultCount: number;
    bestLeadHref?: string;
  }>;
};

export function SearchQueryReviewPanel({ suggestions }: SearchQueryReviewPanelProps) {
  const router = useRouter();
  const initialSuggestion = suggestions[0];
  const [query, setQuery] = useState(initialSuggestion?.query ?? "");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Open");
  const [owner, setOwner] = useState("Search Truth Owner");
  const [proposedAlias, setProposedAlias] = useState("");
  const [proposedRoute, setProposedRoute] = useState(initialSuggestion?.bestLeadHref ?? "");
  const [sourceZeroResultCount, setSourceZeroResultCount] = useState(String(initialSuggestion?.zeroResultCount ?? 0));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveReview() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/search-query-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          status,
          owner,
          proposedAlias,
          proposedRoute,
          note,
          sourceZeroResultCount: Number(sourceZeroResultCount),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save search query review.");
      }

      setMessage("Saved the search-query review backlog row through the unified admin route.");
      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save search query review.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create or update query review</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Turn repeated zero-result or weak-result searches into an owned backlog row with an alias, route, or index follow-up instead of leaving those misses inside analytics copy alone.
          </p>
        </div>
        {suggestions.length ? (
          <label className="space-y-2 text-sm text-mist/78">
            <span>Suggested tracked query</span>
            <select
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                const nextSuggestion = suggestions.find((item) => item.query === nextQuery);
                setQuery(nextQuery);
                setProposedRoute(nextSuggestion?.bestLeadHref ?? "");
                setSourceZeroResultCount(String(nextSuggestion?.zeroResultCount ?? 0));
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {suggestions.map((item) => (
                <option key={item.query} value={item.query} className="bg-slate-950">
                  {item.query}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Query</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
          <label className="space-y-2 text-sm text-mist/78">
            <span>Owner</span>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Zero-result signals</span>
            <input
              value={sourceZeroResultCount}
              onChange={(event) => setSourceZeroResultCount(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Proposed alias</span>
            <input
              value={proposedAlias}
              onChange={(event) => setProposedAlias(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Proposed route</span>
            <input
              value={proposedRoute}
              onChange={(event) => setProposedRoute(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Operator note</span>
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
            onClick={saveReview}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save query review"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Writes into the shared search-query review backlog so zero-result fixes become owned work instead of passive observations."}
          </p>
        </div>
      </div>
    </div>
  );
}
