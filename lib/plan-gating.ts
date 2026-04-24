import { redirect } from "next/navigation";

import { isAdminEmail, requireUser } from "@/lib/auth";
import { getUserSubscriptionSummary } from "@/lib/content";
import { getPlanLabel, normalizePlanTier, planRank, type PlanTier } from "@/lib/plan-tiers";

export { getPlanLabel, normalizePlanTier, type PlanTier } from "@/lib/plan-tiers";

export async function getCurrentPlanTier() {
  const user = await requireUser();

  if (isAdminEmail(user.email)) {
    return {
      user,
      plan: "elite" as PlanTier,
      label: "Admin",
      subscription: null,
      isAdmin: true,
    };
  }

  const subscription = await getUserSubscriptionSummary(user);
  const isActive =
    subscription?.status &&
    ["active", "trialing", "paid", "live"].includes(subscription.status.toLowerCase());
  const plan = isActive ? normalizePlanTier(subscription?.planCode) : "starter";

  return {
    user,
    plan,
    label: getPlanLabel(plan),
    subscription,
    isAdmin: false,
  };
}

export async function requirePlanTier(requiredPlan: PlanTier, fromPath: string) {
  const current = await getCurrentPlanTier();

  if (current.isAdmin) {
    return current;
  }

  if (planRank[current.plan] >= planRank[requiredPlan]) {
    return current;
  }

  const params = new URLSearchParams({
    required: requiredPlan,
    from: fromPath,
    current: current.plan,
  });

  redirect(`/account/access?${params.toString()}`);
}
