import { getLaunchApprovalBoard } from "@/lib/launch-approval-board";
import { getLaunchDecision } from "@/lib/launch-decision";
import { getLaunchEvidenceRegistrySummary } from "@/lib/launch-evidence-registry";
import { getLaunchSignoffPacket } from "@/lib/launch-signoff-packet";
import { getReleaseGateBoard } from "@/lib/release-gate-board";

export function getLaunchEvidenceBoard() {
  const decision = getLaunchDecision();
  const approvals = getLaunchApprovalBoard();
  const evidence = getLaunchEvidenceRegistrySummary();
  const signoff = getLaunchSignoffPacket();
  const releaseGate = getReleaseGateBoard();

  return {
    recommendedMode: decision.recommendedLabel,
    blockingDecisions: decision.blockingCount,
    pendingApprovals: approvals.approvals.pending,
    blockedApprovalLanes: approvals.blockedApprovalLanes,
    launchScore: releaseGate.scorecardPercentage,
    blockedScorecardChecks: releaseGate.blockedScorecardChecks,
    blockerCount: signoff.blockerCount,
    openOwners: signoff.openOwners,
    evidenceLanes: evidence.total,
    readyEvidenceLanes: evidence.ready,
    inProgressEvidenceLanes: evidence.inProgress,
    blockedEvidenceLanes: evidence.blocked,
    blockingEvidenceLanes: evidence.blockingLanes,
    topActions: signoff.topActions,
  };
}
