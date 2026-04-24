import type { User } from "@supabase/supabase-js";

import {
  getAccountContinuityRecord,
  type AccountContinuityRecord,
  type AccountContinuityLaneId,
} from "@/lib/account-continuity-store";

export type SubscriberWorkspaceContinuityLane = {
  id: AccountContinuityLaneId;
  title: string;
  href: string;
  storageMode: "file_backed_preview" | "file_backed_private_beta" | "supabase_private_beta";
  lastUpdatedAt: string;
  totalRows: number;
  attentionCount: number;
  healthyCount: number;
  status: "Connected" | "Needs attention";
  metric: string;
  note: string;
};

export type SubscriberWorkspaceContinuitySummary = {
  totalRows: number;
  connectedLanes: number;
  lanesNeedingAttention: number;
  openFollowUps: number;
  accountState: AccountContinuityRecord;
  lanes: SubscriberWorkspaceContinuityLane[];
};

type SubscriberWorkspaceContinuityOptions = {
  route?: string;
  action?: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function buildLaneStatus(attentionCount: number) {
  return attentionCount > 0 ? ("Needs attention" as const) : ("Connected" as const);
}

export async function getSubscriberWorkspaceContinuitySummary(
  user: Pick<User, "id" | "email">,
  options: SubscriberWorkspaceContinuityOptions = {},
): Promise<SubscriberWorkspaceContinuitySummary> {
  const accountState = await getAccountContinuityRecord(user, {
    route: options.route ?? "/account/workspace",
    action: options.action ?? "Loaded continuity summary",
  });

  const lanes = accountState.lanes.map((lane) => ({
    ...lane,
    status: buildLaneStatus(lane.attentionCount),
  }));

  return {
    totalRows: lanes.reduce((sum, lane) => sum + lane.totalRows, 0),
    connectedLanes: lanes.filter((lane) => lane.totalRows > 0).length,
    lanesNeedingAttention: lanes.filter((lane) => lane.attentionCount > 0).length,
    openFollowUps: lanes.reduce((sum, lane) => sum + lane.attentionCount, 0),
    accountState,
    lanes,
  };
}

export function toSubscriberWorkspaceContinuityCsv(summary: SubscriberWorkspaceContinuitySummary) {
  const header = [
    "lane",
    "href",
    "status",
    "storageMode",
    "lastUpdatedAt",
    "totalRows",
    "attentionCount",
    "healthyCount",
    "metric",
    "note",
    "accountKey",
    "authMode",
    "sessionReliability",
    "lastSeenAt",
    "lastRoute",
  ];
  const lines = summary.lanes.map((lane) =>
    [
      lane.title,
      lane.href,
      lane.status,
      lane.storageMode,
      lane.lastUpdatedAt,
      String(lane.totalRows),
      String(lane.attentionCount),
      String(lane.healthyCount),
      lane.metric,
      lane.note,
      summary.accountState.userKey,
      summary.accountState.auth.label,
      summary.accountState.auth.sessionReliability,
      summary.accountState.lastSeenAt,
      summary.accountState.lastRoute,
    ]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
