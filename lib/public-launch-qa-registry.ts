import {
  getPublicLaunchQaItems,
  type PublicLaunchQaItem,
} from "@/lib/public-launch-qa";
import { getChartVerificationRows } from "@/lib/chart-verification-registry";
import { getLaunchDayRunbookRegistryRows } from "@/lib/launch-day-runbook-registry";
import { getLiveSmokeTestRegistryRows } from "@/lib/live-smoke-tests";
import { getMobileQaRegistryRows } from "@/lib/mobile-qa-registry";
import { getPlaceholderHonestyRows } from "@/lib/placeholder-honesty-registry";
import { getReliabilityOpsRegistryRows } from "@/lib/reliability-ops-registry";

export type PublicLaunchQaRegistryStatus = "Ready" | "In progress" | "Blocked";

export type PublicLaunchQaRegistryRow = {
  lane: "Launch QA" | "Mobile QA" | "Placeholder QA" | "Chart QA" | "Smoke QA" | "Reliability QA" | "Runbook QA";
  label: string;
  status: PublicLaunchQaRegistryStatus;
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

function mapLaunchItemSource(item: PublicLaunchQaItem) {
  if (item.href === "/admin/mobile-qa-matrix") {
    return "Public launch QA surface";
  }

  if (item.href === "/admin/release-checks") {
    return "Release checks surface";
  }

  if (item.href === "/admin/reliability-ops") {
    return "Reliability and rollback surfaces";
  }

  if (item.href === "/admin/announcement-readiness") {
    return "Announcement and trust stack";
  }

  return "Go / no-go and launch control";
}

export function getPublicLaunchQaRegistryRows(): PublicLaunchQaRegistryRow[] {
  const launchRows: PublicLaunchQaRegistryRow[] = getPublicLaunchQaItems().map((item) => ({
    lane: "Launch QA",
    label: item.title,
    status: item.status,
    href: item.href,
    note: item.note,
    source: mapLaunchItemSource(item),
  }));

  const mobileRows: PublicLaunchQaRegistryRow[] = getMobileQaRegistryRows().map((row) => ({
    lane: "Mobile QA",
    label: row.label,
    status: row.status,
    href: row.href,
    note: row.note,
    source: row.source,
  }));

  const placeholderRows: PublicLaunchQaRegistryRow[] = getPlaceholderHonestyRows().map((row) => ({
    lane: "Placeholder QA",
    label: row.label,
    status: row.status,
    href: row.href,
    note: `${row.note} Current: ${row.currentState}. Expected: ${row.expectedState}.`,
    source: `Placeholder honesty registry • ${row.cluster}`,
  }));

  const chartRows: PublicLaunchQaRegistryRow[] = getChartVerificationRows().map((row) => ({
    lane: "Chart QA",
    label: row.label,
    status: row.status,
    href: row.href,
    note: `${row.note} Current: ${row.currentState}. Next: ${row.nextStep}.`,
    source: `Chart verification registry • ${row.family}`,
  }));

  const smokeRows: PublicLaunchQaRegistryRow[] = getLiveSmokeTestRegistryRows().map((row) => ({
    lane: "Smoke QA",
    label: `${row.journey}: ${row.step}`,
    status: row.status === "Ready" ? "Ready" : row.status === "In progress" ? "In progress" : "Blocked",
    href: row.href,
    note: `${row.note} Journey status: ${row.journeyStatus}.`,
    source: `Live smoke-test registry • ${row.journey}`,
  }));

  const reliabilityRows: PublicLaunchQaRegistryRow[] = getReliabilityOpsRegistryRows().map((row) => ({
    lane: "Reliability QA",
    label: row.label,
    status: row.status,
    href: row.href,
    note: row.note,
    source: `Reliability registry • ${row.lane}`,
  }));

  const runbookRows: PublicLaunchQaRegistryRow[] = getLaunchDayRunbookRegistryRows().map((row) => ({
    lane: "Runbook QA",
    label: row.label,
    status: row.status,
    href: row.href,
    note: row.note,
    source: `Launch-day registry • ${row.lane}`,
  }));

  return [...launchRows, ...mobileRows, ...placeholderRows, ...chartRows, ...smokeRows, ...reliabilityRows, ...runbookRows];
}

export function getPublicLaunchQaRegistrySummary() {
  const rows = getPublicLaunchQaRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toPublicLaunchQaCsv(rows: PublicLaunchQaRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];
  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
