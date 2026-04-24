import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

type LaunchApproval = {
  owner: string;
  lane: string;
  status: "Approved" | "Pending";
  detail: string;
};

export function getLaunchApprovals() {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();

  const approvals: LaunchApproval[] = [
    {
      owner: "Product owner",
      lane: "Scope and public posture",
      status:
        config.launchMode === "private_beta" ||
        config.launchMode === "public_beta" ||
        config.launchMode === "full_launch"
          ? "Approved"
          : "Pending",
      detail:
        "Private beta, public beta, or full-launch mode should only be chosen once the launch scope, gated surfaces, and roadmap-positioned features are deliberately approved.",
    },
    {
      owner: "Engineering",
      lane: "Auth, envs, and protected access",
      status: hasRuntimeSupabaseEnv() ? "Approved" : "Pending",
      detail:
        "Engineering signoff depends on real public Supabase envs, protected account/admin behavior, and callback-linked auth flows being treated as operational.",
    },
    {
      owner: "Support / operations",
      lane: "Trust contact and recovery path",
      status: config.supportEmail || config.contactEmail ? "Approved" : "Pending",
      detail:
        "Support signoff needs a real support destination and a credible recovery/contact path before outside users are invited in.",
    },
    {
      owner: "Payments owner",
      lane: "Monetization visibility",
      status: config.razorpayKeyId && config.razorpayWebhookSecret ? "Approved" : "Pending",
      detail:
        "If billing is public in this release, payments should only be approved when the payment key and webhook secret are configured.",
    },
    {
      owner: "Growth / communications",
      lane: "Email and beta messaging",
      status: resend.configured || config.supportEmail || config.contactEmail ? "Approved" : "Pending",
      detail:
        "Growth approval needs at least one usable delivery or response channel so onboarding and support messaging are not dead ends.",
    },
  ];

  return {
    approvals,
    approved: approvals.filter((item) => item.status === "Approved").length,
    pending: approvals.filter((item) => item.status === "Pending").length,
  };
}
