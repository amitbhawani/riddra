export const aiGuardrailSummary = {
  groundedPipelines: 4,
  humanReviewPoints: 5,
  blockedUnsafeModes: 3,
};

export const aiGuardrailCards = [
  {
    title: "Grounded retrieval only",
    status: "Live",
    summary: "Search and copilot answers should pull from trusted internal sources, official data references, and editorial records instead of free-form generation.",
  },
  {
    title: "Human review for editorial output",
    status: "Live",
    summary: "Draft FAQs, document summaries, and public-facing commentary must stay inside a review workflow before publication.",
  },
  {
    title: "No silent cost expansion",
    status: "Live",
    summary: "Real AI calls stay disabled by default, budget-profiled, and visible in admin state before they can affect operating cost.",
  },
  {
    title: "No unsupported realtime claims",
    status: "Live",
    summary: "AI should never imply licensed realtime coverage, live broker sync certainty, or market prices unless backed by the approved source layer.",
  },
];

export const aiGuardrailRules = [
  "AI must never outrun the source-trust and licensing model of the platform.",
  "Deterministic and structured outputs come first; generated language is only a wrapper when it adds clarity.",
  "Operator controls, review logs, and model-on or model-off states should stay visible in admin surfaces.",
];
