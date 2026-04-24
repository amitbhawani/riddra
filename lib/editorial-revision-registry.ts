import { getEditorialRevisionMemory } from "@/lib/editorial-revision-memory-store";

export type EditorialRevisionRegistryRow = {
  kind: "revision" | "rollback" | "family";
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

export async function getEditorialRevisionRegistryRows(): Promise<EditorialRevisionRegistryRow[]> {
  const memory = await getEditorialRevisionMemory();

  const revisionRows = memory.revisions.map((entry) => ({
    kind: "revision" as const,
    title: entry.asset,
    href: entry.routeTarget,
    status: entry.revisionState,
    owner: entry.editor,
    note: `${entry.changedFields} · rollback ${entry.rollbackReady} · ${entry.reason}`,
  }));

  const rollbackRows = memory.rollbackScenarios.map((entry) => ({
    kind: "rollback" as const,
    title: entry.asset,
    href: entry.routeTarget,
    status: entry.queueState,
    owner: "Rollback lane",
    note: `${entry.change} · last known good ${entry.lastKnownGood}`,
  }));

  const familyRows = memory.familyLanes.map((lane) => ({
    kind: "family" as const,
    title: lane.family,
    href: "/admin/revisions",
    status: lane.latestState,
    owner: "Editorial control",
    note: `${lane.trackedAssets} tracked assets · ${lane.rollbackReadyAssets} rollback ready`,
  }));

  return [...revisionRows, ...rollbackRows, ...familyRows].sort((left, right) =>
    left.title.localeCompare(right.title),
  );
}

export async function getEditorialRevisionRegistrySummary() {
  const memory = await getEditorialRevisionMemory();

  return {
    totalRows:
      memory.revisions.length + memory.rollbackScenarios.length + memory.familyLanes.length,
    revisionRows: memory.revisions.length,
    rollbackRows: memory.rollbackScenarios.length,
    familyRows: memory.familyLanes.length,
  };
}

export function toEditorialRevisionRegistryCsv(rows: EditorialRevisionRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
