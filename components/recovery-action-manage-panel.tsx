"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecoveryActionManagePanelProps = {
  actions: Array<{
    title: string;
    channel: string;
    status: string;
  }>;
  endpoint?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
};

export function RecoveryActionManagePanel({
  actions,
  endpoint = "/api/account/billing/recovery/actions",
  title = "Manage recovery actions",
  description = "Remove stale reminder and support rows from the subscriber recovery lane when cleanup is needed instead of more recovery-action appends.",
  emptyMessage = "Keeps the recovery lane from staying append-only after create and update flows.",
}: RecoveryActionManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);

  async function removeAction(title: string) {
    setPendingTitle(title);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove recovery action.");
      }

      setMessage(`Removed ${title} from the subscriber recovery lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove recovery action.");
    } finally {
      setPendingTitle(null);
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
          {actions.map((action) => (
            <div
              key={action.title}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{action.title}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {action.channel} · {action.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAction(action.title)}
                disabled={pendingTitle === action.title}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingTitle === action.title ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? emptyMessage}
        </p>
      </div>
    </div>
  );
}
