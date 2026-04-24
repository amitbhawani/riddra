import type { User } from "@supabase/supabase-js";

import { getBrokerSyncMemory } from "@/lib/broker-sync-memory-store";

export type BrokerSyncRegistryScope = "account" | "admin";

export type BrokerSyncRegistryRow = {
  kind: "broker_target" | "sync_run" | "linked_account" | "review_item" | "activity";
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

function getBrokerActivityHref(scope: "broker_sync" | "sync_run" | "review_item" | "linked_account") {
  switch (scope) {
    case "review_item":
      return "/account/brokers/review";
    case "linked_account":
    case "sync_run":
    case "broker_sync":
    default:
      return "/account/brokers";
  }
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getBrokerSyncRegistryRows(
  user: Pick<User, "id" | "email">,
  scope: BrokerSyncRegistryScope = "account",
): Promise<BrokerSyncRegistryRow[]> {
  const memory = await getBrokerSyncMemory(user);

  const targetRows = memory.targets.map((target) => ({
    kind: "broker_target" as const,
    title: target.brokerName,
    href: "/account/brokers",
    status: target.status,
    owner: scope === "admin" ? `Broker Ops · ${target.tokenState} · ${target.syncMode}` : `${target.tokenState} · ${target.syncMode}`,
    note: target.note,
  }));

  const syncRunRows = memory.syncRuns.map((run) => ({
    kind: "sync_run" as const,
    title: `${run.broker} sync window`,
    href: "/account/brokers",
    status: run.queueState,
    owner: scope === "admin" ? `Broker Ops · ${run.accountScope}` : run.accountScope,
    note: `${run.nextWindow} · ${run.note}`,
  }));

  const linkedAccountRows = memory.linkedAccounts.map((item) => ({
    kind: "linked_account" as const,
    title: `${item.brokerName} linked account`,
    href: "/account/brokers",
    status: item.linkageState,
    owner: scope === "admin" ? `Broker Ops · ${item.accountLabel}` : item.accountLabel,
    note: `${item.lastSyncAt} · ${item.note}`,
  }));

  const reviewRows = memory.reviewItems.map((item) => ({
    kind: "review_item" as const,
    title: `${item.broker} review`,
    href: "/account/brokers/review",
    status: item.reviewState,
    owner:
      scope === "admin"
        ? `Broker Ops · ${item.queueLane} · ${item.sourceRef}`
        : `${item.queueLane} · ${item.sourceRef}`,
    note: `${item.issue} · ${item.action}`,
  }));

  const activityRows = memory.activityLog.map((item) => ({
    kind: "activity" as const,
    title: item.title,
    href: getBrokerActivityHref(item.scope),
    status: item.action,
    owner:
      scope === "admin"
        ? `Broker Ops · ${item.scope.replaceAll("_", " ")}`
        : item.scope.replaceAll("_", " "),
    note: `${item.timestamp} · ${item.detail}`,
  }));

  return [...targetRows, ...syncRunRows, ...linkedAccountRows, ...reviewRows, ...activityRows].sort((left, right) =>
    left.title.localeCompare(right.title),
  );
}

export async function getBrokerSyncRegistrySummary(
  user: Pick<User, "id" | "email">,
  scope: BrokerSyncRegistryScope = "account",
) {
  const memory = await getBrokerSyncMemory(user);

  return {
    scope,
    totalRows:
      memory.targets.length +
      memory.syncRuns.length +
      memory.linkedAccounts.length +
      memory.reviewItems.length +
      memory.activityLog.length,
    priorityTargets: memory.targets.filter((target) => target.status === "Priority").length,
    syncRuns: memory.syncRuns.length,
    linkedAccounts: memory.linkedAccounts.length,
    reviewQueue: memory.reviewItems.length,
    activeSyncQueues: memory.syncRuns.filter((run) => run.queueState !== "Ready to rerun").length,
    activities: memory.activityLog.length,
  };
}

export function toBrokerSyncRegistryCsv(rows: BrokerSyncRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
