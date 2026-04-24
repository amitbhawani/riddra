export type SourceReadinessItem = {
  name: string;
  category: string;
  priority: "Start now" | "Soon" | "Later";
  purpose: string;
  status: string;
  whyItMatters: string;
};

export const sourceReadinessItems: SourceReadinessItem[] = [
  {
    name: "NSE Data & Analytics",
    category: "Market data",
    priority: "Start now",
    purpose: "Official exchange data for equity, derivatives, snapshot, delayed, and historical feeds.",
    status: "Delayed snapshot path ready; commercial discussion still needed",
    whyItMatters: "This is the most important official path for serious Indian market data coverage, and it now has a Supabase-backed snapshot bridge waiting for legitimate data.",
  },
  {
    name: "AMFI NAV and AMC factsheet workflow",
    category: "Mutual fund data",
    priority: "Start now",
    purpose: "Daily NAV coverage, category continuity, and official fund-document workflow for mutual fund pages.",
    status: "NAV fallback and factsheet-evidence lanes are ready; official source automation still needed",
    whyItMatters: "Fund pages can now consume delayed NAV snapshots and source-entry factsheet evidence, so AMFI and AMC document mapping are the fastest path to turning the fund hub into a trustworthy data product.",
  },
  {
    name: "NSE Indices",
    category: "Index data",
    priority: "Start now",
    purpose: "Official index constituent, weights, and index data licensing for Nifty family products.",
    status: "Licensing discussion needed",
    whyItMatters: "Critical for Nifty50, BankNifty, and Fin Nifty tracker credibility and compliance.",
  },
  {
    name: "BSE market data / index access",
    category: "Market data",
    priority: "Soon",
    purpose: "Official Sensex-aligned data and broader BSE market coverage.",
    status: "Enterprise path to confirm",
    whyItMatters: "Needed for strong Sensex coverage and exchange cross-verification.",
  },
  {
    name: "TradingView free widget rollout",
    category: "Charts",
    priority: "Start now",
    purpose: "Immediate hosted chart layer for homepage, markets, stock pages, and major index routes with TradingView-managed data inside the widget.",
    status: "Ready to standardize now",
    whyItMatters: "This is the fastest route to reliable public chart context while our own provider-backed chart and quote stack keeps hardening in parallel.",
  },
  {
    name: "TradingView Advanced Charts access",
    category: "Charts",
    priority: "Start now",
    purpose: "Later self-hosted professional charting experience for premium workflows once we are ready to connect our own controlled datafeed.",
    status: "Research and access path still needed",
    whyItMatters: "This is a separate heavier path from the free hosted widgets and matters once we want deeper workstation-grade chart UX under our own datafeed control.",
  },
  {
    name: "TradingView indicator source",
    category: "Charts",
    priority: "Start now",
    purpose: "Preserve the exact logic of the proprietary indicator instead of approximating it.",
    status: "Need Pine Script from founder",
    whyItMatters: "This is the cleanest route to convert your charting edge into a subscriber feature.",
  },
  {
    name: "Zerodha Kite Connect",
    category: "Broker connectivity",
    priority: "Soon",
    purpose: "Official holdings, positions, and market stream integration for portfolio and trading workflows.",
    status: "API setup needed",
    whyItMatters: "Best first broker-connectivity candidate for portfolio and advanced user workflows.",
  },
  {
    name: "ICICIdirect API",
    category: "Broker connectivity",
    priority: "Soon",
    purpose: "Official portfolio and trading APIs for a full-service investor segment.",
    status: "Developer portal setup needed",
    whyItMatters: "Important for portfolio tracking beyond discount-broker-only users.",
  },
];

export const chartStrategySteps = [
  "Use Riddra pages and data models to define the product workflow first.",
  "Start with TradingView's hosted free widgets on the strongest public routes because they are the fastest copy-and-paste chart layer with data included.",
  "Use Lightweight Charts when we want fully Riddra-controlled public charts backed by our own delayed-data payloads and styling choices.",
  "Treat TradingView Advanced Charts as a separate later self-hosted library path, not the same thing as the free widget layer.",
  "Use your Pine Script as the source of truth for the proprietary indicator experience.",
  "Keep exchange and broker data on Riddra servers and pass it to charts through our own controlled datafeed layer.",
];
