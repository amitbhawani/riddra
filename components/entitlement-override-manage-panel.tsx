"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EntitlementOverrideManagePanelProps = {
  endpoint?: string;
  emptyMessage?: string;
  items: Array<{
    id: string;
    actorType: string;
    changedAt: string;
    featureCode: string;
    nextLevel: string;
  }>;
  title?: string;
  description?: string;
};

export function EntitlementOverrideManagePanel({
  endpoint = "/api/account/access/entitlements/override",
  emptyMessage = "No manual overrides need cleanup right now.",
  items,
  title = "Manage manual entitlement overrides",
  description = "Remove stale support or ops override rows through the dedicated override API when this lane needs cleanup instead of only more appended override history.",
}: EntitlementOverrideManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function removeOverride(id: string, featureCode: string) {
    setPendingId(id);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove entitlement override.");
      }

      setMessage(`Removed the ${featureCode} override row from the entitlement backend lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove entitlement override.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.featureCode}</p>
                  <p className="mt-1 text-xs text-mist/60">
                    {item.nextLevel} · {item.actorType} · {item.changedAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeOverride(item.id, item.featureCode)}
                  disabled={pendingId === item.id}
                  className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingId === item.id ? "Removing…" : "Remove"}
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">
              {emptyMessage}
            </div>
          )}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps manual entitlement overrides from staying create-only after support or ops writes."}
        </p>
      </div>
    </div>
  );
}
