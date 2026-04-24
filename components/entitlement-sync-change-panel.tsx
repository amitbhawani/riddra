"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type EntitlementOption = {
  featureCode: string;
  route: string;
  accessLevel: string;
};

type EntitlementSyncChangePanelProps = {
  actionLabel?: string;
  description?: string;
  endpoint?: string;
  items: EntitlementOption[];
  title?: string;
};

const syncStates = ["Synced", "Needs review"] as const;
const accessLevels = ["starter", "pro", "elite", "grace_period", "locked", "planned"] as const;
const actorTypes = ["system", "support", "ops"] as const;

export function EntitlementSyncChangePanel({
  actionLabel = "Record sync change",
  description = "This appends a real sync-history row and updates the current access level in the file-backed entitlement lane instead of leaving access transitions implied by static examples.",
  endpoint = "/api/account/access/entitlements/sync-change",
  items,
  title = "Record entitlement sync change",
}: EntitlementSyncChangePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [featureCode, setFeatureCode] = useState(initialItem?.featureCode ?? "workspace_memory");
  const [nextLevel, setNextLevel] = useState(initialItem?.accessLevel ?? "starter");
  const [syncState, setSyncState] = useState<(typeof syncStates)[number]>("Synced");
  const [actorType, setActorType] = useState<(typeof actorTypes)[number]>("system");
  const [actorRef, setActorRef] = useState("billing_sync_preview");
  const [reason, setReason] = useState("subscription.charged");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const activeItem = useMemo(
    () => items.find((item) => item.featureCode === featureCode) ?? initialItem ?? { featureCode, route: "/account/access", accessLevel: nextLevel },
    [featureCode, initialItem, items, nextLevel],
  );

  async function saveSyncChange() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureCode,
          nextLevel,
          reason,
          syncState,
          actorType,
          actorRef,
          route: activeItem.route,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record entitlement sync change.");
      }

      setMessage("Recorded the entitlement sync change and refreshed the audit history.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record entitlement sync change.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Feature</span>
            <select
              value={featureCode}
              onChange={(event) => {
                const nextFeatureCode = event.target.value;
                const nextItem = items.find((item) => item.featureCode === nextFeatureCode);
                setFeatureCode(nextFeatureCode);
                setNextLevel(nextItem?.accessLevel ?? "starter");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.featureCode} value={item.featureCode} className="bg-slate-950">
                  {item.featureCode}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Next access level</span>
            <select
              value={nextLevel}
              onChange={(event) => setNextLevel(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {accessLevels.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Sync state</span>
            <select
              value={syncState}
              onChange={(event) => setSyncState(event.target.value as (typeof syncStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {syncStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Actor type</span>
            <select
              value={actorType}
              onChange={(event) => setActorType(event.target.value as (typeof actorTypes)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {actorTypes.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Actor reference</span>
            <input
              value={actorRef}
              onChange={(event) => setActorRef(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Reason</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-mist/74">
          Route target: <span className="text-white">{activeItem.route}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveSyncChange}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : actionLabel}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same file-backed entitlement lane used by subscriber and admin audit routes."}</p>
        </div>
      </div>
    </div>
  );
}
