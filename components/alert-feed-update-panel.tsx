"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AlertFeedItem } from "@/lib/alerts";

type AlertFeedUpdatePanelProps = {
  items: AlertFeedItem[];
};

const statuses = ["Sent", "Queued", "Needs review"] as const;

export function AlertFeedUpdatePanel({ items }: AlertFeedUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const activeItem = useMemo(() => items.find((item) => item.title === title) ?? initialItem, [initialItem, items, title]);
  const [timestamp, setTimestamp] = useState(activeItem?.timestamp ?? "");
  const [channel, setChannel] = useState(activeItem?.channel ?? "");
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Queued");
  const [summary, setSummary] = useState(activeItem?.summary ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function storageLabel(mode?: string | null) {
    return mode === "supabase_private_beta"
      ? "shared private-beta workspace lane"
      : "fallback workspace file";
  }

  async function saveFeedItem() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/alerts/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          timestamp,
          channel,
          status,
          summary,
        }),
      });

      const payload = (await response.json()) as { error?: string; storageMode?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save alert feed item.");
      }

      setMessage(`Saved alert feed item into the ${storageLabel(payload.storageMode)}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save alert feed item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Save alert feed item</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This writes alert-feed posture into the workspace store so signal history stops behaving like a fixed preview block.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Alert title</span>
            <input
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                const nextItem = items.find((item) => item.title === nextTitle);
                setTitle(nextTitle);
                if (nextItem) {
                  setTimestamp(nextItem.timestamp);
                  setChannel(nextItem.channel);
                  setStatus(nextItem.status);
                  setSummary(nextItem.summary);
                }
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
              list="alert-feed-titles"
            />
            <datalist id="alert-feed-titles">
              {items.map((item) => (
                <option key={item.title} value={item.title} />
              ))}
            </datalist>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Timestamp</span>
            <input
              value={timestamp}
              onChange={(event) => setTimestamp(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Channel</span>
            <input
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {statuses.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Summary</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveFeedItem}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save alert item"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same workspace lane used by alerts and the subscriber inbox."}</p>
        </div>
      </div>
    </div>
  );
}
