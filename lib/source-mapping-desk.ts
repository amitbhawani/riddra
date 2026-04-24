export const sourceMappingDeskSummary = {
  assetSheets: 5,
  sourceClasses: 6,
  humanOwners: 3,
};

export const sourceMappingDeskLanes = [
  {
    title: "Canonical asset master",
    owner: "Operations / research",
    summary: "Build one canonical list for stocks, IPOs, mutual funds, ETFs, PMS, AIF, and SIF with slugs, aliases, symbols, issuer/AMC mapping, and lifecycle state.",
  },
  {
    title: "Official source mapping",
    owner: "Research",
    summary: "Assign the trusted source strategy for each family: exchange, regulator, issuer, fund house, factsheet, or approved reference feed.",
  },
  {
    title: "Editorial block template mapping",
    owner: "Content",
    summary: "Define which sections are source-fed versus manual for stocks, IPOs, funds, and wealth-product pages so the CMS can scale safely.",
  },
  {
    title: "Document collection and archive intake",
    owner: "Shared",
    summary: "Gather DRHP, RHP, factsheets, annual reports, product notes, and commentary inputs for the first priority asset set.",
  },
];

export const sourceMappingDeskRules = [
  "Humans should not hand-build thousands of pages; they should prepare canonical asset sheets, trusted source maps, and editorial templates.",
  "Every imported number should trace back to a declared source class before it reaches public pages.",
  "Manual CMS effort should focus on differentiated context, reviews, FAQs, announcements, and archive notes instead of repeating numeric data entry.",
];
