export const consentOpsSummary = {
  consentChannels: 5,
  lifecycleScopes: 6,
  userControls: 4,
};

export const consentOpsItems = [
  {
    title: "Alert and campaign consent",
    status: "In progress",
    summary:
      "Users should eventually control whether they receive market alerts, newsletters, onboarding guidance, recovery nudges, and promotional upgrades by channel and purpose.",
  },
  {
    title: "Portfolio-sensitive workflows",
    status: "In progress",
    summary:
      "Portfolio imports, broker sync prompts, exception reviews, and trust-recovery journeys should respect higher-sensitivity consent and clearer user confirmation.",
  },
  {
    title: "Lifecycle journey eligibility",
    status: "Queued",
    summary:
      "Onboarding, upgrade, churn-recovery, and webinar/course journeys should later check consent scope before users are placed into automated sequences.",
  },
  {
    title: "Operator-safe consent rules",
    status: "Queued",
    summary:
      "Operators should be able to configure journey eligibility and messaging rules without bypassing consent-state protections.",
  },
];

export const consentOpsRules = [
  "Consent should be purpose-aware, channel-aware, and easy to explain to the user.",
  "Growth automation must follow consent state rather than assuming silent eligibility.",
  "Sensitive portfolio and billing flows should always bias toward explicit confirmation over aggressive automation.",
];
