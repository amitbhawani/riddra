import {
  announcementAssets,
  announcementChecklist,
  announcementReadinessSummary,
  audienceAngles,
} from "@/lib/announcement-readiness";

export type AnnouncementReadinessRegistryStatus = "Ready" | "In progress";

export type AnnouncementReadinessRegistryRow = {
  lane: "Checklist" | "Asset" | "Audience angle";
  label: string;
  status: AnnouncementReadinessRegistryStatus;
  href: string;
  detail: string;
  source: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function checklistStatus(title: string): AnnouncementReadinessRegistryStatus {
  return title === "What to avoid" ? "In progress" : "Ready";
}

export function getAnnouncementReadinessRegistryRows(): AnnouncementReadinessRegistryRow[] {
  const checklistRows: AnnouncementReadinessRegistryRow[] = announcementChecklist.map((item) => ({
    lane: "Checklist",
    label: item.title,
    status: checklistStatus(item.title),
    href: "/admin/announcement-readiness",
    detail: item.detail,
    source: "Announcement readiness checklist",
  }));

  const assetRows: AnnouncementReadinessRegistryRow[] = announcementAssets.map((item) => ({
    lane: "Asset",
    label: item,
    status: "Ready",
    href: "/admin/announcement-readiness",
    detail: `Use ${item} as part of the public-beta rollout package and messaging proof stack.`,
    source: "Launch asset inventory",
  }));

  const audienceRows: AnnouncementReadinessRegistryRow[] = audienceAngles.map((item) => ({
    lane: "Audience angle",
    label: item.title,
    status:
      announcementReadinessSummary.launchMode === "private_beta" ||
      announcementReadinessSummary.launchMode === "public_beta"
        ? "Ready"
        : "In progress",
    href: "/admin/announcement-readiness",
    detail: item.detail,
    source: "Audience messaging angles",
  }));

  return [...checklistRows, ...assetRows, ...audienceRows];
}

export function getAnnouncementReadinessRegistrySummary() {
  const rows = getAnnouncementReadinessRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
  };
}

export function toAnnouncementReadinessRegistryCsv(rows: AnnouncementReadinessRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "detail", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.detail, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
