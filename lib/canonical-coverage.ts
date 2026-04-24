import { sampleFunds, sampleIpos, sampleStocks } from "@/lib/mock-data";
import { wealthProducts, wealthFamilyMeta, type WealthFamily } from "@/lib/wealth-products";

type CoverageFamily = "stock" | "mutual_fund" | "ipo" | WealthFamily;
type CoverageTruthState = "delayed_snapshot" | "manual_close" | "seeded_fallback" | "identity_ready";

export type CanonicalCoverageRow = {
  family: CoverageFamily;
  familyLabel: string;
  assetName: string;
  slug: string;
  symbolOrCode: string;
  route: string;
  truthState: CoverageTruthState;
  truthLabel: string;
  source: string;
};

function getCoverageFamilyLabel(family: CoverageFamily) {
  switch (family) {
    case "stock":
      return "Stocks";
    case "mutual_fund":
      return "Mutual Funds";
    case "ipo":
      return "IPOs";
    default:
      return wealthFamilyMeta[family].label;
  }
}

function getTruthLabel(truthState: CoverageTruthState) {
  switch (truthState) {
    case "delayed_snapshot":
      return "Delayed snapshot";
    case "manual_close":
      return "Manual last close";
    case "seeded_fallback":
      return "Seeded fallback";
    case "identity_ready":
      return "Identity ready";
  }
}

const stockRows: CanonicalCoverageRow[] = sampleStocks.map((stock) => {
  const truthState =
    stock.snapshotMeta?.mode === "delayed_snapshot"
      ? "delayed_snapshot"
      : stock.snapshotMeta?.mode === "manual_close"
        ? "manual_close"
        : "seeded_fallback";

  return {
    family: "stock",
    familyLabel: getCoverageFamilyLabel("stock"),
    assetName: stock.name,
    slug: stock.slug,
    symbolOrCode: stock.symbol,
    route: `/stocks/${stock.slug}`,
    truthState,
    truthLabel: getTruthLabel(truthState),
    source: stock.snapshotMeta?.source ?? "Seeded stock registry",
  };
});

const fundRows: CanonicalCoverageRow[] = sampleFunds.map((fund) => {
  const truthState = fund.snapshotMeta?.mode === "delayed_snapshot" ? "delayed_snapshot" : "seeded_fallback";

  return {
    family: "mutual_fund",
    familyLabel: getCoverageFamilyLabel("mutual_fund"),
    assetName: fund.name,
    slug: fund.slug,
    symbolOrCode: fund.primarySourceCode,
    route: `/mutual-funds/${fund.slug}`,
    truthState,
    truthLabel: getTruthLabel(truthState),
    source: fund.snapshotMeta?.source ?? "Seeded fund registry",
  };
});

const ipoRows: CanonicalCoverageRow[] = sampleIpos.map((ipo) => ({
  family: "ipo",
  familyLabel: getCoverageFamilyLabel("ipo"),
  assetName: ipo.name,
  slug: ipo.slug,
  symbolOrCode: ipo.primarySourceCode,
  route: `/ipo/${ipo.slug}`,
  truthState: "identity_ready",
  truthLabel: getTruthLabel("identity_ready"),
  source: "IPO route registry",
}));

const wealthRows: CanonicalCoverageRow[] = wealthProducts.map((product) => ({
  family: product.family,
  familyLabel: getCoverageFamilyLabel(product.family),
  assetName: product.name,
  slug: product.slug,
  symbolOrCode: product.manager,
  route: `${wealthFamilyMeta[product.family].href}/${product.slug}`,
  truthState: "identity_ready",
  truthLabel: getTruthLabel("identity_ready"),
  source: "Wealth product registry",
}));

export const canonicalCoverageRows = [...stockRows, ...fundRows, ...ipoRows, ...wealthRows].sort((left, right) =>
  left.assetName.localeCompare(right.assetName),
);

const routeFamilies: CoverageFamily[] = ["stock", "mutual_fund", "ipo", "etf", "pms", "aif", "sif"];

export const canonicalCoverageFamilyBreakdown = routeFamilies.map((family) => {
  const rows = canonicalCoverageRows.filter((row) => row.family === family);
  const delayed = rows.filter((row) => row.truthState === "delayed_snapshot").length;
  const manual = rows.filter((row) => row.truthState === "manual_close").length;
  const seeded = rows.filter((row) => row.truthState === "seeded_fallback").length;
  const identityReady = rows.filter((row) => row.truthState === "identity_ready").length;

  return {
    family,
    familyLabel: getCoverageFamilyLabel(family),
    routeCount: rows.length,
    delayed,
    manual,
    seeded,
    identityReady,
  };
});

export const canonicalCoverageSummary = {
  totalRoutes: canonicalCoverageRows.length,
  delayedRoutes: canonicalCoverageRows.filter((row) => row.truthState === "delayed_snapshot").length,
  manualRoutes: canonicalCoverageRows.filter((row) => row.truthState === "manual_close").length,
  seededRoutes: canonicalCoverageRows.filter((row) => row.truthState === "seeded_fallback").length,
  identityReadyRoutes: canonicalCoverageRows.filter((row) => row.truthState === "identity_ready").length,
};

export function toCanonicalCoverageCsv(rows: CanonicalCoverageRow[]) {
  const columns = ["family", "family_label", "asset_name", "slug", "symbol_or_code", "route", "truth_state", "truth_label", "source"];
  const dataRows = rows.map((row) =>
    [
      row.family,
      row.familyLabel,
      row.assetName,
      row.slug,
      row.symbolOrCode,
      row.route,
      row.truthState,
      row.truthLabel,
      row.source,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return `${columns.join(",")}\n${dataRows.join("\n")}\n`;
}
