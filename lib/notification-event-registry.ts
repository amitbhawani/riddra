import type { User } from "@supabase/supabase-js";

import {
  getAccountNotificationEventMemory,
  getNotificationEventBusMemory,
} from "@/lib/notification-event-memory-store";

export type NotificationEventRegistryRow = {
  kind: "channel_route" | "delivery_event";
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getNotificationEventRegistryRows(
  user: Pick<User, "id" | "email">,
  scope: "account" | "admin" = "account",
): Promise<NotificationEventRegistryRow[]> {
  const [accountMemory, notificationBus] = await Promise.all([
    getAccountNotificationEventMemory(user),
    getNotificationEventBusMemory(),
  ]);

  const channelRows = accountMemory.channelRoutes.map((route) => ({
    kind: "channel_route" as const,
    title: route.channel,
    href: scope === "admin" ? "/admin/delivery-layers" : "/account/consents",
    status: `${route.consentStatus} · ${route.deliveryState}`,
    owner: route.preferenceSource,
    note: `${route.mappedScopes} · ${route.note}`,
  }));

  const eventRows = (scope === "admin" ? notificationBus.sharedEvents : accountMemory.recentEvents).map((event) => ({
    kind: "delivery_event" as const,
    title: event.title,
    href: scope === "admin" ? "/admin/delivery-layers" : "/account/consents",
    status: `${event.consentState} · ${event.deliveryState}`,
    owner: `${event.channel} · ${event.triggeredBy}`,
    note: `${event.audienceScope} · ${event.nextAttempt} · ${event.note}`,
  }));

  return [...channelRows, ...eventRows].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getNotificationEventRegistrySummary(
  user: Pick<User, "id" | "email">,
  scope: "account" | "admin" = "account",
) {
  const rows = await getNotificationEventRegistryRows(user, scope);

  return {
    totalRows: rows.length,
    channelRoutes: rows.filter((row) => row.kind === "channel_route").length,
    deliveryEvents: rows.filter((row) => row.kind === "delivery_event").length,
    blockedOrReconfirming: rows.filter(
      (row) => row.status.includes("Blocked") || row.status.includes("Needs reconfirmation"),
    ).length,
    queuedOrRetrying: rows.filter((row) => row.status.includes("Queued") || row.status.includes("Retrying")).length,
    deliveredOrHealthy: rows.filter((row) => row.status.includes("Delivered") || row.status.includes("Healthy")).length,
  };
}

export function toNotificationEventRegistryCsv(rows: NotificationEventRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
