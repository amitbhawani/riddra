"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkspaceConsentItem = {
  title: string;
  status: string;
  summary: string;
};

type WorkspaceConsentItemManagePanelProps = {
  items: WorkspaceConsentItem[];
};

export function WorkspaceConsentItemManagePanel({ items }: WorkspaceConsentItemManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);

  async function removeItem(title: string) {
    setPendingTitle(title);
    setMessage(null);

    try {
      const response = await fetch("/api/account/consents/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json()) as {
        error?: string;
        alertDelivery?: {
          status?: "queued" | "not_queued";
          detail?: string;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove consent item.");
      }

      setMessage(payload.alertDelivery?.detail ?? `Removed ${title} from the shared consent workspace lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove consent item.");
    } finally {
      setPendingTitle(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage consent items</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale consent rows from the shared workspace lane when consent posture needs cleanup instead of only more saved preview items.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.status} · {item.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.title)}
                disabled={pendingTitle === item.title}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingTitle === item.title ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the consent workspace lane from staying append-only after delivery and consent-update flows."}
        </p>
      </div>
    </div>
  );
}
