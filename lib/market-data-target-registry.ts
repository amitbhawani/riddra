import { getMarketDataTargetStatuses } from "@/lib/market-data-targets";

export type MarketDataTargetRegistryRow = {
  label: string;
  family: "stock_quote" | "stock_chart" | "fund_nav" | "index_snapshot";
  route: string;
  status: "verified" | "pending" | "seeded";
  source: string;
  updated: string;
  detail: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getMarketDataTargetRegistryRows(): Promise<
  MarketDataTargetRegistryRow[]
> {
  const statuses = await getMarketDataTargetStatuses();

  return statuses.map((status) => ({
    label: status.title,
    family: status.type,
    route: status.route,
    status: status.status,
    source: status.source,
    updated: status.updated,
    detail: status.detail,
  }));
}

export async function getMarketDataTargetRegistrySummary() {
  const rows = await getMarketDataTargetRegistryRows();

  return {
    total: rows.length,
    verified: rows.filter((row) => row.status === "verified").length,
    seeded: rows.filter((row) => row.status === "seeded").length,
    pending: rows.filter((row) => row.status === "pending").length,
  };
}

export function toMarketDataTargetCsv(rows: MarketDataTargetRegistryRow[]) {
  const header = ["label", "family", "route", "status", "source", "updated", "detail"];
  const lines = rows.map((row) =>
    [row.label, row.family, row.route, row.status, row.source, row.updated, row.detail]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
