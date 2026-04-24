export const recoveryJourneysSummary = {
  journeyFamilies: 5,
  trustRepairMoments: 6,
  guidedRecoveries: 4,
};

export const recoveryJourneyItems = [
  {
    title: "Portfolio mismatch recovery",
    status: "In progress",
    summary:
      "Import mismatches and broker conflicts should later trigger calm, guided recovery journeys instead of leaving the user in a failed state.",
  },
  {
    title: "Billing interruption recovery",
    status: "In progress",
    summary:
      "Payment failures, entitlement confusion, and renewal breaks should route users into clear recovery paths instead of abrupt access loss.",
  },
  {
    title: "Alert and consent recovery",
    status: "Queued",
    summary:
      "Users who suppress messaging or disable channels should later have safe paths to re-enable useful notifications without feeling pushed.",
  },
  {
    title: "Support escalation recovery",
    status: "Queued",
    summary:
      "Escalated issues should later map to reassurance and follow-up journeys so support doesn’t end when a ticket closes.",
  },
  {
    title: "Dormant-user win-back",
    status: "Queued",
    summary:
      "Inactive users should re-enter through value-led recovery flows tied to their original intent instead of generic reminder blasts.",
  },
];

export const recoveryJourneyRules = [
  "Recovery journeys should reduce confusion first and only then ask the user to take action.",
  "Trust repair should be explicit for billing, portfolio, and broker-related failures because those moments are high-risk.",
  "A recovery path should always explain what happened, what is safe, and what the next best action is.",
];
