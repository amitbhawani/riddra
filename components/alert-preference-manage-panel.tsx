"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AlertPreference } from "@/lib/alerts";

export function AlertPreferenceManagePanel({ items }: { items: AlertPreference[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  function storageLabel(mode?: string | null) {
    return mode === "supabase_private_beta"
      ? "shared private-beta workspace lane"
      : "fallback workspace file";
  }

  async function removePreference(label: string) {
    setPendingLabel(label);
    setMessage(null);

    try {
      const response = await fetch("/api/account/alerts/preferences", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const payload = (await response.json()) as { error?: string; storageMode?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove alert preference.");
      }

      setMessage(`Removed ${label} from the ${storageLabel(payload.storageMode)}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove alert preference.");
    } finally {
      setPendingLabel(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Manage alert preferences</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale preference rows from the shared workspace lane when the alert-defaults model needs cleanup instead of only more saved state.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.defaultState} · {item.note}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removePreference(item.label)}
                disabled={pendingLabel === item.label}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingLabel === item.label ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the alert-preference lane from behaving like save-only preview memory after preference updates."}
        </p>
      </div>
    </div>
  );
}
