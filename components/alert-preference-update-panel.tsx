"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AlertPreference } from "@/lib/alerts";

type AlertPreferenceUpdatePanelProps = {
  items: AlertPreference[];
};

const states = ["On", "Off", "Priority"] as const;

export function AlertPreferenceUpdatePanel({ items }: AlertPreferenceUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [label, setLabel] = useState(initialItem?.label ?? "");
  const activeItem = useMemo(() => items.find((item) => item.label === label) ?? initialItem, [initialItem, items, label]);
  const [defaultState, setDefaultState] = useState<(typeof states)[number]>(activeItem?.defaultState ?? "On");
  const [note, setNote] = useState(activeItem?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function storageLabel(mode?: string | null) {
    return mode === "supabase_private_beta"
      ? "shared private-beta workspace lane"
      : "fallback workspace file";
  }

  async function savePreference() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/alerts/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          defaultState,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string; storageMode?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save alert preference.");
      }

      setMessage(`Saved alert preference into the ${storageLabel(payload.storageMode)}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save alert preference.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Update alert preference</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This writes alert-preference posture into the same workspace store instead of leaving signal controls as read-only preview settings.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Preference</span>
            <select
              value={label}
              onChange={(event) => {
                const nextLabel = event.target.value;
                const nextItem = items.find((item) => item.label === nextLabel);
                setLabel(nextLabel);
                setDefaultState(nextItem?.defaultState ?? "On");
                setNote(nextItem?.note ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.label} value={item.label} className="bg-slate-950">
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Default state</span>
            <select
              value={defaultState}
              onChange={(event) => setDefaultState(event.target.value as (typeof states)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {states.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Note</span>
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
            onClick={savePreference}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save preference"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same workspace lane used by alerts, inbox, watchlists, and saved screens."}</p>
        </div>
      </div>
    </div>
  );
}
