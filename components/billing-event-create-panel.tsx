"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BillingEventRow = {
  event: string;
  status: string;
  subject: string;
  occurredAt: string;
  note: string;
};

type BillingEventCreatePanelProps = {
  events: BillingEventRow[];
  endpoint?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
};

const eventPresets = [
  "subscription.charged",
  "subscription.renewal_scheduled",
  "payment.failed",
  "subscription.activated",
  "subscription.cancelled",
] as const;

const statusPresets = ["Processed", "Pending", "Needs review"] as const;

export function BillingEventCreatePanel({
  actionLabel = "Save billing event",
  description = "This appends a real payment-event row into the shared billing-memory store so billing continuity can be reviewed through event history, not only invoice rows.",
  endpoint = "/api/account/billing/events",
  events,
  title = "Record billing event",
}: BillingEventCreatePanelProps) {
  const router = useRouter();
  const initialEvent = events[0];
  const [event, setEvent] = useState(initialEvent?.event ?? "subscription.charged");
  const [status, setStatus] = useState(initialEvent?.status ?? "Processed");
  const [subject, setSubject] = useState(initialEvent?.subject ?? "");
  const [note, setNote] = useState(initialEvent?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveEvent() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          status,
          subject,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save billing event.");
      }

      setMessage("Saved the billing event into the shared billing-history lane.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save billing event.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Event</span>
            <select
              value={event}
              onChange={(event) => setEvent(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {eventPresets.map((item) => (
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
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {statusPresets.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Operator note</span>
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
            onClick={saveEvent}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : actionLabel}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same shared billing-memory lane used by subscriber and admin billing views."}</p>
        </div>
      </div>
    </div>
  );
}
