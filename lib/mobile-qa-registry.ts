import { mobileQaAreas, mobileQaChecklist, type MobileQaArea } from "@/lib/mobile-qa-matrix";

export type MobileQaRegistryStatus = "Ready" | "In progress" | "Blocked";

export type MobileQaRegistryRow = {
  lane: "Mobile area" | "Route" | "Checklist";
  label: string;
  status: MobileQaRegistryStatus;
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

function mapMobileStatus(status: MobileQaArea["status"]): MobileQaRegistryStatus {
  if (status === "Ready to test") {
    return "Ready";
  }

  if (status === "Needs testing") {
    return "In progress";
  }

  return "Blocked";
}

export function getMobileQaRegistryRows(): MobileQaRegistryRow[] {
  const areaRows: MobileQaRegistryRow[] = mobileQaAreas.map((area) => ({
    lane: "Mobile area",
    label: area.title,
    status: mapMobileStatus(area.status),
    href: "/admin/mobile-qa-matrix",
    note: area.summary,
    source: "Mobile QA matrix",
  }));

  const routeRows: MobileQaRegistryRow[] = mobileQaAreas.flatMap((area) =>
    area.routes.map((route) => ({
      lane: "Route" as const,
      label: `${area.title}: ${route}`,
      status: mapMobileStatus(area.status),
      href: route,
      note: area.summary,
      source: `Mobile QA matrix • ${area.title}`,
    })),
  );

  const checklistRows: MobileQaRegistryRow[] = mobileQaChecklist.map((item, index) => ({
    lane: "Checklist",
    label: `Mobile QA rule ${index + 1}`,
    status: "In progress",
    href: "/admin/mobile-qa-matrix",
    note: item,
    source: "Mobile QA checklist",
  }));

  return [...areaRows, ...routeRows, ...checklistRows];
}

export function getMobileQaRegistrySummary() {
  const rows = getMobileQaRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
    routes: rows.filter((row) => row.lane === "Route").length,
  };
}

export function toMobileQaCsv(rows: MobileQaRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];
  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
