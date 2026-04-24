"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const risks = ["Low", "Medium", "High"] as const;
const queueStates = ["Ready", "Needs approval", "Needs source reset"] as const;

export function RollbackScenarioCreatePanel() {
  const router = useRouter();
  const [asset, setAsset] = useState("Riddra Launch Readiness");
  const [change, setChange] = useState("Launch-readiness blockers and signoff posture updated");
  const [risk, setRisk] = useState<(typeof risks)[number]>("Medium");
  const [fallback, setFallback] = useState("Restore prior signoff copy and re-open launch-day blocker review.");
  const [lastKnownGood, setLastKnownGood] = useState("Launch packet snapshot from Apr 15, 2026");
  const [queueState, setQueueState] = useState<(typeof queueStates)[number]>("Needs approval");
  const [routeTarget, setRouteTarget] = useState("/launch-readiness");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createRollbackScenario() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/rollback-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          change,
          risk,
          fallback,
          lastKnownGood,
          queueState,
          routeTarget,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create rollback scenario.");
      }

      setMessage("Created rollback scenario through the unified rollback admin route.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create rollback scenario.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Create rollback scenario</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This appends new rollback coverage into the shared editorial memory store so recovery planning is not limited to the seeded starter scenarios.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Asset</span>
            <input
              value={asset}
              onChange={(event) => setAsset(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Risk</span>
            <select
              value={risk}
              onChange={(event) => setRisk(event.target.value as (typeof risks)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {risks.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Change</span>
            <textarea
              value={change}
              onChange={(event) => setChange(event.target.value)}
              className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Fallback</span>
            <textarea
              value={fallback}
              onChange={(event) => setFallback(event.target.value)}
              className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Last known good</span>
            <input
              value={lastKnownGood}
              onChange={(event) => setLastKnownGood(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Queue state</span>
            <select
              value={queueState}
              onChange={(event) => setQueueState(event.target.value as (typeof queueStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {queueStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Route target</span>
            <input
              value={routeTarget}
              onChange={(event) => setRouteTarget(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={createRollbackScenario}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create rollback scenario"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same rollback lane used by the revisions and rollback-center desks."}</p>
        </div>
      </div>
    </div>
  );
}
