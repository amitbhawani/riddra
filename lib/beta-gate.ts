export const betaGateSummary = {
  publicTracks: 4,
  restrictedTracks: 4,
  operatorChecks: 5,
};

export const betaGateItems = [
  {
    title: "SEO and trust shell",
    status: "Public beta ready",
    area: "Public",
    summary:
      "Homepage, pricing, markets, stocks, IPOs, funds, tools, learn, legal, and trust pages can anchor a limited public beta if public copy is finalized.",
  },
  {
    title: "Signed-in basics",
    status: "Public beta ready",
    area: "Signed-in",
    summary:
      "Signup, login, account setup, inbox, alerts, and workspace basics can be included once Supabase auth and callbacks are verified in the live environment.",
  },
  {
    title: "Payments and monetization",
    status: "Restrict until verified",
    area: "Revenue",
    summary:
      "Billing and payment-linked messaging should stay soft or hidden until payment keys, webhooks, and entitlement behavior are tested in production.",
  },
  {
    title: "Premium chart and proprietary intelligence claims",
    status: "Restrict until verified",
    area: "Premium",
    summary:
      "Anything depending on Pine Script, premium indicator behavior, or data-source differentiation should stay conservative until inputs are actually connected.",
  },
  {
    title: "Admin and operator stack",
    status: "Internal only",
    area: "Ops",
    summary:
      "The admin surfaces should remain internal and protected, even during public beta, because they are operating systems rather than user-facing product value.",
  },
];

export const betaGateRules = [
  "Public beta should expose the strongest trustworthy surfaces, not the broadest possible surface area.",
  "Anything requiring unverified providers should default to hidden, soft-positioned, or operator-only.",
  "Restricted does not mean deleted; it means intentionally held back until it is safe to promote.",
];
