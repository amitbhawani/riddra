import { providerFallbackItems } from "@/lib/provider-fallbacks";
import { providerSwitchboardItems } from "@/lib/provider-switchboard";

export type ProviderFallbackRegistryStatus = "Live" | "In progress" | "Queued";

export type ProviderFallbackRegistryRow = {
  lane: "Fallback profile" | "Switchboard checkpoint";
  domain: string;
  status: ProviderFallbackRegistryStatus;
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

function mapStatus(status: string): ProviderFallbackRegistryStatus {
  if (status === "Live") return "Live";
  if (status === "Queued") return "Queued";
  return "In progress";
}

export function getProviderFallbackRegistryRows(): ProviderFallbackRegistryRow[] {
  const fallbackRows: ProviderFallbackRegistryRow[] = providerFallbackItems.map((item) => ({
    lane: "Fallback profile",
    domain: item.title,
    status: mapStatus(item.status),
    href: "/admin/provider-fallbacks",
    note: item.summary,
    source: "Provider fallbacks surface",
  }));

  const switchboardRows: ProviderFallbackRegistryRow[] = providerSwitchboardItems.map((item) => ({
    lane: "Switchboard checkpoint",
    domain: item.title,
    status: mapStatus(item.status),
    href: "/admin/provider-switchboard",
    note: item.summary,
    source: "Provider switchboard surface",
  }));

  return [...fallbackRows, ...switchboardRows];
}

export function getProviderFallbackRegistrySummary() {
  const rows = getProviderFallbackRegistryRows();

  return {
    total: rows.length,
    live: rows.filter((row) => row.status === "Live").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    queued: rows.filter((row) => row.status === "Queued").length,
  };
}

export function toProviderFallbackRegistryCsv(rows: ProviderFallbackRegistryRow[]) {
  const header = ["lane", "domain", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.domain, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
