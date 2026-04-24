export const launchOwnerMatrixSummary = {
  ownerLanes: 5,
  criticalBlocks: 6,
  sameDayItems: 5,
};

export const launchOwnerMatrixItems = [
  {
    lane: "Platform and product",
    owner: "Codex",
    priority: "Same day",
    summary:
      "Keep the shipped route system, admin surfaces, and launch-scoped UX stable while validating anything that changes before public traffic hits.",
  },
  {
    lane: "Credentials and infrastructure",
    owner: "User",
    priority: "Critical",
    summary:
      "Supply Supabase, Google auth, payment, email, and deployment credentials so the existing build can move from structurally complete to actually connected.",
  },
  {
    lane: "Content, legal, and support",
    owner: "Shared",
    priority: "Critical",
    summary:
      "Confirm launch-safe copy, support destinations, legal review, and any public-facing claims so trust pages and onboarding are not just placeholders with structure.",
  },
  {
    lane: "Data, feeds, and differentiated inputs",
    owner: "User",
    priority: "Critical",
    summary:
      "Confirm allowed source strategy, live-data expectations, and Pine Script or proprietary signal inputs before advanced charting and differentiated insights are promised.",
  },
  {
    lane: "Go-live verification and rollout",
    owner: "Shared",
    priority: "Same day",
    summary:
      "Use the release, observability, recovery, and activation surfaces to decide what launches immediately, what stays hidden, and what is promoted later.",
  },
];

export const launchOwnerMatrixRules = [
  "Every launch blocker should have a single visible owner even when multiple people can help.",
  "Anything still blocked by credentials or legal review should be treated as off for launch day unless explicitly approved.",
  "The public launch scope should be smaller than the full platform scope if trust or activation is not ready.",
];
