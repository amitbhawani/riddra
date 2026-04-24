export type PlanTier = "starter" | "pro" | "elite";

export const planRank: Record<PlanTier, number> = {
  starter: 0,
  pro: 1,
  elite: 2,
};

export function normalizePlanTier(planCode: string | null | undefined): PlanTier {
  const normalized = (planCode ?? "").trim().toLowerCase();

  if (normalized.includes("elite")) {
    return "elite";
  }

  if (normalized.includes("pro")) {
    return "pro";
  }

  return "starter";
}

export function getPlanLabel(plan: PlanTier) {
  if (plan === "elite") return "Elite";
  if (plan === "pro") return "Pro";
  return "Starter";
}
