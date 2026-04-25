export type StockFirstLaunchFamily =
  | "mutual_funds"
  | "fund_categories"
  | "wealth"
  | "etfs"
  | "pms"
  | "aif"
  | "sif";

export type StockFirstLaunchVariant = "hub" | "detail" | "compare";

type LaunchPlaceholderContent = {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel: string;
  currentItems: string[];
  nextItems: string[];
  primaryHref: string;
  primaryHrefLabel: string;
  secondaryHref: string;
  secondaryHrefLabel: string;
};

export const STOCK_FIRST_LAUNCH_ACTIVE = true;

const stockFirstLaunchLabels: Record<StockFirstLaunchFamily, string> = {
  mutual_funds: "Mutual fund",
  fund_categories: "Fund category",
  wealth: "Wealth",
  etfs: "ETF",
  pms: "PMS",
  aif: "AIF",
  sif: "SIF",
};

const stockFirstLaunchHubHrefs: Record<StockFirstLaunchFamily, string> = {
  mutual_funds: "/mutual-funds",
  fund_categories: "/fund-categories",
  wealth: "/wealth",
  etfs: "/etfs",
  pms: "/pms",
  aif: "/aif",
  sif: "/sif",
};

const stockFirstLaunchNextWaveNotes: Record<StockFirstLaunchFamily, string[]> = {
  mutual_funds: [
    "Launch live NAV, benchmark, holdings, allocation, and performance cards together instead of exposing a thin fund shell.",
    "Turn on compare, category, and shortlist flows only once the data and editorial posture feel complete.",
  ],
  fund_categories: [
    "Open category-led discovery once the live fund layer is ready to support shortlist and compare journeys.",
    "Bring back real in-category routing only after the mutual-fund detail pages are launched together.",
  ],
  wealth: [
    "Expand the wealth hub once ETF, PMS, AIF, and SIF detail pages are ready to behave like real public product surfaces.",
    "Keep cross-family discovery conservative until those specialist pages are complete enough to trust.",
  ],
  etfs: [
    "Launch benchmark, liquidity, tracking, and cost context together so ETF detail pages feel finished on day one.",
    "Re-open ETF compare and discovery only when the passive-investing layer is ready as a full surface.",
  ],
  pms: [
    "Launch manager, ticket-size, strategy, and suitability context together rather than exposing only seeded PMS shells.",
    "Re-open deeper PMS coverage once review, sourcing, and onboarding language are ready.",
  ],
  aif: [
    "Launch structure, eligibility, lock-in, and document-backed context together so AIF routes feel deliberate.",
    "Re-open alternative-product discovery only after the high-trust review layer is ready.",
  ],
  sif: [
    "Launch regulation-aware specialist context together so SIF pages do not feel preview-heavy.",
    "Re-open SIF detail routing once the wider specialist-product bench is ready for public traffic.",
  ],
};

export function isStockFirstLaunchActive() {
  return STOCK_FIRST_LAUNCH_ACTIVE;
}

export function isStockFirstLaunchPlaceholderFamily(family: StockFirstLaunchFamily) {
  return STOCK_FIRST_LAUNCH_ACTIVE && family in stockFirstLaunchLabels;
}

export function isStockFirstHeaderGroupEnabled(
  groupKey: "markets" | "stocks" | "funds" | "tools" | "learn",
) {
  if (!STOCK_FIRST_LAUNCH_ACTIVE) {
    return true;
  }

  return groupKey !== "funds";
}

export function getStockFirstLaunchPlaceholderContent(
  family: StockFirstLaunchFamily,
  variant: StockFirstLaunchVariant,
  assetName?: string,
): LaunchPlaceholderContent {
  const familyLabel = stockFirstLaunchLabels[family];
  const hubHref = stockFirstLaunchHubHrefs[family];
  const subject = assetName?.trim() || `${familyLabel.toLowerCase()} coverage`;

  if (variant === "detail") {
    return {
      eyebrow: `${familyLabel} launch scope`,
      title: `${subject} opens after the stock-first launch`,
      description:
        "Riddra is launching the stock layer first. This route stays reserved so the URL is stable, but the deeper research experience is intentionally being held back until the next rollout wave.",
      statusLabel: "Detail held for next wave",
      currentItems: [
        "The public stock layer, search, charts, and core market discovery are the only fully active product surfaces in the first launch.",
        `The ${familyLabel.toLowerCase()} family hub remains public so the section keeps a stable destination while the detail workflow is being prepared.`,
      ],
      nextItems: stockFirstLaunchNextWaveNotes[family],
      primaryHref: "/stocks",
      primaryHrefLabel: "Open stocks",
      secondaryHref: hubHref,
      secondaryHrefLabel: `Open ${familyLabel.toLowerCase()} hub`,
    };
  }

  if (variant === "compare") {
    return {
      eyebrow: `${familyLabel} launch scope`,
      title: `${familyLabel} compare opens after the stock-first launch`,
      description:
        "The compare URL stays live as part of the public surface, but the actual comparison workflow is being deferred until the non-stock research families are ready to launch together.",
      statusLabel: "Compare deferred",
      currentItems: [
        "Stocks remain the only fully active comparison and decision surface for the first launch.",
        "Non-stock compare routes are intentionally paused so public users do not land on a half-ready research workflow.",
      ],
      nextItems: stockFirstLaunchNextWaveNotes[family],
      primaryHref: "/stocks",
      primaryHrefLabel: "Open stocks",
      secondaryHref: hubHref,
      secondaryHrefLabel: `Open ${familyLabel.toLowerCase()} hub`,
    };
  }

  return {
    eyebrow: `${familyLabel} launch scope`,
    title: `${familyLabel} pages stay visible while stocks launch first`,
    description:
      "This hub remains public as a placeholder so the section has a stable home, but Riddra is deliberately launching the stock layer first and turning on non-stock product depth in the next rollout wave.",
    statusLabel: "Hub placeholder active",
    currentItems: [
      "The hub stays live so search listings, saved links, and public navigation do not break while the family is being prepared.",
      `Only the ${familyLabel.toLowerCase()} placeholder state is public right now; the deeper detail and compare flows are still being held back.`,
    ],
    nextItems: stockFirstLaunchNextWaveNotes[family],
    primaryHref: "/stocks",
    primaryHrefLabel: "Open stocks",
    secondaryHref: "/markets",
    secondaryHrefLabel: "Open markets",
  };
}
