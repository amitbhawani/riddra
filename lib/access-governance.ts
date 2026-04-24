export const accessGovernanceSummary = {
  roleLayers: 4,
  protectedDomains: 6,
  auditPriorities: 5,
};

export const accessGovernanceItems = [
  {
    title: "Admin role boundaries",
    status: "In progress",
    summary:
      "Admin access should move beyond signed-in-only behavior so content editors, operators, finance, and founders can later use separate permission layers.",
  },
  {
    title: "Sensitive workflow protection",
    status: "In progress",
    summary:
      "Billing, provider settings, documents, overrides, and lifecycle transitions should later require stricter access than general editorial tasks.",
  },
  {
    title: "Audit-aware operator actions",
    status: "Queued",
    summary:
      "Permission changes, provider rollouts, and high-risk edits should eventually preserve who did what and why under a formal access-governance layer.",
  },
  {
    title: "Team onboarding policy",
    status: "Queued",
    summary:
      "New staff should later enter through explicit role assignment and limited-scope access instead of inheriting broad admin access by default.",
  },
];

export const accessGovernanceRules = [
  "Signed-in access is not the same as admin authorization.",
  "High-risk operations should require narrower roles than general editorial work.",
  "Access changes should be explainable, reviewable, and eventually auditable.",
];
