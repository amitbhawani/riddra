import { getAnnouncementReadinessRegistrySummary } from "@/lib/announcement-readiness-registry";
import { getChartVerificationSummary } from "@/lib/chart-verification-registry";
import { getLaunchDayRunbookRegistrySummary } from "@/lib/launch-day-runbook-registry";
import { getLiveSmokeTestRegistrySummary } from "@/lib/live-smoke-tests";
import { getMobileQaRegistrySummary } from "@/lib/mobile-qa-registry";
import { getPlaceholderHonestySummary } from "@/lib/placeholder-honesty-registry";
import { getReliabilityOpsRegistrySummary } from "@/lib/reliability-ops-registry";

export type LaunchEvidenceStatus = "Ready" | "In progress" | "Blocked";

export type LaunchEvidenceRegistryRow = {
  id: string;
  lane:
    | "Mobile"
    | "Smoke"
    | "Chart"
    | "Placeholder"
    | "Reliability"
    | "Runbook"
    | "Announcement";
  label: string;
  status: LaunchEvidenceStatus;
  href: string;
  note: string;
  source: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getLaunchEvidenceRegistryId(
  lane: LaunchEvidenceRegistryRow["lane"],
  label: string,
) {
  return `${slugify(lane)}-${slugify(label)}`;
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getLaunchEvidenceRegistryRows(): LaunchEvidenceRegistryRow[] {
  const mobile = getMobileQaRegistrySummary();
  const smoke = getLiveSmokeTestRegistrySummary();
  const chart = getChartVerificationSummary();
  const placeholder = getPlaceholderHonestySummary();
  const reliability = getReliabilityOpsRegistrySummary();
  const runbook = getLaunchDayRunbookRegistrySummary();
  const announcement = getAnnouncementReadinessRegistrySummary();

  return [
    {
      id: getLaunchEvidenceRegistryId("Mobile", "Compact-screen route proof"),
      lane: "Mobile",
      label: "Compact-screen route proof",
      status: mobile.blocked > 0 ? "Blocked" : mobile.inProgress > 0 ? "In progress" : "Ready",
      href: "/admin/mobile-qa-matrix",
      note: `${mobile.routes} routes are tracked with ${mobile.ready} ready, ${mobile.inProgress} in progress, and ${mobile.blocked} blocked compact-screen checks.`,
      source: "Mobile QA registry summary",
    },
    {
      id: getLaunchEvidenceRegistryId("Smoke", "End-to-end journey rehearsal"),
      lane: "Smoke",
      label: "End-to-end journey rehearsal",
      status:
        smoke.blockedJourneys > 0
          ? "Blocked"
          : smoke.readyJourneys === smoke.journeys
            ? "Ready"
            : "In progress",
      href: "/admin/live-smoke-tests",
      note: `${smoke.readyJourneys} of ${smoke.journeys} smoke journeys are ready, and ${smoke.blockedJourneys} journeys still contain blocked steps across ${smoke.totalSteps} tracked checks.`,
      source: "Live smoke-test registry summary",
    },
    {
      id: getLaunchEvidenceRegistryId("Chart", "Chart-backed route confidence"),
      lane: "Chart",
      label: "Chart-backed route confidence",
      status: chart.blocked > 0 ? "Blocked" : chart.inProgress > 0 ? "In progress" : "Ready",
      href: "/admin/release-checks",
      note: `${chart.total} chart-backed routes are tracked with ${chart.ready} ready, ${chart.inProgress} in progress, and ${chart.blocked} blocked lanes.`,
      source: "Chart verification registry summary",
    },
    {
      id: getLaunchEvidenceRegistryId("Placeholder", "Placeholder and preview honesty"),
      lane: "Placeholder",
      label: "Placeholder and preview honesty",
      status:
        placeholder.blocked > 0
          ? "Blocked"
          : placeholder.inProgress > 0
            ? "In progress"
            : "Ready",
      href: "/admin/public-launch-qa",
      note: `${placeholder.total} staged-state checks are tracked with ${placeholder.ready} ready, ${placeholder.inProgress} in progress, and ${placeholder.blocked} blocked truth gaps.`,
      source: "Placeholder honesty registry summary",
    },
    {
      id: getLaunchEvidenceRegistryId("Reliability", "Incident and rollback proof"),
      lane: "Reliability",
      label: "Incident and rollback proof",
      status:
        reliability.blocked > 0
          ? "Blocked"
          : reliability.inProgress > 0
            ? "In progress"
            : "Ready",
      href: "/admin/reliability-ops",
      note: `${reliability.total} reliability checkpoints are tracked with ${reliability.ready} ready, ${reliability.inProgress} in progress, and ${reliability.blocked} blocked items.`,
      source: "Reliability ops registry summary",
    },
    {
      id: getLaunchEvidenceRegistryId("Runbook", "Launch-day execution packet"),
      lane: "Runbook",
      label: "Launch-day execution packet",
      status: runbook.blocked > 0 ? "Blocked" : runbook.inProgress > 0 ? "In progress" : "Ready",
      href: "/admin/launch-day-runbook",
      note: `${runbook.total} same-day runbook rows are tracked with ${runbook.ready} ready, ${runbook.inProgress} in progress, and ${runbook.blocked} blocked launch-day actions.`,
      source: "Launch-day runbook registry summary",
    },
    {
      id: getLaunchEvidenceRegistryId("Announcement", "Public messaging readiness"),
      lane: "Announcement",
      label: "Public messaging readiness",
      status: announcement.inProgress > 0 ? "In progress" : "Ready",
      href: "/admin/announcement-readiness",
      note: `${announcement.total} messaging rows are tracked with ${announcement.ready} ready and ${announcement.inProgress} still in progress before a broad-public announcement.`,
      source: "Announcement readiness registry summary",
    },
  ];
}

export function getLaunchEvidenceRegistrySummary() {
  const rows = getLaunchEvidenceRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
    blockingLanes: rows.filter((row) => row.status === "Blocked").map((row) => row.lane),
  };
}

export function toLaunchEvidenceRegistryCsv(rows: LaunchEvidenceRegistryRow[]) {
  const header = ["id", "lane", "label", "status", "href", "note", "source"];
  const lines = rows.map((row) =>
    [row.id, row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
