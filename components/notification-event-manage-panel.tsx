"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type NotificationEventManagePanelProps = {
  description?: string;
  emptyMessage?: string;
  endpoint?: string;
  items: Array<{
    id: string;
    title: string;
    channel: string;
    deliveryState: string;
  }>;
  title?: string;
};

export function NotificationEventManagePanel({
  description = "Remove stale delivery rows from the shared notification-event store when consent-aware messaging needs cleanup instead of only more event appends.",
  emptyMessage = "Keeps the notification-event lane from staying append-only after channel-update and event-create flows.",
  endpoint = "/api/account/consents/events",
  items,
  title = "Manage delivery events",
}: NotificationEventManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function removeEvent(id: string, title: string) {
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
        throw new Error(payload.error ?? "Unable to remove notification event.");
      }

      setMessage(`Removed ${title} from the notification-event backend lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove notification event.");
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
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.channel} · {item.deliveryState}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeEvent(item.id, item.title)}
                disabled={pendingId === item.id}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingId === item.id ? "Removing…" : "Remove"}
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
