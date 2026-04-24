import { getLaunchExecutionQueue } from "@/lib/launch-execution-queue";
import { getLaunchEvidenceRegistrySummary } from "@/lib/launch-evidence-registry";
import { getLaunchPostureBoard } from "@/lib/launch-posture-board";
import { getLaunchScorecard } from "@/lib/launch-scorecard";
import { preflightChecklistSummary } from "@/lib/preflight-checklist";

export function getReleaseGateBoard() {
  const scorecard = getLaunchScorecard();
  const executionQueue = getLaunchExecutionQueue();
  const evidence = getLaunchEvidenceRegistrySummary();
  const posture = getLaunchPostureBoard();

  return {
    scorecardPercentage: scorecard.percentage,
    blockedScorecardChecks: scorecard.blockedCount,
    readyQueueItems: executionQueue.readyNow,
    blockedQueueItems: executionQueue.blocked,
    launchVisible: posture.launchVisible,
    postureBlockers: posture.blockingCount,
    checklistGroups: preflightChecklistSummary.checklistGroups,
    criticalChecks: preflightChecklistSummary.criticalChecks,
    evidenceLanes: evidence.total,
    readyEvidenceLanes: evidence.ready,
    blockedEvidenceLanes: evidence.blocked,
    blockingEvidenceLanes: evidence.blockingLanes,
  };
}
