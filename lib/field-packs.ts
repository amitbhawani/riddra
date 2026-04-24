export const fieldPackSummary = {
  reusablePacks: 7,
  validatedFamilies: 5,
  queuedPackGroups: 3,
};

export const fieldPackItems = [
  {
    title: "Identity and lifecycle pack",
    status: "Live",
    summary:
      "Slug, symbol, aliases, lifecycle state, archive flags, and continuity rules that every asset family should inherit first.",
  },
  {
    title: "Price and market metrics pack",
    status: "Live",
    summary:
      "Price, returns, volume, market cap, issue size, NAV, AUM, and time-sensitive numeric fields with source ownership.",
  },
  {
    title: "Editorial review pack",
    status: "Live",
    summary:
      "Summary, strengths, risks, FAQs, review notes, and premium prompts designed for staff editing and revision history.",
  },
  {
    title: "Documents and announcements pack",
    status: "Live",
    summary:
      "Files, notes, citations, announcement dates, and importance rules shared across stocks, IPOs, funds, and wealth products.",
  },
  {
    title: "Compare and relationship pack",
    status: "Live",
    summary:
      "Peer sets, categories, sectors, graph links, and compare context for discovery and search relevance.",
  },
  {
    title: "Campaign and CTA pack",
    status: "Queued",
    summary:
      "Signup offers, bundle messages, webinar CTAs, and creator-promo blocks that can be installed without page rewrites.",
  },
  {
    title: "Support and onboarding pack",
    status: "Queued",
    summary:
      "Help notes, onboarding nudges, issue-resolution blocks, and recovery prompts for future support-center modules.",
  },
];

export const fieldPackRules = [
  "Field packs should be reusable across route families so adding a new domain does not mean redefining the same core fields.",
  "Each pack should have validation rules, ownership rules, and UI expectations before it is applied to a live family.",
  "Operators should eventually be able to attach or extend packs from admin controls instead of relying on code edits for every small variation.",
];
