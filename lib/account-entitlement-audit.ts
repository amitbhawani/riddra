import { getPlanLabel, type PlanTier } from "@/lib/plan-tiers";
import { subscriptionMatrixFeatures } from "@/lib/subscription-matrix";

export type EntitlementAuditRow = {
  feature: string;
  currentPlanStatus: string;
  route: string;
  note: string;
};

const featureRoutes = [
  "/markets",
  "/account/watchlists",
  "/portfolio",
  "/advanced-charts",
  "/account/alerts",
  "/trader-workstation",
] as const;

function resolvePlanCell(plan: PlanTier, item: (typeof subscriptionMatrixFeatures)[number]) {
  if (plan === "elite") return item.elite;
  if (plan === "pro") return item.pro;
  return item.starter;
}

function describeCurrentPlanStatus(plan: PlanTier, item: (typeof subscriptionMatrixFeatures)[number]) {
  const cell = resolvePlanCell(plan, item);

  if (cell === "Included") {
    return `${getPlanLabel(plan)} includes this`;
  }

  if (cell === "Planned") {
    return `${getPlanLabel(plan)} is intended to unlock this later`;
  }

  if (plan === "starter") {
    return "Upgrade path needed once live gating is active";
  }

  return `Not included in ${getPlanLabel(plan)} right now`;
}

export function getEntitlementAuditRows(currentPlan: PlanTier): EntitlementAuditRow[] {
  return subscriptionMatrixFeatures.map((item, index) => ({
    feature: item.feature,
    currentPlanStatus: describeCurrentPlanStatus(currentPlan, item),
    route: featureRoutes[index] ?? "/account/access",
    note: item.note,
  }));
}

export const entitlementAuditRules = [
  "A feature should only look live in the account once plan state, webhook state, and synced entitlements all agree.",
  "Starter, Pro, and Elite should later control actions and saved state more often than full public pages.",
  "The entitlement audit route should stay honest about preview mode until local bypass auth is retired.",
];
