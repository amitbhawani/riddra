import { getLaunchEvidenceRegistryRows } from "@/lib/launch-evidence-registry";
import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";

export type LaunchRehearsalStatus = "Ready" | "Needs config" | "Needs rehearsal";

export type LaunchRehearsalPacketRow = {
  lane:
    | "Mobile"
    | "Smoke"
    | "Chart"
    | "Placeholder"
    | "Reliability"
    | "Announcement"
    | "Go/No-go";
  label: string;
  status: LaunchRehearsalStatus;
  href: string;
  detail: string;
  evidence: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getLaunchRehearsalPacketRows(): LaunchRehearsalPacketRow[] {
  const qaItems = getPublicLaunchQaItems();
  const evidenceRows = getLaunchEvidenceRegistryRows();

  const chartItem = qaItems.find((item) => item.title === "Chart render and visual stability");
  const announcementItem = qaItems.find((item) => item.title === "Announcement rollout and launch narrative");
  const goNoGoItem = qaItems.find((item) => item.title === "Final go / no-go review");

  return [
    {
      lane: "Mobile",
      label: "Compact-screen route pass",
      status: "Needs rehearsal",
      href: "/admin/mobile-qa-matrix",
      detail:
        "The route-level mobile QA matrix and exportable registry already exist; the remaining task is a deliberate human pass across public and subscriber routes on real compact screens.",
      evidence: evidenceRows.find((row) => row.lane === "Mobile")?.note ?? "Mobile QA registry is live.",
    },
    {
      lane: "Smoke",
      label: "End-to-end route rehearsal",
      status: "Needs rehearsal",
      href: "/admin/live-smoke-tests",
      detail:
        "The smoke journey registry and desk are already in place; the remaining step is one clean human rehearsal across landing, research, signup, account, billing, and support flows.",
      evidence: evidenceRows.find((row) => row.lane === "Smoke")?.note ?? "Smoke-test registry is live.",
    },
    {
      lane: "Chart",
      label: "Chart and visual-surface verification",
      status:
        chartItem?.status === "Blocked" ? "Needs config" : "Needs rehearsal",
      href: "/admin/release-checks",
      detail:
        chartItem?.status === "Blocked"
          ? "The chart-verification registry and native flagship chart paths are built, but the remaining hosted or unfed surfaces still need final provider-backed verification."
          : "The chart-verification registry is built; the remaining task is final route-by-route visual verification on the less-trusted surfaces.",
      evidence: evidenceRows.find((row) => row.lane === "Chart")?.note ?? "Chart verification registry is live.",
    },
    {
      lane: "Placeholder",
      label: "Preview and placeholder honesty sweep",
      status: "Needs rehearsal",
      href: "/admin/public-launch-qa",
      detail:
        "The placeholder-honesty registry already tracks fake-looking states, and the remaining work is the last human sweep that decides which preview routes can stay visible and which need stricter beta or coming-soon treatment.",
      evidence: evidenceRows.find((row) => row.lane === "Placeholder")?.note ?? "Placeholder honesty registry is live.",
    },
    {
      lane: "Reliability",
      label: "Incident and rollback drill",
      status: "Needs rehearsal",
      href: "/admin/reliability-ops",
      detail:
        "The reliability registry, incident response, recovery, and rollback desks are already built; the remaining task is one practical drill so the launch team is not improvising under traffic.",
      evidence: evidenceRows.find((row) => row.lane === "Reliability")?.note ?? "Reliability ops registry is live.",
    },
    {
      lane: "Announcement",
      label: "Public announcement and launch narrative",
      status:
        announcementItem?.status === "Blocked" ? "Needs config" : "Needs rehearsal",
      href: "/admin/announcement-readiness",
      detail:
        announcementItem?.status === "Blocked"
          ? "Announcement assets and readiness registries are built, but support and provider credibility still need to be configured before a broad-public narrative is safe."
          : "Announcement surfaces are ready; the remaining step is final narrative selection once launch scope is confirmed.",
      evidence: evidenceRows.find((row) => row.lane === "Announcement")?.note ?? "Announcement readiness registry is live.",
    },
    {
      lane: "Go/No-go",
      label: "Final launch decision pass",
      status:
        goNoGoItem?.status === "Blocked" ? "Needs config" : "Needs rehearsal",
      href: "/admin/go-no-go",
      detail:
        goNoGoItem?.status === "Blocked"
          ? "The go/no-go desk, launch-day runbook, launch evidence packet, and signoff surfaces are all built, but they still depend on live provider and subscriber activation inputs."
          : "The final decision flow is built; the remaining task is exercising the evidence packet and runbook together in one last owner review.",
      evidence: "Launch evidence packet, runbook, signoff packet, and release gate board are already live.",
    },
  ];
}

export function getLaunchRehearsalPacketSummary() {
  const rows = getLaunchRehearsalPacketRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    needsConfig: rows.filter((row) => row.status === "Needs config").length,
    needsRehearsal: rows.filter((row) => row.status === "Needs rehearsal").length,
  };
}

export function toLaunchRehearsalPacketCsv(rows: LaunchRehearsalPacketRow[]) {
  const header = ["lane", "label", "status", "href", "detail", "evidence"];
  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.detail, row.evidence]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
