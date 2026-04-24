"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ConsentChannelRoute = {
  channel: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
  mappedScopes: string;
  consentStatus: "Allowed" | "Needs reconfirmation" | "Blocked";
  deliveryState: "Healthy" | "Retry watch" | "Suppressed";
};

type ConsentChannelManagePanelProps = {
  description?: string;
  emptyMessage?: string;
  endpoint?: string;
  routes: ConsentChannelRoute[];
  title?: string;
};

export function ConsentChannelManagePanel({
  description = "Remove stale channel mappings from the shared consent-aware delivery lane when routing posture needs cleanup instead of only more saved channel state.",
  emptyMessage = "Keeps the consent-channel routing lane from behaving like append-only preview memory after routing updates.",
  endpoint = "/api/account/consents/channels",
  routes,
  title = "Manage consent channel routing",
}: ConsentChannelManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingChannel, setPendingChannel] = useState<ConsentChannelRoute["channel"] | null>(null);

  async function removeChannelRoute(channel: ConsentChannelRoute["channel"]) {
    setPendingChannel(channel);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const payload = (await response.json()) as {
        error?: string;
        alertDelivery?: {
          status?: "queued" | "not_queued";
          detail?: string;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove channel mapping.");
      }

      setMessage(payload.alertDelivery?.detail ?? `Removed ${channel} from the consent-channel routing lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove channel mapping.");
    } finally {
      setPendingChannel(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3">
          {routes.map((route) => (
            <div
              key={route.channel}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{route.channel}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {route.mappedScopes} · {route.consentStatus} · {route.deliveryState}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeChannelRoute(route.channel)}
                disabled={pendingChannel === route.channel}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingChannel === route.channel ? "Removing…" : "Remove"}
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
