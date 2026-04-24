"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ConsentChannelRoute = {
  channel: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
  mappedScopes: string;
  consentStatus: "Allowed" | "Needs reconfirmation" | "Blocked";
  deliveryState: "Healthy" | "Retry watch" | "Suppressed";
  preferenceSource: string;
  note: string;
};

type ConsentChannelUpdatePanelProps = {
  actionLabel?: string;
  description?: string;
  endpoint?: string;
  routes: ConsentChannelRoute[];
  title?: string;
};

const consentStatuses = ["Allowed", "Needs reconfirmation", "Blocked"] as const;
const deliveryStates = ["Healthy", "Retry watch", "Suppressed"] as const;

export function ConsentChannelUpdatePanel({
  actionLabel = "Save channel mapping",
  description = "This writes delivery-channel preference posture into the shared notification-event store instead of leaving consent routing as read-only preview copy.",
  endpoint = "/api/account/consents/channels",
  routes,
  title = "Update consent channel mapping",
}: ConsentChannelUpdatePanelProps) {
  const router = useRouter();
  const initialRoute = routes[0];
  const [channel, setChannel] = useState<ConsentChannelRoute["channel"]>(initialRoute?.channel ?? "Email");
  const activeRoute = routes.find((item) => item.channel === channel) ?? initialRoute;
  const [mappedScopes, setMappedScopes] = useState(activeRoute?.mappedScopes ?? "");
  const [consentStatus, setConsentStatus] = useState<(typeof consentStatuses)[number]>(activeRoute?.consentStatus ?? "Allowed");
  const [deliveryState, setDeliveryState] = useState<(typeof deliveryStates)[number]>(activeRoute?.deliveryState ?? "Healthy");
  const [preferenceSource, setPreferenceSource] = useState(activeRoute?.preferenceSource ?? "");
  const [note, setNote] = useState(activeRoute?.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveChannelRoute() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          mappedScopes,
          consentStatus,
          deliveryState,
          preferenceSource,
          note,
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
        throw new Error(payload.error ?? "Unable to save channel mapping.");
      }

      setMessage(payload.alertDelivery?.detail ?? "Saved consent-channel posture into the notification-event backend lane.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save channel mapping.");
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
            <span>Channel</span>
            <select
              value={channel}
              onChange={(event) => {
                const nextChannel = event.target.value as ConsentChannelRoute["channel"];
                const nextRoute = routes.find((item) => item.channel === nextChannel);
                setChannel(nextChannel);
                setMappedScopes(nextRoute?.mappedScopes ?? "");
                setConsentStatus(nextRoute?.consentStatus ?? "Allowed");
                setDeliveryState(nextRoute?.deliveryState ?? "Healthy");
                setPreferenceSource(nextRoute?.preferenceSource ?? "");
                setNote(nextRoute?.note ?? "");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {routes.map((item) => (
                <option key={item.channel} value={item.channel} className="bg-slate-950">
                  {item.channel}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Consent status</span>
            <select
              value={consentStatus}
              onChange={(event) => setConsentStatus(event.target.value as (typeof consentStatuses)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {consentStatuses.map((item) => (
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
              onChange={(event) => setDeliveryState(event.target.value as (typeof deliveryStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {deliveryStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Preference source</span>
            <input
              value={preferenceSource}
              onChange={(event) => setPreferenceSource(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Mapped scopes</span>
            <textarea
              value={mappedScopes}
              onChange={(event) => setMappedScopes(event.target.value)}
              className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
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
            onClick={saveChannelRoute}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : actionLabel}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same consent-aware delivery lane used by subscriber and admin delivery pages."}</p>
        </div>
      </div>
    </div>
  );
}
