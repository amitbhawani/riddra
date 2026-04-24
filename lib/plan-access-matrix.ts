export type PlanAccessMatrixRow = {
  workflow: string;
  starter: string;
  pro: string;
  elite: string;
};

export const planAccessMatrix: PlanAccessMatrixRow[] = [
  {
    workflow: "Public research routes",
    starter: "Access core stocks, funds, IPOs, tools, and launch-safe discovery flows.",
    pro: "Everything in Starter with deeper trader entry points.",
    elite: "Everything in Pro with highest-touch workspace access.",
  },
  {
    workflow: "Charts and workstation",
    starter: "Reference-grade chart access with lighter saved-workflow expectations.",
    pro: "Primary trader tier for deeper chart and workstation usage.",
    elite: "Full decision-workspace posture plus premium monitoring depth.",
  },
  {
    workflow: "Portfolio and alerts",
    starter: "Basic continuity and personal route memory.",
    pro: "Stronger workflow depth for repeat-use monitoring.",
    elite: "Most complete portfolio, alert, and operator-style review posture.",
  },
  {
    workflow: "Support and handholding",
    starter: "Self-serve onboarding and core support routes.",
    pro: "Priority product-use posture.",
    elite: "Highest-touch support expectation once the communication stack is fully activated.",
  },
];
