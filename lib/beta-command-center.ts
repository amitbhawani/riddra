import { getLaunchDecision } from "@/lib/launch-decision";
import { getLaunchScorecard } from "@/lib/launch-scorecard";
import { getConfiguredSupportEmail } from "@/lib/runtime-launch-config";

type BetaLane = {
  title: string;
  status: "Ready" | "Watch" | "Blocked";
  detail: string;
  href: string;
};

export function getBetaCommandCenter() {
  const decision = getLaunchDecision();
  const scorecard = getLaunchScorecard();

  const lanes: BetaLane[] = [
    {
      title: "Private-beta posture",
      status:
        decision.recommendedMode === "private_beta" ||
        decision.recommendedMode === "public_beta" ||
        decision.recommendedMode === "full_launch"
          ? "Ready"
          : decision.recommendedMode === "launch_prep"
            ? "Watch"
            : "Blocked",
      detail:
        "Private beta should only begin once the launch decision says the product can honestly operate beyond launch prep.",
      href: "/admin/launch-decision",
    },
    {
      title: "Operational monitoring",
      status: scorecard.percentage >= 70 ? "Ready" : scorecard.percentage >= 50 ? "Watch" : "Blocked",
      detail:
        "Observability, incident response, and support routing should be active before outside users are invited into a beta.",
      href: "/admin/reliability-ops",
    },
    {
      title: "Support and help coverage",
      status: getConfiguredSupportEmail() ? "Ready" : "Blocked",
      detail:
        "Beta traffic needs a visible support path and help-center posture so trust issues have somewhere to go.",
      href: "/admin/support-ops",
    },
    {
      title: "Provider-linked smoke coverage",
      status: scorecard.percentage >= 60 ? "Watch" : "Blocked",
      detail:
        "Real auth, contact, and any public provider-linked flows should be smoke-tested before more users are invited in.",
      href: "/admin/live-smoke-tests",
    },
  ];

  return {
    lanes,
    ready: lanes.filter((lane) => lane.status === "Ready").length,
    watch: lanes.filter((lane) => lane.status === "Watch").length,
    blocked: lanes.filter((lane) => lane.status === "Blocked").length,
  };
}
