import {
  getCanonicalFundComparePair,
  getCanonicalStockComparePair,
  getPreferredFundComparePairs,
  getPreferredStockComparePairs,
} from "@/lib/compare-routing";
import { sampleFunds, sampleStocks } from "@/lib/mock-data";

type CompareFamily = "stock_compare" | "fund_compare";

export type CanonicalCompareCoverageRow = {
  family: CompareFamily;
  familyLabel: string;
  leftName: string;
  leftSlug: string;
  rightName: string;
  rightSlug: string;
  route: string;
  source: string;
};

const stockCompareRows: CanonicalCompareCoverageRow[] = getPreferredStockComparePairs(sampleStocks, 1).map((pair) => {
  const canonicalPair = getCanonicalStockComparePair(sampleStocks, pair.left.slug, pair.right.slug);
  const left = canonicalPair ? sampleStocks.find((item) => item.slug === canonicalPair.leftSlug) ?? pair.left : pair.left;
  const right = canonicalPair ? sampleStocks.find((item) => item.slug === canonicalPair.rightSlug) ?? pair.right : pair.right;

  return {
    family: "stock_compare",
    familyLabel: "Stock compare",
    leftName: left.name,
    leftSlug: left.slug,
    rightName: right.name,
    rightSlug: right.slug,
    route: `/compare/stocks/${left.slug}/${right.slug}`,
    source: "Ranked stock compare registry",
  };
});

const fundCompareRows: CanonicalCompareCoverageRow[] = getPreferredFundComparePairs(sampleFunds, 1).map((pair) => {
  const canonicalPair = getCanonicalFundComparePair(sampleFunds, pair.left.slug, pair.right.slug);
  const left = canonicalPair ? sampleFunds.find((item) => item.slug === canonicalPair.leftSlug) ?? pair.left : pair.left;
  const right = canonicalPair ? sampleFunds.find((item) => item.slug === canonicalPair.rightSlug) ?? pair.right : pair.right;

  return {
    family: "fund_compare",
    familyLabel: "Mutual-fund compare",
    leftName: left.name,
    leftSlug: left.slug,
    rightName: right.name,
    rightSlug: right.slug,
    route: `/compare/mutual-funds/${left.slug}/${right.slug}`,
    source: "Ranked fund compare registry",
  };
});

export const canonicalCompareCoverageRows = [...stockCompareRows, ...fundCompareRows].sort((left, right) =>
  left.route.localeCompare(right.route),
);

export const canonicalCompareCoverageSummary = {
  totalRoutes: canonicalCompareCoverageRows.length,
  stockRoutes: stockCompareRows.length,
  fundRoutes: fundCompareRows.length,
};

export function toCanonicalCompareCoverageCsv(rows: CanonicalCompareCoverageRow[]) {
  const columns = ["family", "family_label", "left_name", "left_slug", "right_name", "right_slug", "route", "source"];
  const dataRows = rows.map((row) =>
    [
      row.family,
      row.familyLabel,
      row.leftName,
      row.leftSlug,
      row.rightName,
      row.rightSlug,
      row.route,
      row.source,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return `${columns.join(",")}\n${dataRows.join("\n")}\n`;
}
