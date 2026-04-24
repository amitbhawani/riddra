"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type NotificationEventRow = {
  title: string;
  channel: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
  audienceScope: string;
  triggeredBy: string;
  consentState: "Allowed" | "Needs reconfirmation" | "Blocked";
  deliveryState: "Queued" | "Delivered" | "Retrying" | "Suppressed";
  nextAttempt: string;
  note: string;
};

type NotificationEventCreatePanelProps = {
  actionLabel?: string;
  description?: string;
  events: NotificationEventRow[];
  endpoint?: string;
  title?: string;
};

const channels = ["Email", "WhatsApp", "SMS", "Push", "In-app"] as const;
const consentStates = ["Allowed", "Needs reconfirmation", "Blocked"] as const;
const deliveryStates = ["Queued", "Retrying", "Suppressed"] as const;

export function NotificationEventCreatePanel({
  actionLabel = "Save delivery event",
  description = "This writes a new consent-aware delivery event into the shared event bus instead of leaving delivery history as seeded preview rows only.",
  events,
  endpoint = "/api/account/consents/events",
  title: panelTitle = "Record delivery event",
}: NotificationEventCreatePanelProps) {
  const router = useRouter();
  const initialEvent = events[0];
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [channel, setChannel] = useState<NotificationEventRow["channel"]>(initialEvent?.channel ?? "Email");
  const [audienceScope, setAudienceScope] = useState(initialEvent?.audienceScope ?? "");
  const [triggeredBy, setTriggeredBy] = useState(initialEvent?.triggeredBy ?? "");
  const [consentState, setConsentState] = useState<NotificationEventRow["consentState"]>(initialEvent?.consentState ?? "Allowed");
  const [deliveryState, setDeliveryState] = useState<NotificationEventRow["deliveryState"]>(initialEvent?.deliveryState ?? "Queued");
  const [nextAttempt, setNextAttempt] = useState(initialEvent?.nextAttempt ?? "");
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
          title,
          channel,
          audienceScope,
          triggeredBy,
          consentState,
          deliveryState,
          nextAttempt,
          note,
        }),
      });
      const payload = (await response.json()) as { error?: string; job?: { id?: string } };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save notification event.");
      }

      setMessage(
        payload.job?.id
          ? `Saved the delivery event and queued follow-up job ${payload.job.id}. Final provider state will resolve after the worker runs.`
          : "Saved the delivery event and queued the durable follow-up lane. Final provider state will resolve after the worker runs.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save notification event.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{panelTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Event title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Channel</span>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value as NotificationEventRow["channel"])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {channels.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Audience scope</span>
            <input
              value={audienceScope}
              onChange={(event) => setAudienceScope(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Triggered by</span>
            <input
              value={triggeredBy}
              onChange={(event) => setTriggeredBy(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Consent state</span>
            <select
              value={consentState}
              onChange={(event) => setConsentState(event.target.value as NotificationEventRow["consentState"])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {consentStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Delivery state</span>
            <select
              value={deliveryState}
              onChange={(event) => setDeliveryState(event.target.value as NotificationEventRow["deliveryState"])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {deliveryStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
            {channel === "Email" ? (
              <p className="text-xs leading-6 text-mist/58">
                Email events are queued for provider delivery first. The durable worker updates sent or failed status after Resend responds.
              </p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Next attempt or delivery note</span>
            <input
              value={nextAttempt}
              onChange={(event) => setNextAttempt(event.target.value)}
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
          <p className="text-xs leading-6 text-mist/60">
            {message ??
              "Writes into the same shared delivery-event bus used by subscriber and admin delivery surfaces. Provider-owned delivery status is set by the durable worker, not by this form, and resolves as queued, sent, failed, or skipped."}
          </p>
        </div>
      </div>
    </div>
  );
}
