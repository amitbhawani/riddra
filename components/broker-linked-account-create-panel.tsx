"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const linkageStates = ["Sandbox linked", "Needs verification", "CSV fallback"] as const;

export function BrokerLinkedAccountCreatePanel() {
  const router = useRouter();
  const [brokerName, setBrokerName] = useState("Groww");
  const [accountLabel, setAccountLabel] = useState("Tax-saving account");
  const [linkageState, setLinkageState] = useState<(typeof linkageStates)[number]>("Needs verification");
  const [lastSyncAt, setLastSyncAt] = useState("Apr 16, 2026 · 5:15 PM");
  const [note, setNote] = useState(
    "Track this broker account as a persisted linkage candidate while approvals and quantity checks still route through the review queue.",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function storageLabel(storageMode?: string | null) {
    return storageMode === "supabase_private_beta"
      ? "shared private-beta broker lane"
      : "fallback broker-sync store";
  }

  async function createLinkedAccount() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/brokers/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokerName, accountLabel, linkageState, lastSyncAt, note }),
      });
      const payload = (await response.json()) as { error?: string; storageMode?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create broker linked account.");
      }

      setMessage(`Broker linked account written to the ${storageLabel(payload.storageMode)}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create broker linked account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Create linked broker account</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Append a persisted linked-account row into the shared broker-sync memory lane instead of leaving account
            linkage implied by sync runs alone.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Broker name</span>
            <input
              value={brokerName}
              onChange={(event) => setBrokerName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Account label</span>
            <input
              value={accountLabel}
              onChange={(event) => setAccountLabel(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Linkage state</span>
            <select
              value={linkageState}
              onChange={(event) => setLinkageState(event.target.value as (typeof linkageStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {linkageStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Last sync checkpoint</span>
            <input
              value={lastSyncAt}
              onChange={(event) => setLastSyncAt(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Operator note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={createLinkedAccount}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create linked account"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "This now appends linked broker accounts into the same persisted broker lane used by targets, sync runs, and review items."}
          </p>
        </div>
      </div>
    </div>
  );
}
