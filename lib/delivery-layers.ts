export const deliveryLayersSummary = {
  platformLayers: 5,
  activeArtifacts: 9,
  rolloutZones: 4,
};

export const deliveryLayerItems = [
  {
    title: "Canonical data layer",
    status: "Live",
    summary:
      "Asset registry, source contracts, lifecycle state, and structured market records should remain the trusted base layer that nothing presentation-specific is allowed to corrupt.",
  },
  {
    title: "Editorial and document layer",
    status: "Live",
    summary:
      "Manual reviews, announcements, uploads, FAQs, and creator assets should remain separate from canonical source records while still linking cleanly through asset identity.",
  },
  {
    title: "Derived intelligence layer",
    status: "Live",
    summary:
      "Coverage scores, compare views, AI grounding inputs, alert logic, and search summaries should be generated from stable upstream records and version-aware rules.",
  },
  {
    title: "Delivery artifact layer",
    status: "In progress",
    summary:
      "Page-ready snapshots, cache entries, notification payloads, sitemap fragments, and search-ready objects should be treated as disposable outputs, not the source of truth.",
  },
  {
    title: "Operator rollout layer",
    status: "In progress",
    summary:
      "Module toggles, provider settings, visibility rules, and rollout modes should determine how delivery layers are exposed without mutating the underlying record systems.",
  },
];

export const deliveryLayerRules = [
  "Public pages should consume prepared delivery artifacts without collapsing source, editorial, and derived concerns into one record type.",
  "Operator controls may change visibility and routing behavior, but should not rewrite canonical records directly.",
  "This separation is what keeps the platform scalable when thousands of pages, alerts, and integrations start running in parallel.",
];
