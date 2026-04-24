export const assetRegistrySummary = {
  canonicalAssets: 4,
  aliasMappings: 3,
  lifecycleStates: 4,
};

export const assetRegistrySamples = [
  {
    asset: "Tata Motors",
    type: "Listed stock",
    state: "Live",
    note: "Canonical stock records should own slugs, exchange identifiers, taxonomy links, and compare relationships so every listed-equity page points back to one source of truth.",
  },
  {
    asset: "Hero FinCorp",
    type: "Mainboard IPO",
    state: "Transition-ready",
    note: "IPO records should preserve archive continuity while defining the target listed-stock record and redirect strategy for the post-listing handoff.",
  },
  {
    asset: "Shree Ram Twistex",
    type: "SME IPO",
    state: "Archive-aware",
    note: "SME issues need explicit exchange type, GMP context, and lifecycle state so the CMS can separate SME history from the listed-equity route family later.",
  },
  {
    asset: "HDFC Mid-Cap Opportunities",
    type: "Mutual fund",
    state: "Live",
    note: "Fund records should own AMC relationships, category mappings, benchmark references, and future portfolio-holding links through the canonical registry.",
  },
];

export const assetRegistryRules = [
  "Every public page should map back to one canonical asset record so dynamic data, manual editorial content, documents, announcements, and alerts all attach to the same source of truth.",
  "Alias names, old slugs, broker symbols, and lifecycle transitions should be tracked inside the registry instead of being scattered across route logic or manual page exceptions.",
  "The asset registry should become the spine for compare flows, search results, portfolio imports, source jobs, and future app notifications so scale does not create duplicate records.",
];
