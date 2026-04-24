type BetaRunbookStep = {
  title: string;
  owner: string;
  cadence: string;
  detail: string;
};

export function getBetaOpsRunbook() {
  const steps: BetaRunbookStep[] = [
    {
      title: "Morning posture check",
      owner: "Product + engineering",
      cadence: "Daily",
      detail:
        "Review launch mode, launch decision, go/no-go, and beta command center before inviting more users or changing public copy.",
    },
    {
      title: "Auth and support sweep",
      owner: "Engineering + support",
      cadence: "Daily",
      detail:
        "Recheck login success, callback behavior, account access, help routes, and contact visibility before the day’s beta traffic grows.",
    },
    {
      title: "Feedback and triage review",
      owner: "Product owner",
      cadence: "Daily",
      detail:
        "Cluster new user friction into feedback lanes, assign severity in beta triage, and confirm which issues block wider invites.",
    },
    {
      title: "Invite gating decision",
      owner: "Product + growth",
      cadence: "Every expansion",
      detail:
        "Use invite plan and beta metrics to decide whether to keep the audience flat, tighten scope, or widen access deliberately.",
    },
    {
      title: "Trust copy and messaging refresh",
      owner: "Growth + support",
      cadence: "As needed",
      detail:
        "Update help, pricing, launch-readiness, and support copy when the same confusion or promise-gap appears repeatedly in feedback.",
    },
    {
      title: "End-of-day beta summary",
      owner: "Product owner",
      cadence: "Daily",
      detail:
        "Capture what broke, what improved, what remains risky, and whether tomorrow should stay in the same beta posture or narrow again.",
    },
  ];

  return {
    steps,
    principles: [
      "Do not widen beta on the same day a P0 trust or auth issue appears.",
      "Keep beta scope smaller than team response capacity.",
      "Treat clarity, contactability, and issue response as product features during beta.",
      "Only market what the current scope can actually support.",
    ],
  };
}
