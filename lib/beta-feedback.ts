type BetaFeedbackLane = {
  title: string;
  priority: "Critical" | "High" | "Medium";
  source: string;
  summary: string;
  nextAction: string;
};

export function getBetaFeedbackDesk() {
  const lanes: BetaFeedbackLane[] = [
    {
      title: "Auth friction and callback failures",
      priority: "Critical",
      source: "Login, callback, support tickets",
      summary:
        "Any dead-end during sign-in, callback completion, or account setup should be treated as a first-wave beta blocker because it prevents trust from forming at all.",
      nextAction: "Review auth logs, callback matrix, and smoke-test results before widening access.",
    },
    {
      title: "Trust copy and public clarity",
      priority: "High",
      source: "Help, pricing, launch-readiness, onboarding",
      summary:
        "Early users will reveal whether the product is over-promising, under-explaining, or leaving beta boundaries unclear across pricing, AI, and roadmap-positioned features.",
      nextAction: "Tighten help-center wording, public beta scope, and support contact messaging based on repeated questions.",
    },
    {
      title: "Portfolio and alert confidence gaps",
      priority: "High",
      source: "Portfolio flows, alerts, account workspace",
      summary:
        "If imported data, alerts, or account surfaces feel inconsistent, users will quickly lose confidence even if the product looks polished.",
      nextAction: "Capture mismatch reports, cross-check smoke-test outcomes, and prioritize high-trust fixes before new invitations.",
    },
    {
      title: "Premium positioning confusion",
      priority: "Medium",
      source: "Pricing, billing, subscription surfaces",
      summary:
        "Beta feedback should tell us whether premium features feel clearly staged, honestly presented, and commercially believable without forcing a billing launch too early.",
      nextAction: "Adjust pricing copy, entitlement visibility, and upgrade messaging before monetization is emphasized publicly.",
    },
  ];

  return {
    lanes,
    critical: lanes.filter((lane) => lane.priority === "Critical").length,
    high: lanes.filter((lane) => lane.priority === "High").length,
    medium: lanes.filter((lane) => lane.priority === "Medium").length,
  };
}
