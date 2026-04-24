import { getLaunchApprovals } from "@/lib/launch-approvals";
import { getLaunchDayConsoleSummary } from "@/lib/launch-day-console";
import { launchOwnerMatrixItems } from "@/lib/launch-owner-matrix";

export function getLaunchApprovalBoard() {
  const approvals = getLaunchApprovals();
  const consoleSummary = getLaunchDayConsoleSummary();

  const ownerUrgencies = launchOwnerMatrixItems.map((item) => ({
    lane: item.lane,
    owner: item.owner,
    priority: item.priority,
    summary: item.summary,
  }));

  return {
    approvals,
    consoleSummary,
    ownerUrgencies,
    blockedApprovalLanes: approvals.approvals
      .filter((approval) => approval.status === "Pending")
      .map((approval) => `${approval.owner}: ${approval.lane}`),
  };
}
