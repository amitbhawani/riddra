export const taxonomySummary = {
  taxonomyTypes: 3,
  mappedAssets: 2,
  relationshipLinks: 3,
};

export const taxonomySamples = [
  {
    taxonomyType: "sector",
    label: "Auto",
    slug: "auto",
    note: "Used for stock clustering, sector hubs, and related-page discovery.",
  },
  {
    taxonomyType: "fund_category",
    label: "Mid Cap Fund",
    slug: "mid-cap-fund",
    note: "Used for mutual-fund category pages, compare flows, and filtered discovery.",
  },
  {
    taxonomyType: "market_cluster",
    label: "Nifty 50",
    slug: "nifty-50",
    note: "Used for index-linked discovery and future workspace or tracker segmentation.",
  },
];

export const relationshipSamples = [
  {
    source: "stock:tata-motors",
    relationshipType: "compare_candidate",
    target: "stock:reliance-industries",
    strength: 72,
    note: "Large-cap compare route placeholder for related market leaders.",
  },
  {
    source: "ipo:hero-fincorp",
    relationshipType: "sector_reference",
    target: "stock:tata-motors",
    strength: 48,
    note: "Illustrates how IPO pages may borrow context from listed peers or sectors.",
  },
  {
    source: "stock:tata-motors",
    relationshipType: "learning_reference",
    target: "learn:what-is-open-interest",
    strength: 35,
    note: "Shows how assets can connect into learning and smart-search support later.",
  },
];

export const relationshipRules = [
  "Taxonomies should be reusable across route families so sectors, categories, clusters, and asset families stay consistent.",
  "Relationship links should be data-driven so compare pages, related links, and AI retrieval stay maintainable at scale.",
  "Lifecycle transitions should preserve graph continuity, so IPOs, listed stocks, and related content do not lose their context when states change.",
];
