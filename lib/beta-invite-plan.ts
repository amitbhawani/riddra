type BetaInviteSegment = {
  name: string;
  size: string;
  goal: string;
  successSignal: string;
};

export function getBetaInvitePlan() {
  const segments: BetaInviteSegment[] = [
    {
      name: "Inner circle",
      size: "5-10 users",
      goal: "Catch auth, portfolio, support, and clarity issues with users who will actually report them back quickly.",
      successSignal: "Users can sign in, understand the product posture, and complete the first workflow without hand-holding.",
    },
    {
      name: "Warm public beta",
      size: "25-50 users",
      goal: "Validate that support paths, launch copy, and trust-facing flows still hold up when feedback becomes less curated.",
      successSignal: "No recurring P0 trust failures and repeated questions start clustering into manageable copy/product improvements.",
    },
    {
      name: "Broader beta expansion",
      size: "100+ users",
      goal: "Stress the help, onboarding, support, and premium-positioning system before any louder public announcement happens.",
      successSignal: "The team can absorb feedback volume without losing control of auth, support, or confidence-sensitive workflows.",
    },
  ];

  return {
    segments,
    guardrails: [
      "Do not expand beta if auth or callback issues are still being reported.",
      "Do not increase invites while support contact or trust messaging is still being corrected.",
      "Only widen the beta after live smoke tests, triage rules, and owner approvals are being used in practice.",
    ],
  };
}
