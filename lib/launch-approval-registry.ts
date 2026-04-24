import { getLaunchApprovalBoard } from "@/lib/launch-approval-board";

export type LaunchApprovalRegistryStatus = "Approved" | "Pending" | "Blocking";

export type LaunchApprovalRegistryRow = {
  lane: "Owner approval" | "Urgency checkpoint";
  owner: string;
  label: string;
  status: LaunchApprovalRegistryStatus;
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

function urgencyToStatus(priority: string): LaunchApprovalRegistryStatus {
  return priority === "Immediate" ? "Blocking" : "Pending";
}

export function getLaunchApprovalRegistryRows(): LaunchApprovalRegistryRow[] {
  const board = getLaunchApprovalBoard();

  const approvalRows: LaunchApprovalRegistryRow[] = board.approvals.approvals.map((approval) => ({
    lane: "Owner approval",
    owner: approval.owner,
    label: approval.lane,
    status: approval.status,
    href: "/admin/launch-approvals",
    detail: approval.detail,
    source: "Launch approvals surface",
  }));

  const urgencyRows: LaunchApprovalRegistryRow[] = board.ownerUrgencies.map((item) => ({
    lane: "Urgency checkpoint",
    owner: item.owner,
    label: item.lane,
    status: urgencyToStatus(item.priority),
    href: "/admin/launch-owner-matrix",
    detail: item.summary,
    source: "Launch owner matrix",
  }));

  return [...approvalRows, ...urgencyRows];
}

export function getLaunchApprovalRegistrySummary() {
  const rows = getLaunchApprovalRegistryRows();

  return {
    total: rows.length,
    approved: rows.filter((row) => row.status === "Approved").length,
    pending: rows.filter((row) => row.status === "Pending").length,
    blocking: rows.filter((row) => row.status === "Blocking").length,
  };
}

export function toLaunchApprovalRegistryCsv(rows: LaunchApprovalRegistryRow[]) {
  const header = ["lane", "owner", "label", "status", "href", "detail", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.owner, row.label, row.status, row.href, row.detail, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
