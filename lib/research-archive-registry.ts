import { getArchiveRefreshMemory } from "@/lib/archive-refresh-memory-store";
import { getResearchArchiveMemory } from "@/lib/research-archive-memory-store";

export type ResearchArchiveRegistryRow = {
  kind: "archive_record" | "refresh_run" | "continuity_lane";
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

export async function getResearchArchiveRegistryRows(): Promise<ResearchArchiveRegistryRow[]> {
  const archiveMemory = await getResearchArchiveMemory();
  const refreshMemory = await getArchiveRefreshMemory();

  const archiveRows = archiveMemory.records.map((record) => ({
    kind: "archive_record" as const,
    title: record.title,
    href: record.pageTarget,
    status: record.status,
    owner: `${record.family} · ${record.sourceLabel}`,
    note: `${record.publishedAt} · ${record.continuityNote}`,
  }));

  const refreshRows = refreshMemory.runs.map((run) => ({
    kind: "refresh_run" as const,
    title: run.family,
    href: "/admin/source-mapping-desk",
    status: run.status,
    owner: `${run.sourceClass} · ${run.cadence}`,
    note: `${run.nextWindow} · ${run.coveragePosture}`,
  }));

  const continuityRows = [
    ...refreshMemory.continuityLanes.map((lane) => ({
      kind: "continuity_lane" as const,
      title: lane.lane,
      href: "/admin/research-archive",
      status: lane.continuityStatus,
      owner: "Refresh continuity lane",
      note: `${lane.retainedEvents} retained events · ${lane.note}`,
    })),
    ...archiveMemory.familyLanes.map((lane) => ({
      kind: "continuity_lane" as const,
      title: lane.family,
      href: "/admin/research-archive",
      status: lane.status,
      owner: "Archive family lane",
      note: `${lane.retainedRows} retained rows · ${lane.note}`,
    })),
  ];

  return [...archiveRows, ...refreshRows, ...continuityRows].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getResearchArchiveRegistrySummary() {
  const archiveMemory = await getResearchArchiveMemory();
  const refreshMemory = await getArchiveRefreshMemory();

  return {
    totalRows:
      archiveMemory.records.length + refreshMemory.runs.length + refreshMemory.continuityLanes.length + archiveMemory.familyLanes.length,
    archiveRecords: archiveMemory.records.length,
    refreshRuns: refreshMemory.runs.length,
    continuityLanes: refreshMemory.continuityLanes.length + archiveMemory.familyLanes.length,
    queuedWrites: refreshMemory.summary.pendingWrites,
  };
}

export function toResearchArchiveRegistryCsv(rows: ResearchArchiveRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
