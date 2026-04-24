"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type WorkspaceConsentItem = {
  title: string;
  status: string;
  summary: string;
};

type WorkspaceConsentItemUpdatePanelProps = {
  items: WorkspaceConsentItem[];
};

const consentStatuses = ["Active preview", "Needs reconfirmation", "Blocked", "Planned"] as const;

export function WorkspaceConsentItemUpdatePanel({ items }: WorkspaceConsentItemUpdatePanelProps) {
  const router = useRouter();
  const initialItem = items[0];
  const [title, setTitle] = useState(initialItem?.title ?? "Consent policy");
  const [status, setStatus] = useState(initialItem?.status ?? consentStatuses[0]);
  const [summary, setSummary] = useState(initialItem?.summary ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const activeItem = useMemo(() => items.find((item) => item.title === title) ?? initialItem, [initialItem, items, title]);

  async function saveConsentItem() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/consents/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          summary,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        alertDelivery?: {
          status?: "queued" | "not_queued";
          detail?: string;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save consent item.");
      }

      setMessage(payload.alertDelivery?.detail ?? "Saved consent posture into the shared workspace backend lane.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save consent item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Update consent workspace item</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            This writes subscriber-facing consent posture into the shared workspace store, so consent summaries and recent activity stay aligned with the delivery-event lane.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Consent item</span>
            <select
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                const nextItem = items.find((item) => item.title === nextTitle);
                setTitle(nextTitle);
                setStatus(nextItem?.status ?? consentStatuses[0]);
                setSummary(nextItem?.summary ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {items.map((item) => (
                <option key={item.title} value={item.title} className="bg-slate-950">
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {Array.from(new Set([activeItem?.status, ...consentStatuses].filter(Boolean))).map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Subscriber-facing summary</span>
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
            onClick={saveConsentItem}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save consent item"}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same workspace lane used by alerts, inbox, watchlists, and saved screens."}</p>
        </div>
      </div>
    </div>
  );
}
