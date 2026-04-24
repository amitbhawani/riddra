"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BrokerLinkedAccount = {
  brokerName: string;
  accountLabel: string;
  linkageState: string;
  lastSyncAt: string;
};

export function BrokerLinkedAccountManagePanel({ linkedAccounts }: { linkedAccounts: BrokerLinkedAccount[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function removeLinkedAccount(brokerName: string, accountLabel: string) {
    const key = `${brokerName}-${accountLabel}`;
    setPendingKey(key);
    setMessage(null);

    try {
      const response = await fetch("/api/account/brokers/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokerName, accountLabel }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove broker linked account.");
      }

      setMessage(`Removed ${brokerName} · ${accountLabel} from the linked-account lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove broker linked account.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Manage linked broker accounts</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale linked-account rows from the same file-backed broker-sync lane instead of letting account
            linkage posture drift away from the real review queue.
          </p>
        </div>
        <div className="grid gap-3">
          {linkedAccounts.length > 0 ? (
            linkedAccounts.map((item) => {
              const key = `${item.brokerName}-${item.accountLabel}`;
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.brokerName}</p>
                    <p className="mt-1 text-xs text-mist/60">
                      {item.accountLabel} · {item.linkageState} · {item.lastSyncAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLinkedAccount(item.brokerName, item.accountLabel)}
                    disabled={pendingKey === key}
                    className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingKey === key ? "Removing…" : "Remove"}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-mist/72">
              No linked broker accounts have been saved for this account yet.
            </div>
          )}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the linked-account lane from behaving like append-only preview memory."}
        </p>
      </div>
    </div>
  );
}
