import { getDerivativesMemory } from "@/lib/derivatives-memory-store";

export type DerivativesRegistryRow = {
  kind: "snapshot" | "analytics_lane" | "backlog_lane";
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

export async function getDerivativesRegistryRows(): Promise<DerivativesRegistryRow[]> {
  const memory = await getDerivativesMemory();

  const snapshotRows = memory.snapshots.map((snapshot) => ({
    kind: "snapshot" as const,
    title: `${snapshot.symbol} · ${snapshot.expiry}`,
    href: "/option-chain",
    status: snapshot.snapshotState,
    owner: snapshot.strikeWindow,
    note: `${snapshot.nextRefresh} · ${snapshot.note}`,
  }));

  const analyticsRows = memory.analyticsLanes.map((lane) => ({
    kind: "analytics_lane" as const,
    title: lane.lane,
    href: "/trader-workstation",
    status: lane.status,
    owner: `${lane.retainedSessions} retained sessions`,
    note: `${lane.nextJob} · ${lane.note}`,
  }));

  const backlogRows = memory.backlogLanes.map((lane) => ({
    kind: "backlog_lane" as const,
    title: lane.lane,
    href: "/admin/market-data",
    status: lane.status,
    owner: "Derivatives backlog",
    note: lane.note,
  }));

  return [...snapshotRows, ...analyticsRows, ...backlogRows].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getDerivativesRegistrySummary() {
  const memory = await getDerivativesMemory();

  return {
    totalRows: memory.snapshots.length + memory.analyticsLanes.length + memory.backlogLanes.length,
    snapshotRows: memory.snapshots.length,
    analyticsRows: memory.analyticsLanes.length,
    blockedRows: memory.backlogLanes.filter((lane) => lane.status === "Blocked").length,
  };
}

export function toDerivativesRegistryCsv(rows: DerivativesRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
