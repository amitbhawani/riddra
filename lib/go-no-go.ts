import { getActivationSequence } from "@/lib/activation-sequence";
import { getLaunchDecision } from "@/lib/launch-decision";
import { getLaunchScorecard } from "@/lib/launch-scorecard";
import { getLiveSmokeTests } from "@/lib/live-smoke-tests";

export function getGoNoGoSummary() {
  const decision = getLaunchDecision();
  const scorecard = getLaunchScorecard();
  const sequence = getActivationSequence();
  const smokeTests = getLiveSmokeTests();

  const recommendation =
    decision.recommendedMode === "full_launch"
      ? "Go for full launch"
      : decision.recommendedMode === "private_beta"
        ? "Go for private beta"
      : decision.recommendedMode === "public_beta"
        ? "Go for controlled public beta"
        : decision.recommendedMode === "launch_prep"
          ? "Stay in launch prep"
          : "Stay in internal review";

  const reasons = [
    `${decision.blockingCount} blocker(s) still affect the current launch recommendation.`,
    `${scorecard.percentage}% readiness is reflected in the current env and posture scorecard.`,
    `${sequence.blocked} activation step(s) are still blocked before the full path can be executed cleanly.`,
    `${smokeTests.blocked} smoke-test lane(s) are still blocked by missing envs or provider setup.`,
  ];

  return {
    recommendation,
    recommendedMode: decision.recommendedLabel,
    readinessPercentage: scorecard.percentage,
    blockingCount: decision.blockingCount,
    blockedSteps: sequence.blocked,
    blockedSmokeTests: smokeTests.blocked,
    reasons,
  };
}
