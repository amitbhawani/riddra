export const launchDayRunbookSummary = {
  checkpoints: 6,
  highRiskSteps: 4,
  fallbackActions: 5,
};

export const launchDayRunbookItems = [
  {
    step: "Freeze public scope",
    status: "Required",
    summary:
      "Confirm which routes, tools, account flows, and premium messaging are in launch scope so the team does not improvise after traffic arrives.",
  },
  {
    step: "Apply credentials and env values",
    status: "Required",
    summary:
      "Load final Supabase, auth, payment, support, and email values into the runtime in one controlled step rather than in scattered edits.",
  },
  {
    step: "Run backend activation sequence",
    status: "Required",
    summary:
      "Execute migrations, seeds, provider setup, callback validation, and account-auth verification in the order already modeled in setup playbooks.",
  },
  {
    step: "Verify launch-critical routes",
    status: "Required",
    summary:
      "Retest homepage, pricing, login, signup, search, portfolio, admin access, and the chosen launch surfaces before the site is promoted.",
  },
  {
    step: "Enable communication and monitoring",
    status: "Required",
    summary:
      "Confirm support inbox, alert delivery, incident lanes, and observability checks so launch traffic has real coverage if something breaks.",
  },
  {
    step: "Hold rollback-safe release window",
    status: "Recommended",
    summary:
      "Keep a short monitored release window where changes are paused, metrics are watched, and any bad rollout can be backed out deliberately.",
  },
];

export const launchDayRunbookFallbacks = [
  "Hide blocked premium or provider-linked surfaces instead of leaving broken flows visible.",
  "Fallback to formula-first and static-trust experiences when live integrations are not ready.",
  "Reduce public scope before launch rather than launching unstable account or billing workflows.",
  "Use support and help-center surfaces as trust recovery tools if a launch path needs to be paused.",
  "Treat rollback as a planned operating action, not as failure.",
];
