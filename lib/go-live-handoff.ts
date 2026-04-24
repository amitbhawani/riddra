export const goLiveHandoffSummary = {
  launchStreams: 4,
  blockedInputs: 5,
  handoffOwners: 4,
};

export const goLiveHandoffItems = [
  {
    title: "Platform shell and route confidence",
    status: "Ready",
    owner: "Codex",
    summary:
      "The public route system, admin surfaces, roadmap tracker, and product clusters are now structurally complete from the build side and compiling cleanly.",
  },
  {
    title: "Provider activation and credentials",
    status: "Blocked",
    owner: "User",
    summary:
      "Supabase, Google auth, email delivery, payment keys, and deployment environment values still need real credentials before the platform can move from build-complete to launchable.",
  },
  {
    title: "Legal, support, and business copy",
    status: "Blocked",
    owner: "User",
    summary:
      "Final support destinations, legal review, and business-facing launch copy still need owner confirmation so trust pages are not only placeholders with structure.",
  },
  {
    title: "Launch-scoped feature decision",
    status: "In progress",
    owner: "Shared",
    summary:
      "We should now decide which features are in the first public launch, which are roadmap-visible only, and which require provider activation before public exposure.",
  },
  {
    title: "Post-build activation sequence",
    status: "In progress",
    owner: "Shared",
    summary:
      "The next practical work is now operational: apply envs, run real DB migrations, activate auth, confirm billing, and validate live data and notifications in order.",
  },
];

export const goLiveHandoffRules = [
  "Build-complete is not the same thing as production-ready; credentials and activation still matter.",
  "The first public launch should prioritize trustworthy scope over feature inflation.",
  "Every blocked external input should be visible with a concrete owner before launch day.",
];
