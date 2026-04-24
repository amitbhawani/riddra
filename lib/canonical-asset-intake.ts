import { sampleFunds, sampleIpos, sampleStocks } from "@/lib/mock-data";
import { wealthProducts } from "@/lib/wealth-products";
import { canonicalCoverageSummary } from "@/lib/canonical-coverage";

type IntakeTemplate = {
  family: string;
  owner: string;
  currentCoverage: number;
  firstWaveTarget: string;
  objective: string;
  columns: string[];
};

const etfCount = wealthProducts.filter((product) => product.family === "etf").length;
const pmsCount = wealthProducts.filter((product) => product.family === "pms").length;
const aifCount = wealthProducts.filter((product) => product.family === "aif").length;
const sifCount = wealthProducts.filter((product) => product.family === "sif").length;

export const canonicalAssetIntakeSummary = {
  liveFamilies: 7,
  currentSeededAssets:
    sampleStocks.length +
    sampleFunds.length +
    sampleIpos.length +
    etfCount +
    pmsCount +
    aifCount +
    sifCount,
  currentRouteCoverage: canonicalCoverageSummary.totalRoutes,
  firstWaveGoal: "100+ stock routes live · deeper fund import pending · Active IPOs · flagship wealth products",
};

export const canonicalAssetIntakeTemplates: IntakeTemplate[] = [
  {
    family: "Stocks",
    owner: "Market data + editorial",
    currentCoverage: sampleStocks.length,
    firstWaveTarget: "100 core NSE/BSE names reached",
    objective: "Use the expanded 100-plus route graph as the public first wave, then replace seeded rows with canonical symbols, issuer continuity, and route-safe slugs.",
    columns: [
      "asset_name",
      "slug",
      "nse_symbol",
      "bse_symbol",
      "isin",
      "sector_slug",
      "industry_label",
      "exchange_primary",
      "official_website",
      "investor_relations_url",
      "status",
    ],
  },
  {
    family: "Mutual Funds",
    owner: "Fund research + ops",
    currentCoverage: sampleFunds.length,
    firstWaveTarget: "100 high-demand funds",
    objective: "Create canonical fund records with AMC continuity, category mapping, and NAV-source readiness.",
    columns: [
      "scheme_name",
      "slug",
      "amfi_code",
      "amc_name",
      "category_slug",
      "benchmark_name",
      "direct_or_regular",
      "plan_type",
      "isin_growth",
      "isin_idcw",
      "factsheet_url",
      "status",
    ],
  },
  {
    family: "IPOs",
    owner: "IPO research + filings",
    currentCoverage: sampleIpos.length,
    firstWaveTarget: "All active and upcoming issues",
    objective: "Track issue lifecycle cleanly from filing to listing, then map listed IPOs into stock continuity.",
    columns: [
      "issue_name",
      "slug",
      "issuer_name",
      "exchange_type",
      "ipo_type",
      "drhp_url",
      "rhp_url",
      "registrar",
      "lead_manager",
      "open_date",
      "listing_date",
      "status",
    ],
  },
  {
    family: "ETFs",
    owner: "Wealth research",
    currentCoverage: etfCount,
    firstWaveTarget: "25 flagship ETFs",
    objective: "Build a benchmark-led ETF registry with liquidity, tracking, and issuer continuity ready for deeper detail pages.",
    columns: [
      "product_name",
      "slug",
      "issuer_name",
      "family",
      "benchmark_name",
      "nse_symbol",
      "expense_ratio_source",
      "tracking_source",
      "factsheet_url",
      "status",
    ],
  },
  {
    family: "PMS / AIF / SIF",
    owner: "Wealth ops + editorial",
    currentCoverage: pmsCount + aifCount + sifCount,
    firstWaveTarget: "10 flagship products per family",
    objective: "Capture manager, structure, minimum ticket, and document-led diligence data for higher-intent wealth products.",
    columns: [
      "product_name",
      "slug",
      "family",
      "manager_name",
      "issuer_name",
      "category_label",
      "minimum_ticket",
      "structure",
      "benchmark_name",
      "document_url",
      "status",
    ],
  },
];

export const canonicalAssetIntakeRules = [
  "Every row should have one canonical slug only. Aliases and alternate labels belong in a separate alias layer, not in duplicate asset rows.",
  "Do not import price, NAV, or chart values in this spreadsheet. This intake is for identity, mapping, and source readiness first.",
  "Use official issuer, AMC, registrar, exchange, and factsheet URLs wherever possible so later ingestion and trust labeling stay grounded.",
  "Each family should have a first-wave batch that is small enough to review manually before scaling toward thousands of records.",
  "If an IPO is expected to become a stock route later, capture the future listed-company continuity fields early instead of recreating identity after listing.",
];

export function getCanonicalAssetIntakeTemplate(family: string | null) {
  if (!family) {
    return undefined;
  }

  return canonicalAssetIntakeTemplates.find((item) => item.family.toLowerCase() === family.toLowerCase());
}

export function toCanonicalAssetIntakeTemplateCsv(columns: string[]) {
  return `${columns.join(",")}\n`;
}

export function getCanonicalAssetIntakeTemplateFilename(family: string) {
  return `${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-template.csv`;
}
