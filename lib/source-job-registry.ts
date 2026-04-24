import { sourceJobSamples } from "@/lib/source-jobs";

export type SourceJobRegistryStatus = "Ready" | "In progress" | "Blocked" | "Planned";

export type SourceJobRegistryRow = {
  lane: "Adapter" | "Execution checkpoint";
  adapter: string;
  domain: string;
  cadence: string;
  status: SourceJobRegistryStatus;
  href: string;
  note: string;
  source: string;
};

function toRegistryStatus(status: string): SourceJobRegistryStatus {
  if (status === "Ready" || status === "In progress" || status === "Blocked" || status === "Planned") {
    return status;
  }

  return "Planned";
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getSourceJobRegistryRows(): SourceJobRegistryRow[] {
  const adapterRows: SourceJobRegistryRow[] = sourceJobSamples.map((job) => ({
    lane: "Adapter",
    adapter: job.adapter,
    domain: job.domain,
    cadence: job.cadence,
    status: toRegistryStatus(job.status),
    href: "/admin/source-jobs",
    note: job.nextStep,
    source: "Source job planning surface",
  }));

  const executionRows: SourceJobRegistryRow[] = [
    {
      lane: "Execution checkpoint",
      adapter: "sample_payload_contract",
      domain: "shared_market_data",
      cadence: "On demand",
      status: "Ready",
      href: "/api/admin/market-data/sample-payload",
      note: "The normalized sample payload contract is available for provider-side validation before any real sync is trusted.",
      source: "Provider handoff endpoint",
    },
    {
      lane: "Execution checkpoint",
      adapter: "verified_ingest_endpoint",
      domain: "shared_market_data",
      cadence: "Signed manual run",
      status: "In progress",
      href: "/api/admin/market-data/ingest",
      note: "Verified ingest is coded, but it still needs legitimate upstream payloads before live stock and index routes can be treated as trusted delayed-data surfaces.",
      source: "Verified ingest route",
    },
    {
      lane: "Execution checkpoint",
      adapter: "provider_sync_bridge",
      domain: "shared_market_data",
      cadence: "Cron or signed manual run",
      status: "In progress",
      href: "/api/admin/market-data/provider-sync",
      note: "Provider sync is available as the shared bridge, but it still needs real provider credentials and upstream payload mapping before scheduled activation becomes trustworthy.",
      source: "Provider sync route",
    },
    {
      lane: "Execution checkpoint",
      adapter: "refresh_controller",
      domain: "shared_market_data",
      cadence: "Cron",
      status: "In progress",
      href: "/api/admin/market-data/refresh",
      note: "The refresh controller exists for delayed snapshot updates, but the cron and source-auth layer still need to be activated against a real provider.",
      source: "Refresh route",
    },
  ];

  return [...adapterRows, ...executionRows];
}

export function getSourceJobRegistrySummary() {
  const rows = getSourceJobRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
    planned: rows.filter((row) => row.status === "Planned").length,
  };
}

export function toSourceJobRegistryCsv(rows: SourceJobRegistryRow[]) {
  const header = ["lane", "adapter", "domain", "cadence", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.adapter, row.domain, row.cadence, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
