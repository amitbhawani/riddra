import { getMarketHistoryMemory } from "@/lib/market-history-memory-store";

export type MarketHistoryRegistryRow = {
  kind: "history_lane" | "backlog_lane";
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

export async function getMarketHistoryRegistryRows(): Promise<MarketHistoryRegistryRow[]> {
  const memory = await getMarketHistoryMemory();

  const historyRows = memory.lanes.map((lane) => ({
    kind: "history_lane" as const,
    title: lane.lane,
    href: "/admin/market-data",
    status: lane.status,
    owner: lane.refreshWindow,
    note: `${lane.retainedSeries} retained · ${lane.verifiedSeries} verified · ${lane.previewSeries} preview · ${lane.nextStep}`,
  }));

  const backlogRows = memory.backlogLanes.map((lane) => ({
    kind: "backlog_lane" as const,
    title: lane.lane,
    href: "/admin/market-data",
    status: lane.status,
    owner: "Market history backlog",
    note: lane.note,
  }));

  return [...historyRows, ...backlogRows].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getMarketHistoryRegistrySummary() {
  const memory = await getMarketHistoryMemory();

  return {
    totalRows: memory.lanes.length + memory.backlogLanes.length,
    historyRows: memory.lanes.length,
    backlogRows: memory.backlogLanes.length,
    blockedRows: memory.backlogLanes.filter((lane) => lane.status === "Blocked").length,
  };
}

export function toMarketHistoryRegistryCsv(rows: MarketHistoryRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
