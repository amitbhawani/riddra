import { getLaunchState, type LaunchMode } from "@/lib/launch-state";

export const launchModeSummary = {
  configuredModes: 5,
  recommendedNow: "private_beta",
  activeMode: getLaunchState().mode,
};

export const launchModeItems: {
  mode: LaunchMode;
  title: string;
  status: string;
  summary: string;
}[] = [
  {
    mode: "internal_review",
    title: "Internal review",
    status: "Safe fallback",
    summary:
      "Use this when the team wants the full platform available for internal testing while keeping public expectations low and launch promotion off.",
  },
  {
    mode: "launch_prep",
    title: "Launch prep",
    status: "Use while activating",
    summary:
      "Use this while credentials, launch scope, and preflight checks are still being completed so the app reflects build-complete but not yet public-ready status.",
  },
  {
    mode: "private_beta",
    title: "Private beta",
    status: "Recommended for activation",
    summary:
      "Use this for a controlled beta with real providers, real support, and intentional access gating, while broader public marketing still stays off.",
  },
  {
    mode: "public_beta",
    title: "Public beta",
    status: "Use after private beta",
    summary:
      "Use this when the launch scope becomes intentionally public, real providers are active, and the team is ready to accept broader early traffic with close monitoring.",
  },
  {
    mode: "full_launch",
    title: "Full launch",
    status: "Use later",
    summary:
      "Use this only after auth, support, payments, trust copy, monitoring, and post-launch support lanes are all validated in a real environment.",
  },
];

export const launchModeRules = [
  "Changing the public message should follow actual provider activation, not optimism.",
  "Private beta is the honest default once real providers are active but access should stay curated and closely monitored.",
  "Full launch should only happen after preflight checks, owner signoff, and public-scope review are all complete.",
];
