"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { InboxItem } from "@/lib/account-inbox";

type InboxItemUpdatePanelProps = {
  items: InboxItem[];
};

const priorities = ["High", "Medium", "Low"] as const;
const statuses = ["Unread", "Reviewed", "Needs action"] as const;

export function InboxItemUpdatePanel({ items }: InboxItemUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const activeItem = useMemo(() => items.find((item) => item.title === title) ?? initialItem, [initialItem, items, title]);
  const [source, setSource] = useState(activeItem?.source ?? "");
  const [timestamp, setTimestamp] = useState(activeItem?.timestamp ?? "");
  const [priority, setPriority] = useState<(typeof priorities)[number]>(activeItem?.priority ?? "Medium");
  const [status, setStatus] = useState<(typeof statuses)[number]>(activeItem?.status ?? "Unread");
  const [summary, setSummary] = useState(activeItem?.summary ?? "");
  const [actionLabel, setActionLabel] = useState(activeItem?.actionLabel ?? "");
  const [actionHref, setActionHref] = useState(activeItem?.actionHref ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function storageLabel(mode?: string | null) {
    return mode === "supabase_private_beta"
      ? "shared private-beta workspace lane"
      : "fallback workspace file";
  }

  async function saveInboxItem() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/inbox/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          source,
          timestamp,
          priority,
          status,
          summary,
          actionLabel,
          actionHref,
        }),
      });

      const payload = (await response.json()) as { error?: string; storageMode?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save inbox item.");
      }

      setMessage(`Saved inbox item into the ${storageLabel(payload.storageMode)}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save inbox item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Save inbox item</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This writes account-inbox posture into the shared workspace store so action items stop behaving like a fixed preview queue.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Inbox title</span>
            <input
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                const nextItem = items.find((item) => item.title === nextTitle);
                setTitle(nextTitle);
                if (nextItem) {
                  setSource(nextItem.source);
                  setTimestamp(nextItem.timestamp);
                  setPriority(nextItem.priority);
                  setStatus(nextItem.status);
                  setSummary(nextItem.summary);
                  setActionLabel(nextItem.actionLabel);
                  setActionHref(nextItem.actionHref);
                }
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
              list="inbox-item-titles"
            />
            <datalist id="inbox-item-titles">
              {items.map((item) => (
                <option key={item.title} value={item.title} />
              ))}
            </datalist>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Source</span>
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
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
            <span>Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as (typeof priorities)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {priorities.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
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
          <label className="space-y-2 text-sm text-mist/78">
            <span>Action label</span>
            <input
              value={actionLabel}
              onChange={(event) => setActionLabel(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Action href</span>
            <input
              value={actionHref}
              onChange={(event) => setActionHref(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveInboxItem}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save inbox item"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same workspace lane used by alert delivery and subscriber action queues."}</p>
        </div>
      </div>
    </div>
  );
}
