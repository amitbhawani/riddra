import type { FundSnapshot, StockSnapshot } from "@/lib/mock-data";

function summarizeTruthPair(left: string, right: string) {
  return left === right ? left : `${left} + ${right}`;
}

export function getStockTruthLabel(stock: StockSnapshot) {
  if (stock.snapshotMeta?.mode === "delayed_snapshot") {
    return "Delayed quote snapshot";
  }

  if (stock.snapshotMeta?.mode === "manual_close") {
    return "Manual retained close";
  }

  return "Provider-backed quote unavailable";
}

export function getStockTruthDetail(stock: StockSnapshot) {
  return (
    stock.snapshotMeta?.marketDetail ??
    "This stock route stays conservative until a provider-backed durable quote is written for the symbol."
  );
}

export function getFundTruthLabel(fund: FundSnapshot) {
  if (fund.snapshotMeta?.mode === "delayed_snapshot") {
    return "Delayed NAV snapshot";
  }

  if (fund.snapshotMeta?.mode === "manual_nav") {
    return "Manual retained NAV";
  }

  return "Provider-backed NAV unavailable";
}

export function getFundTruthDetail(fund: FundSnapshot) {
  return (
    fund.snapshotMeta?.marketDetail ??
    "This fund route stays conservative until a provider-backed durable NAV is written for the scheme."
  );
}

export function getStockCompareTrustCards(left: StockSnapshot, right: StockSnapshot) {
  const relationship =
    left.sector === right.sector
      ? "Same-sector peer set"
      : `${left.sector} vs ${right.sector}`;

  return [
    {
      title: "Matchup type",
      value: relationship,
      detail:
        left.sector === right.sector
          ? "This is a clean peer-style compare route, so quality, leverage, and scale differences are easier to explain quickly."
          : "This pair still works as a decision route, but it needs clearer narration because sector posture is not identical on both sides.",
    },
    {
      title: "Data posture",
      value: summarizeTruthPair(getStockTruthLabel(left), getStockTruthLabel(right)),
      detail: `${left.name}: ${getStockTruthDetail(left)} ${right.name}: ${getStockTruthDetail(right)}`,
    },
    {
      title: "Best opening angle",
      value: "Quality, balance sheet, and scale",
      detail:
        "Lead with return ratios, leverage comfort, and market-cap posture before moving into chart behavior or deeper event context.",
    },
  ];
}

export function getFundCompareTrustCards(left: FundSnapshot, right: FundSnapshot) {
  const sameCategory = left.category === right.category;
  const sameBenchmark = left.benchmark === right.benchmark;

  return [
    {
      title: "Matchup type",
      value: sameCategory ? "Same-category shortlist" : sameBenchmark ? "Shared-benchmark shortlist" : "Broader allocator matchup",
      detail: sameCategory
        ? "This is a clean allocator compare route, so cost, return consistency, and overlap posture all translate naturally."
        : sameBenchmark
          ? "The benchmark is aligned, which keeps the comparison useful even though the category fit is not perfectly identical."
          : "This route is still useful for allocation discussion, but it needs extra care because the two funds are not direct like-for-like peers.",
    },
    {
      title: "Data posture",
      value: summarizeTruthPair(getFundTruthLabel(left), getFundTruthLabel(right)),
      detail: `${left.name}: ${getFundTruthDetail(left)} ${right.name}: ${getFundTruthDetail(right)}`,
    },
    {
      title: "Best opening angle",
      value: "Category fit, cost, and overlap",
      detail:
        "Lead with category role, expense drag, and portfolio overlap before using trailing returns as the deciding story.",
    },
  ];
}
