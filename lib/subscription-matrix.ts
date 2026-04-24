export type SubscriptionMatrixFeature = {
  feature: string;
  starter: "Included" | "Planned" | "No";
  pro: "Included" | "Planned" | "No";
  elite: "Included" | "Planned" | "No";
  note: string;
};

export const subscriptionMatrixFeatures: SubscriptionMatrixFeature[] = [
  {
    feature: "Stock, IPO, fund, and learning pages",
    starter: "Included",
    pro: "Included",
    elite: "Included",
    note: "These should remain broad acquisition surfaces even after stricter paywall decisions are introduced.",
  },
  {
    feature: "Saved watchlists and workspace memory",
    starter: "Planned",
    pro: "Included",
    elite: "Included",
    note: "Personal state is a good conversion lever because it creates switching cost without fully blocking discovery.",
  },
  {
    feature: "Portfolio tracker and import review",
    starter: "Planned",
    pro: "Included",
    elite: "Included",
    note: "Manual portfolio and CSV import can convert serious users once validation and review flows are trustworthy.",
  },
  {
    feature: "Advanced charts and proprietary indicator",
    starter: "No",
    pro: "Planned",
    elite: "Included",
    note: "Your TradingView indicator should feel like a premium differentiator, not a generic public utility.",
  },
  {
    feature: "Priority alerts and AI summaries",
    starter: "No",
    pro: "Planned",
    elite: "Included",
    note: "High-signal alerting is one of the clearest recurring-value features for paying users.",
  },
  {
    feature: "Derivatives, OI, and trader workstation tools",
    starter: "No",
    pro: "No",
    elite: "Planned",
    note: "This should stay reserved for the deeper trader stack once the advanced analytics surfaces are live.",
  },
];

export const subscriptionMatrixRules = [
  "Build mode still treats signed-up users as Elite, so this matrix is a planning surface rather than live gating.",
  "Entitlements should be feature-based, not page-based, so products can mix public traffic with premium actions cleanly.",
  "Billing, entitlements, and alerts should all agree on plan state once payments go live.",
];
