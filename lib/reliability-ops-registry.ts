import { incidentResponseItems } from "@/lib/incident-response";
import { recoveryReadinessItems } from "@/lib/recovery-readiness";
import { reliabilityOpsItems } from "@/lib/reliability-ops";
import { rollbackSamples } from "@/lib/rollback-ops";

export type ReliabilityOpsRegistryStatus = "Ready" | "In progress" | "Blocked";

export type ReliabilityOpsRegistryRow = {
  lane:
    | "Reliability control"
    | "Incident response"
    | "Recovery readiness"
    | "Rollback scenario"
    | "Route checkpoint";
  label: string;
  status: ReliabilityOpsRegistryStatus;
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

function mapStatus(status: string): ReliabilityOpsRegistryStatus {
  if (status === "Queued") {
    return "Blocked";
  }

  if (status === "Ready") {
    return "Ready";
  }

  return "In progress";
}

export function getReliabilityOpsRegistryRows(): ReliabilityOpsRegistryRow[] {
  const controlRows: ReliabilityOpsRegistryRow[] = reliabilityOpsItems.map((item) => ({
    lane: "Reliability control",
    label: item.title,
    status: mapStatus(item.status),
    href: "/admin/reliability-ops",
    note: item.summary,
    source: "Reliability ops desk",
  }));

  const incidentRows: ReliabilityOpsRegistryRow[] = incidentResponseItems.map((item) => ({
    lane: "Incident response",
    label: item.title,
    status: mapStatus(item.status),
    href: "/admin/incident-response",
    note: item.summary,
    source: "Incident response desk",
  }));

  const recoveryRows: ReliabilityOpsRegistryRow[] = recoveryReadinessItems.map((item) => ({
    lane: "Recovery readiness",
    label: item.title,
    status: mapStatus(item.status),
    href: "/admin/recovery-readiness",
    note: item.summary,
    source: "Recovery readiness desk",
  }));

  const rollbackRows: ReliabilityOpsRegistryRow[] = rollbackSamples.map((item) => ({
    lane: "Rollback scenario",
    label: `${item.asset}: ${item.change}`,
    status: item.risk === "Low" ? "Ready" : item.risk === "Medium" ? "In progress" : "Blocked",
    href: "/admin/rollback-center",
    note: `Fallback: ${item.fallback}. Risk: ${item.risk}.`,
    source: "Rollback center scenarios",
  }));

  const routeRows: ReliabilityOpsRegistryRow[] = [
    {
      lane: "Route checkpoint",
      label: "Reliability ops review",
      status: "In progress",
      href: "/admin/reliability-ops",
      note: "Keep release QA, observability, caching, security, recovery, and performance posture visible in one operator review path.",
      source: "Phase 20 launch control",
    },
    {
      lane: "Route checkpoint",
      label: "Incident response drill",
      status: "In progress",
      href: "/admin/incident-response",
      note: "Runtime, trust, revenue, rollback, and follow-up learning lanes now need one practical rehearsal instead of only page-level planning.",
      source: "Phase 20 launch control",
    },
    {
      lane: "Route checkpoint",
      label: "Recovery readiness pass",
      status: "In progress",
      href: "/admin/recovery-readiness",
      note: "Content, provider, billing, and traffic recovery paths should be reviewed together before wider launch.",
      source: "Phase 20 launch control",
    },
    {
      lane: "Route checkpoint",
      label: "Rollback scenario review",
      status: "In progress",
      href: "/admin/rollback-center",
      note: "High-risk changes should have explicit rollback expectations before broad-public rollout windows.",
      source: "Phase 20 launch control",
    },
  ];

  return [...controlRows, ...incidentRows, ...recoveryRows, ...rollbackRows, ...routeRows];
}

export function getReliabilityOpsRegistrySummary() {
  const rows = getReliabilityOpsRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toReliabilityOpsCsv(rows: ReliabilityOpsRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];
  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
