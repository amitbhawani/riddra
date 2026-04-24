import type { User } from "@supabase/supabase-js";

import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export type SubscriberWorkspaceRegistryScope = "account" | "admin";

export type SubscriberWorkspaceRegistrySummary = {
  scope: SubscriberWorkspaceRegistryScope;
  totalRows: number;
  watchlists: number;
  alertPreferences: number;
  alertFeed: number;
  screens: number;
  inbox: number;
  consents: number;
  activities: number;
};

export type SubscriberWorkspaceRegistryRow = {
  kind: "watchlist" | "alert_preference" | "alert_feed" | "screen" | "inbox" | "consent" | "activity";
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

function getWorkspaceActivityHref(scope: "workspace" | "watchlist" | "screen" | "alert_preference" | "alert_feed" | "inbox" | "consent") {
  switch (scope) {
    case "watchlist":
      return "/account/watchlists";
    case "screen":
      return "/account/screens";
    case "alert_preference":
    case "alert_feed":
      return "/account/alerts";
    case "inbox":
      return "/account/inbox";
    case "consent":
      return "/account/consents";
    case "workspace":
    default:
      return "/account/workspace";
  }
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getSubscriberWorkspaceRegistryRows(
  user: Pick<User, "id" | "email">,
  scope: SubscriberWorkspaceRegistryScope = "account",
): Promise<SubscriberWorkspaceRegistryRow[]> {
  const memory = await getSubscriberWorkspaceMemory(user);

  const watchlistRows = memory.watchlists.map((item) => ({
    kind: "watchlist" as const,
    title: item.title,
    href: "/account/watchlists",
    status: `${item.assetCount} assets`,
    owner: scope === "admin" ? "Workspace Ops · watchlists" : "Workspace watchlists",
    note: `${item.linkedAlerts} linked alerts · ${item.note}`,
  }));

  const alertPreferenceRows = memory.alertPreferences.map((item) => ({
    kind: "alert_preference" as const,
    title: item.label,
    href: "/account/alerts",
    status: item.defaultState,
    owner: scope === "admin" ? "Workspace Ops · alert preference" : "Alert preference",
    note: item.note,
  }));

  const alertFeedRows = memory.alertFeed.map((item) => ({
    kind: "alert_feed" as const,
    title: item.title,
    href: "/account/alerts",
    status: item.status,
    owner: scope === "admin" ? `Workspace Ops · ${item.channel}` : item.channel,
    note: `${item.timestamp} · ${item.summary}`,
  }));

  const screenRows = memory.savedScreens.map((item) => ({
    kind: "screen" as const,
    title: item.title,
    href: "/account/screens",
    status: item.type,
    owner:
      scope === "admin"
        ? `Workspace Ops · ${item.repeatRunCapable ? "Repeat-capable" : "Manual review"}`
        : item.repeatRunCapable
          ? "Repeat-capable"
          : "Manual review",
    note: `${item.sharedLayout ? "Shared layout" : "Private layout"} · ${item.note}`,
  }));

  const inboxRows = memory.inboxItems.map((item) => ({
    kind: "inbox" as const,
    title: item.title,
    href: "/account/inbox",
    status: item.status,
    owner: scope === "admin" ? `Workspace Ops · ${item.source} · ${item.priority}` : `${item.source} · ${item.priority}`,
    note: `${item.timestamp} · ${item.summary}`,
  }));

  const consentRows = memory.consentItems.map((item) => ({
    kind: "consent" as const,
    title: item.title,
    href: "/account/consents",
    status: item.status,
    owner: scope === "admin" ? "Workspace Ops · consent posture" : "Consent posture",
    note: item.summary,
  }));

  const activityRows = memory.activityLog.map((item) => ({
    kind: "activity" as const,
    title: item.title,
    href: getWorkspaceActivityHref(item.scope),
    status: item.action,
    owner:
      scope === "admin"
        ? `Workspace Ops · ${item.scope.replaceAll("_", " ")}`
        : item.scope.replaceAll("_", " "),
    note: `${item.timestamp} · ${item.detail}`,
  }));

  return [...watchlistRows, ...alertPreferenceRows, ...alertFeedRows, ...screenRows, ...inboxRows, ...consentRows, ...activityRows].sort(
    (left, right) => left.title.localeCompare(right.title),
  );
}

export async function getSubscriberWorkspaceRegistrySummary(
  user: Pick<User, "id" | "email">,
  scope: SubscriberWorkspaceRegistryScope = "account",
): Promise<SubscriberWorkspaceRegistrySummary> {
  const memory = await getSubscriberWorkspaceMemory(user);

  return {
    scope,
    totalRows:
      memory.watchlists.length +
      memory.alertPreferences.length +
      memory.alertFeed.length +
      memory.savedScreens.length +
      memory.inboxItems.length +
      memory.consentItems.length +
      memory.activityLog.length,
    watchlists: memory.watchlists.length,
    alertPreferences: memory.alertPreferences.length,
    alertFeed: memory.alertFeed.length,
    screens: memory.savedScreens.length,
    inbox: memory.inboxItems.length,
    consents: memory.consentItems.length,
    activities: memory.activityLog.length,
  };
}

export function toSubscriberWorkspaceRegistryCsv(rows: SubscriberWorkspaceRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
