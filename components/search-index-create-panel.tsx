"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["Ready", "In progress", "Blocked", "Planned"] as const;

export function SearchIndexCreatePanel() {
  const router = useRouter();
  const [lane, setLane] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("Planned");
  const [indexedRecords, setIndexedRecords] = useState("0");
  const [aliasGroups, setAliasGroups] = useState("0");
  const [typoProtectedRoutes, setTypoProtectedRoutes] = useState("0");
  const [filterCoverage, setFilterCoverage] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createLane() {
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
        throw new Error(payload.error ?? "Unable to create search-index lane.");
      }

      setMessage("Created a new search-index backend lane through the unified admin route.");
      setLane("");
      setStatus("Planned");
      setIndexedRecords("0");
      setAliasGroups("0");
      setTypoProtectedRoutes("0");
      setFilterCoverage("");
      setNextStep("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create search-index lane.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create search-index lane</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Add a brand-new search or screener backend lane when the registry grows beyond the original starter desk.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Lane</span>
            <input value={lane} onChange={(event) => setLane(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20">
              {statuses.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Indexed records</span>
            <input value={indexedRecords} onChange={(event) => setIndexedRecords(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Alias groups</span>
            <input value={aliasGroups} onChange={(event) => setAliasGroups(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Typo-protected routes</span>
            <input value={typoProtectedRoutes} onChange={(event) => setTypoProtectedRoutes(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Filter coverage note</span>
            <textarea value={filterCoverage} onChange={(event) => setFilterCoverage(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next step</span>
            <textarea value={nextStep} onChange={(event) => setNextStep(event.target.value)} className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={createLane} disabled={pending} className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Creating…" : "Create search-index lane"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Appends a new lane into the shared search-index backend store."}</p>
        </div>
      </div>
    </div>
  );
}
