"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SearchIndexOption = {
  lane: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  indexedRecords: number;
  aliasGroups: number;
  typoProtectedRoutes: number;
  filterCoverage: string;
  nextStep: string;
};

type SearchIndexUpdatePanelProps = {
  items: SearchIndexOption[];
};

const statuses = ["Ready", "In progress", "Blocked", "Planned"] as const;

export function SearchIndexUpdatePanel({ items }: SearchIndexUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [lane, setLane] = useState(initialItem?.lane ?? "");
  const activeItem = useMemo(() => items.find((item) => item.lane === lane) ?? initialItem, [initialItem, items, lane]);
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Planned");
  const [indexedRecords, setIndexedRecords] = useState(String(activeItem?.indexedRecords ?? 0));
  const [aliasGroups, setAliasGroups] = useState(String(activeItem?.aliasGroups ?? 0));
  const [typoProtectedRoutes, setTypoProtectedRoutes] = useState(String(activeItem?.typoProtectedRoutes ?? 0));
  const [filterCoverage, setFilterCoverage] = useState(activeItem?.filterCoverage ?? "");
  const [nextStep, setNextStep] = useState(activeItem?.nextStep ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveLane() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/search-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lane,
          status,
          indexedRecords: Number(indexedRecords),
          aliasGroups: Number(aliasGroups),
          typoProtectedRoutes: Number(typoProtectedRoutes),
          filterCoverage,
          nextStep,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save search-index update.");
      }

      setMessage("Saved search-index posture into the shared backend memory lane.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save search-index update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write search-index lane update</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This now writes operator search-index posture into the shared memory store instead of leaving search and screener backend truth as read-only planning.
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
                setIndexedRecords(String(nextItem?.indexedRecords ?? 0));
                setAliasGroups(String(nextItem?.aliasGroups ?? 0));
                setTypoProtectedRoutes(String(nextItem?.typoProtectedRoutes ?? 0));
                setFilterCoverage(nextItem?.filterCoverage ?? "");
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
            <span>Indexed records</span>
            <input
              value={indexedRecords}
              onChange={(event) => setIndexedRecords(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Alias groups</span>
            <input
              value={aliasGroups}
              onChange={(event) => setAliasGroups(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Typo-protected routes</span>
            <input
              value={typoProtectedRoutes}
              onChange={(event) => setTypoProtectedRoutes(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Filter coverage note</span>
            <textarea
              value={filterCoverage}
              onChange={(event) => setFilterCoverage(event.target.value)}
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
            {pending ? "Saving…" : "Save search-index update"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same backend lane used by the search and screener truth desk."}</p>
        </div>
      </div>
    </div>
  );
}
