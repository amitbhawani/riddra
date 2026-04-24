import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

type LaunchDecisionMode =
  | "internal_review"
  | "launch_prep"
  | "private_beta"
  | "public_beta"
  | "full_launch";

type LaunchBlocker = {
  title: string;
  status: "Resolved" | "Blocking";
  requiredFor: LaunchDecisionMode;
  detail: string;
};

const modeLabels: Record<LaunchDecisionMode, string> = {
  internal_review: "Internal review",
  launch_prep: "Launch prep",
  private_beta: "Private beta",
  public_beta: "Public beta",
  full_launch: "Full launch",
};

const modeRank: Record<LaunchDecisionMode, number> = {
  internal_review: 0,
  launch_prep: 1,
  private_beta: 2,
  public_beta: 3,
  full_launch: 4,
};

function appliesToCandidate(candidate: LaunchDecisionMode, blockerRequirement: LaunchDecisionMode) {
  return modeRank[candidate] >= modeRank[blockerRequirement];
}

function getHighestSafeMode(blockers: LaunchBlocker[]): LaunchDecisionMode {
  const candidates: LaunchDecisionMode[] = [
    "full_launch",
    "public_beta",
    "private_beta",
    "launch_prep",
    "internal_review",
  ];

  for (const candidate of candidates) {
    const hasBlockingRequirement = blockers.some(
      (blocker) => blocker.status === "Blocking" && appliesToCandidate(candidate, blocker.requiredFor),
    );

    if (!hasBlockingRequirement) {
      return candidate;
    }
  }

  return "internal_review";
}

export function getLaunchDecision() {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();

  const blockers: LaunchBlocker[] = [
    {
      title: "Public site URL and support contact",
      status: config.siteUrl && (config.supportEmail || config.contactEmail) ? "Resolved" : "Blocking",
      requiredFor: "launch_prep",
      detail:
        "Launch prep needs a trustworthy public URL and support destination so auth, legal copy, trust pages, and callbacks can point to the right place.",
    },
    {
      title: "Supabase public env and auth launch path",
      status: hasRuntimeSupabaseEnv() ? "Resolved" : "Blocking",
      requiredFor: "launch_prep",
      detail:
        "Without Supabase public environment variables, account and auth flows cannot be treated as launch-capable.",
    },
    {
      title: "Auth callback and provider alignment",
      status: hasRuntimeSupabaseEnv() && config.siteUrl ? "Resolved" : "Blocking",
      requiredFor: "private_beta",
      detail:
        "Private beta needs verified callback alignment across local, production, Supabase, and Google so users can sign in without dead ends.",
    },
    {
      title: "Launch scope and beta-gate decisions",
      status:
        config.launchMode === "private_beta" ||
        config.launchMode === "public_beta" ||
        config.launchMode === "full_launch"
          ? "Resolved"
          : "Blocking",
      requiredFor: "private_beta",
      detail:
        "A private beta only makes sense once the team has intentionally decided what is accessible, what stays operator-only, and what remains internal.",
    },
    {
      title: "Email or support delivery confidence",
      status: Boolean(resend.configured || config.supportEmail || config.contactEmail) ? "Resolved" : "Blocking",
      requiredFor: "private_beta",
      detail:
        "At least one reliable support or delivery path should exist before beta users are invited to rely on the platform.",
    },
    {
      title: "Payments configuration if monetization is public",
      status: Boolean(config.razorpayKeyId && config.razorpayWebhookSecret) ? "Resolved" : "Blocking",
      requiredFor: "full_launch",
      detail:
        "Full launch needs pricing and billing confidence if premium plans are publicly positioned as active rather than coming soon.",
    },
    {
      title: "Live AI decision",
      status: "Resolved",
      requiredFor: "full_launch",
      detail:
        "Live AI remains optional because formula-first mode is a valid production posture. The real requirement is clarity, not forced model usage.",
    },
  ];

  const recommendedMode = getHighestSafeMode(blockers);

  return {
    recommendedMode,
    recommendedLabel: modeLabels[recommendedMode],
    blockers,
    blockingCount: blockers.filter((blocker) => blocker.status === "Blocking").length,
    resolvedCount: blockers.filter((blocker) => blocker.status === "Resolved").length,
  };
}
