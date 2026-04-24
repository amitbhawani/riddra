export const starterKitsSummary = {
  kitFamilies: 6,
  reusablePatterns: 8,
  launchTemplates: 5,
};

export const starterKitItems = [
  {
    title: "SEO route-family kits",
    status: "In progress",
    summary:
      "Stocks, IPOs, funds, wealth products, and learning routes should eventually launch from reusable starter kits instead of repeating page-family setup manually.",
  },
  {
    title: "Workspace feature kits",
    status: "In progress",
    summary:
      "Watchlists, screens, alerts, billing, and broker-connected workflows should follow installable workspace kits instead of isolated account features.",
  },
  {
    title: "Campaign and microsite kits",
    status: "Queued",
    summary:
      "Lifecycle campaigns, landing flows, and launch microsites should later reuse preset launch kits rather than ad hoc page assembly.",
  },
  {
    title: "Operator-ready setup templates",
    status: "Queued",
    summary:
      "Each starter kit should eventually expose operator settings, required fields, and rollout defaults so activation becomes safer and faster.",
  },
];

export const starterKitRules = [
  "Starter kits should reduce repeated setup work across route families, not introduce new one-off exceptions.",
  "Every kit should define required fields, delivery blocks, SEO expectations, and admin touchpoints before it is considered reusable.",
  "Kits are only valuable if operators can understand and activate them without reading code.",
];
