export type AccountSupportTrack = {
  title: string;
  summary: string;
  href: string;
};

export const accountSupportTracks: AccountSupportTrack[] = [
  {
    title: "Subscription lifecycle review",
    summary: "See how activation, renewal, failure, and fallback access should behave before relying on billing-state assumptions elsewhere.",
    href: "/account/billing/lifecycle",
  },
  {
    title: "Billing and renewal help",
    summary: "Understand charge failures, recovery timing, invoice posture, and what should happen next once the payment stack is live.",
    href: "/account/billing/recovery",
  },
  {
    title: "Portfolio and import help",
    summary: "Use the guided import and manual-entry paths when holdings, CSV structure, or broker continuity need review.",
    href: "/portfolio/import",
  },
  {
    title: "Access and entitlement review",
    summary: "Check how plan posture, synced entitlements, and premium-route expectations should line up in the workspace.",
    href: "/account/access/entitlements",
  },
  {
    title: "Public help and explanations",
    summary: "Keep billing, onboarding, and product guidance aligned with the public help center instead of relying only on private explanations.",
    href: "/help",
  },
];

export const accountSupportRules = [
  "Subscriber support should explain what is real today, what is still preview-backed, and what the user should do next.",
  "Support routes should stay visible inside the account so billing, onboarding, and workspace confusion do not depend on admin-only pages.",
  "Do not imply live ticketing, WhatsApp delivery, or transactional email continuity until those channels are actually configured.",
];
