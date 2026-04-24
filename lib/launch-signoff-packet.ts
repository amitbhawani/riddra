import { getLaunchBlockerLedger } from "@/lib/launch-blocker-ledger";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";
import { getLaunchDayConsoleSummary } from "@/lib/launch-day-console";
import { getLaunchEvidenceRegistrySummary } from "@/lib/launch-evidence-registry";
import { getLaunchOwnerInbox } from "@/lib/launch-owner-inbox";

export function getLaunchSignoffPacket() {
  const consoleSummary = getLaunchDayConsoleSummary();
  const evidence = getLaunchEvidenceRegistrySummary();
  const ownerInbox = getLaunchOwnerInbox();
  const blockerLedger = getLaunchBlockerLedger();
  const commitments = getLaunchCommitmentItems();

  const blockedCommitments = commitments.filter((item) => item.status === "Blocked");
  const inProgressCommitments = commitments.filter((item) => item.status === "In progress");

  const topActions = [
    ...blockedCommitments.map((item) => ({
      title: item.title,
      detail: item.detail,
      href: item.href,
    })),
    ...consoleSummary.lanes
      .filter((lane) => lane.blockedCount > 0)
      .slice(0, 3)
      .map((lane) => ({
        title: lane.title,
        detail: lane.topBlocker,
        href: lane.href,
      })),
  ].slice(0, 6);

  return {
    status: consoleSummary.status,
    readyChecks: consoleSummary.readyCount,
    blockedChecks: consoleSummary.blockedCount,
    inProgressChecks: consoleSummary.inProgressCount,
    openOwners: ownerInbox.owners,
    criticalOwners: ownerInbox.criticalOwners,
    pendingApprovals: ownerInbox.pendingApprovals,
    blockerCount: blockerLedger.total,
    userOwnedBlockers: blockerLedger.userOwned,
    sharedOwnedBlockers: blockerLedger.sharedOwned,
    blockedCommitments: blockedCommitments.length,
    inProgressCommitments: inProgressCommitments.length,
    evidenceLanes: evidence.total,
    readyEvidenceLanes: evidence.ready,
    inProgressEvidenceLanes: evidence.inProgress,
    blockedEvidenceLanes: evidence.blocked,
    blockingEvidenceLanes: evidence.blockingLanes,
    topActions,
  };
}
