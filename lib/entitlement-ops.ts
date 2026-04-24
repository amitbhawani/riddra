export const entitlementAuditSummary = {
  updatesToday: 7,
  automatedChanges: 5,
  manualOverrides: 2,
};

export const entitlementAuditSamples = [
  {
    id: "ent_audit_001",
    userRef: "amit@riddra.com",
    featureCode: "advanced_charts",
    previousLevel: "build_mode",
    nextLevel: "elite",
    reason: "subscription.activated",
    actorType: "system",
    actorRef: "evt_riddra_001",
    changedAt: "Apr 13, 2026 • 8:12 AM",
  },
  {
    id: "ent_audit_002",
    userRef: "review@riddra.com",
    featureCode: "priority_alerts",
    previousLevel: "pro",
    nextLevel: "grace_period",
    reason: "payment.failed",
    actorType: "system",
    actorRef: "evt_riddra_003",
    changedAt: "Apr 12, 2026 • 5:38 PM",
  },
  {
    id: "ent_audit_003",
    userRef: "ops@riddra.com",
    featureCode: "portfolio_import",
    previousLevel: "pro",
    nextLevel: "elite",
    reason: "manual support override",
    actorType: "staff",
    actorRef: "support_review",
    changedAt: "Apr 12, 2026 • 11:20 AM",
  },
];

export const entitlementAuditRules = [
  "Every access-level change should have a reason that support, ops, and product can all understand later.",
  "System-driven changes should point back to payment or auth events, while staff-driven changes should reference the exact review or override trail.",
  "Entitlement history should explain why the user can or cannot access a feature, not just log a raw state mutation.",
];
