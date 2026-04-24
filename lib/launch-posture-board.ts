import { getLaunchDecision } from "@/lib/launch-decision";
import { getLaunchState } from "@/lib/launch-state";
import { launchScopeItems } from "@/lib/launch-scope";

export function getLaunchPostureBoard() {
  const decision = getLaunchDecision();
  const launchState = getLaunchState();

  return {
    activeMode: launchState.label,
    recommendedMode: decision.recommendedLabel,
    launchVisible: launchScopeItems.filter((item) => item.status === "Launch visible").length,
    gatedOrHidden: launchScopeItems.filter(
      (item) => item.status === "Hidden from public" || item.status === "Review before launch",
    ).length,
    roadmapVisible: launchScopeItems.filter((item) => item.status === "Roadmap visible").length,
    blockingCount: decision.blockingCount,
    blockers: decision.blockers.filter((blocker) => blocker.status === "Blocking"),
  };
}
