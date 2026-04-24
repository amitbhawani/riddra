export const modulePresetsSummary = {
  presetFamilies: 5,
  readyPresets: 4,
  queuedBundles: 3,
};

export const modulePresetItems = [
  {
    title: "SEO research preset",
    status: "Ready",
    summary:
      "A reusable preset that bundles route structure, schema intent, content sections, FAQ blocks, and compare hooks for long-tail research families.",
  },
  {
    title: "Lifecycle asset preset",
    status: "Ready",
    summary:
      "A reusable preset for routes that change state over time, like IPO to listed stock or launch page to archive page, with continuity and redirect rules.",
  },
  {
    title: "Subscriber utility preset",
    status: "Ready",
    summary:
      "A reusable preset for watchlists, alerts, saved screens, workspace tools, and gated utility pages that share account-aware UX patterns.",
  },
  {
    title: "Creator funnel preset",
    status: "Ready",
    summary:
      "A reusable preset for webinars, newsletters, course funnels, and giveaway journeys that connect education, signup, and recovery loops.",
  },
  {
    title: "Partner microsite preset",
    status: "Queued",
    summary:
      "A reusable preset for future broker, issuer, or campaign collaboration pages that need controlled branding and modular compliance blocks.",
  },
];

export const modulePresetRules = [
  "A preset should package blocks, field packs, lifecycle assumptions, and search behavior together instead of leaving operators to assemble them manually.",
  "Presets should accelerate safe expansion, not encourage one-off forks of core product patterns.",
  "Every preset should declare which parts are public, subscriber-only, admin-controlled, and future-provider-dependent.",
];
