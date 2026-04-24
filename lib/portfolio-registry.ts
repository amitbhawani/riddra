import type { User } from "@supabase/supabase-js";

import { getPortfolioMemory } from "@/lib/portfolio-memory-store";

export type PortfolioRegistryScope = "account" | "admin";

export type PortfolioRegistryRow = {
  kind: "import_run" | "reconciliation" | "review_queue" | "holding" | "manual_draft" | "activity";
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

function getPortfolioActivityHref(scope: "portfolio" | "import_run" | "review_queue" | "manual_draft" | "reconciliation") {
  switch (scope) {
    case "import_run":
    case "review_queue":
    case "reconciliation":
      return "/portfolio/import";
    case "manual_draft":
      return "/portfolio/manual";
    case "portfolio":
    default:
      return "/portfolio";
  }
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getPortfolioRegistryRows(
  user: Pick<User, "id" | "email">,
  scope: PortfolioRegistryScope = "account",
): Promise<PortfolioRegistryRow[]> {
  const memory = await getPortfolioMemory(user);

  const importRunRows = memory.importRuns.map((run) => ({
    kind: "import_run" as const,
    title: run.fileName,
    href: "/portfolio/import",
    status: run.status,
    owner: scope === "admin" ? `Portfolio Ops · ${run.sourceKind}` : `${run.sourceKind} · ${run.initiatedBy}`,
    note: `${run.sourceLabel} · ${run.importedRows} imported · ${run.unresolvedRows} unresolved · ${run.reconciliationDelta ?? "no checkpoint diff yet"} · ${run.createdAt}`,
  }));

  const reviewRows = memory.reviewQueue.map((item) => ({
    kind: "review_queue" as const,
    title: item.importedValue,
    href: "/portfolio/import",
    status: item.decisionState,
    owner: scope === "admin" ? `Portfolio Ops · ${item.confidence} confidence` : `${item.confidence} confidence`,
    note: `${item.suggestedMatch} · ${item.issue} · ${item.action}`,
  }));

  const reconciliationRows = memory.reconciliations.map((item) => ({
    kind: "reconciliation" as const,
    title: item.fileName,
    href: "/portfolio/import",
    status: item.status,
    owner: scope === "admin" ? `Portfolio Ops · ${item.sourceLabel}` : item.sourceLabel,
    note: `${item.checkpointKind} · ${item.unresolvedBefore} -> ${item.unresolvedAfter} unresolved · resolved ${item.resolvedDelta} · ${item.confirmedAt}`,
  }));

  const holdingRows = memory.portfolioSnapshot.map((item) => ({
    kind: "holding" as const,
    title: item.symbol,
    href: "/portfolio",
    status: item.weight,
    owner: scope === "admin" ? `Portfolio Ops · ${item.assetName}` : item.assetName,
    note: `${item.quantity} @ ${item.avgCost} · value ${item.marketValue} · P&L ${item.pnl}`,
  }));

  const draftRow: PortfolioRegistryRow = {
    kind: "manual_draft",
    title: memory.manualDraft.symbol,
    href: "/portfolio/manual",
    status: memory.manualDraft.draftState,
    owner: scope === "admin" ? `Portfolio Ops · ${memory.manualDraft.portfolioTag}` : memory.manualDraft.portfolioTag,
    note: `${memory.manualDraft.quantity} shares @ ${memory.manualDraft.avgCost} · ${memory.manualDraft.updatedAt}`,
  };

  const activityRows = memory.activityLog.map((item) => ({
    kind: "activity" as const,
    title: item.title,
    href: getPortfolioActivityHref(item.scope),
    status: item.action,
    owner:
      scope === "admin"
        ? `Portfolio Ops · ${item.scope.replaceAll("_", " ")}`
        : item.scope.replaceAll("_", " "),
    note: `${item.timestamp} · ${item.detail}`,
  }));

  return [...importRunRows, ...reconciliationRows, ...reviewRows, ...holdingRows, draftRow, ...activityRows].sort((left, right) =>
    left.title.localeCompare(right.title),
  );
}

export async function getPortfolioRegistrySummary(
  user: Pick<User, "id" | "email">,
  scope: PortfolioRegistryScope = "account",
) {
  const memory = await getPortfolioMemory(user);

  return {
    scope,
    totalRows:
      memory.importRuns.length +
      memory.reconciliations.length +
      memory.reviewQueue.length +
      memory.portfolioSnapshot.length +
      1 +
      memory.activityLog.length,
    importRuns: memory.importRuns.length,
    reconciliations: memory.reconciliations.length,
    reviewRows: memory.reviewQueue.length,
    holdings: memory.portfolioSnapshot.length,
    unresolvedRows: memory.summary.unresolvedRows,
    activities: memory.activityLog.length,
  };
}

export function toPortfolioRegistryCsv(rows: PortfolioRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
