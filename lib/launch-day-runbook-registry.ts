import {
  launchDayRunbookFallbacks,
  launchDayRunbookItems,
} from "@/lib/launch-day-runbook";
import { getLaunchExecutionQueue } from "@/lib/launch-execution-queue";

export type LaunchDayRunbookRegistryStatus = "Ready" | "In progress" | "Blocked";

export type LaunchDayRunbookRegistryRow = {
  lane: "Runbook step" | "Execution queue" | "Fallback action";
  label: string;
  status: LaunchDayRunbookRegistryStatus;
  href: string;
  note: string;
  source: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function mapRunbookStatus(status: string): LaunchDayRunbookRegistryStatus {
  if (status === "Recommended") {
    return "Ready";
  }

  return "In progress";
}

function mapQueueStatus(status: string): LaunchDayRunbookRegistryStatus {
  if (status === "Blocked") {
    return "Blocked";
  }

  if (status === "Ready to run" || status === "Ready to test") {
    return "Ready";
  }

  return "In progress";
}

export function getLaunchDayRunbookRegistryRows(): LaunchDayRunbookRegistryRow[] {
  const queue = getLaunchExecutionQueue();

  const stepRows: LaunchDayRunbookRegistryRow[] = launchDayRunbookItems.map((item) => ({
    lane: "Runbook step",
    label: item.step,
    status: mapRunbookStatus(item.status),
    href: "/admin/launch-day-runbook",
    note: item.summary,
    source: "Launch day runbook",
  }));

  const queueRows: LaunchDayRunbookRegistryRow[] = queue.items.map((item) => ({
    lane: "Execution queue",
    label: `${item.type}: ${item.title}`,
    status: mapQueueStatus(item.status),
    href: item.href,
    note: `${item.detail} Owner: ${item.owner}.`,
    source: "Launch execution queue",
  }));

  const fallbackRows: LaunchDayRunbookRegistryRow[] = launchDayRunbookFallbacks.map((item) => ({
    lane: "Fallback action",
    label: item,
    status: "In progress",
    href: "/admin/launch-day-runbook",
    note: "Keep this fallback explicit during the monitored launch window so rollback decisions are deliberate, not improvised.",
    source: "Launch day fallback policy",
  }));

  return [...stepRows, ...queueRows, ...fallbackRows];
}

export function getLaunchDayRunbookRegistrySummary() {
  const rows = getLaunchDayRunbookRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toLaunchDayRunbookCsv(rows: LaunchDayRunbookRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];
  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
