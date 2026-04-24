import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export type MarketSourceStackItem = {
  key: string;
  title: string;
  url: string;
  role: string;
  status: "Configured" | "Missing";
};

export type MarketSourceCredentialItem = {
  key: string;
  title: string;
  detail: string;
  status: "Configured" | "Missing";
};

export type MarketSourceStackGroup = {
  title: string;
  description: string;
  items: MarketSourceStackItem[];
};

export type MarketSourceCredentialGroup = {
  title: string;
  description: string;
  items: MarketSourceCredentialItem[];
};

function buildItem(
  key: string,
  title: string,
  url: string,
  role: string,
): MarketSourceStackItem {
  return {
    key,
    title,
    url,
    role,
    status: url.trim() ? "Configured" : "Missing",
  };
}

function buildCredentialItem(
  key: string,
  title: string,
  value: string,
  detail: string,
): MarketSourceCredentialItem {
  return {
    key,
    title,
    detail,
    status: value.trim() ? "Configured" : "Missing",
  };
}

export function getMarketSourceStackGroups(): MarketSourceStackGroup[] {
  const config = getRuntimeLaunchConfig();

  return [
    {
      title: "Primary market endpoints",
      description:
        "These are the routes the backend can normalize into quote, index, derivatives, and fund-refresh work without relying on one opaque provider URL alone.",
      items: [
        buildItem(
          "quote",
          "Stock quotes",
          config.marketDataQuoteEndpoint,
          "Primary equity quote endpoint for delayed snapshot and payload verification.",
        ),
        buildItem(
          "ohlcv",
          "Stock OHLCV or history",
          config.marketDataOhlcvEndpoint,
          "Optional normalized history endpoint for chart and replay continuity.",
        ),
        buildItem(
          "indices",
          "All indices",
          config.marketDataIndexEndpoint,
          "Index breadth and tracked-index source for Nifty, Bank Nifty, Fin Nifty, and Sensex lanes.",
        ),
        buildItem(
          "option-chain",
          "Option chain",
          config.marketDataOptionChainEndpoint,
          "Derivatives source for the option-chain and trader-workstation lanes.",
        ),
        buildItem(
          "bhavcopy",
          "Bhavcopy or reports",
          config.marketDataBhavcopyUrl,
          "End-of-day reference source for audit, fallback, and daily market-history continuity.",
        ),
        buildItem(
          "fund-nav",
          "Mutual fund NAV",
          config.marketDataFundNavEndpoint,
          "Primary delayed NAV import source for fund routes and fund-refresh jobs.",
        ),
      ],
    },
    {
      title: "Reference and fallback sources",
      description:
        "These URLs keep the official-source map explicit, so NSE, BSE, AMFI, FX, metals, filings, and news can evolve as a layered source stack instead of one brittle dependency.",
      items: [
        buildItem(
          "nse-base",
          "NSE base",
          config.nseBaseUrl,
          "Root exchange API surface for equity quotes, indices, filings, and corporate actions.",
        ),
        buildItem(
          "bse-base",
          "BSE base",
          config.bseBaseUrl,
          "Root exchange API surface for BSE-backed stock and announcement fallbacks.",
        ),
        buildItem(
          "amfi-nav",
          "AMFI official NAV",
          config.amfiNavUrl,
          "Official India mutual-fund NAV text feed for trust-grade fallback and audit.",
        ),
        buildItem(
          "mfapi-base",
          "MFAPI base",
          config.mfApiBaseUrl,
          "Supporting NAV and scheme-detail source for mutual-fund enrichment.",
        ),
        buildItem(
          "mfapi-directory",
          "MFAPI collection",
          config.mfApiCollectionUrl,
          "Scheme-list endpoint for fund lookups and onboarding utilities.",
        ),
        buildItem(
          "bse-quote",
          "BSE stock quote",
          config.bseQuoteApiUrl,
          "BSE-specific stock graph or quote source for backup pricing and history checks.",
        ),
        buildItem(
          "gold",
          "Gold or metals",
          config.goldApiUrl,
          "Metals or XAU reference source for commodities surfaces and INR conversion logic.",
        ),
        buildItem(
          "fx-primary",
          "FX primary",
          config.fxApiUrl,
          "Primary FX route for USD/INR and other reference conversions.",
        ),
        buildItem(
          "fx-fallback",
          "FX fallback",
          config.secondaryFxApiUrl,
          "Fallback FX source so currency conversion does not depend on one provider alone.",
        ),
        buildItem(
          "news",
          "News",
          config.newsApiUrl,
          "External market-news feed for launch-time enrichment and alert context.",
        ),
        buildItem(
          "filings",
          "Corporate filings",
          config.filingsApiUrl,
          "Primary filings source for announcements, disclosures, and research archive continuity.",
        ),
        buildItem(
          "announcements",
          "Corporate announcements",
          config.corporateAnnouncementsApiUrl,
          "Secondary announcement source for exchange redundancy and announcement parity.",
        ),
        buildItem(
          "actions",
          "Corporate actions",
          config.corporateActionsApiUrl,
          "Official actions source for dividends, splits, bonuses, and downstream portfolio truth.",
        ),
      ],
    },
  ];
}

export function getMarketSourceCredentialGroups(): MarketSourceCredentialGroup[] {
  const config = getRuntimeLaunchConfig();

  return [
    {
      title: "Adapter and execution secrets",
      description:
        "These values decide whether the backend can call a normalized adapter, authorize refresh runs, and move beyond static source notes into recurring execution.",
      items: [
        buildCredentialItem(
          "provider-url",
          "Normalized provider URL",
          config.marketDataProviderUrl,
          "Optional backend aggregator or adapter endpoint that sits in front of NSE, BSE, AMFI, and other upstreams.",
        ),
        buildCredentialItem(
          "provider-token",
          "Provider token",
          config.marketDataProviderToken,
          "Bearer token or adapter key for the normalized provider layer.",
        ),
        buildCredentialItem(
          "refresh-secret",
          "Refresh secret",
          config.marketDataRefreshSecret,
          "Signed secret for protected refresh execution.",
        ),
        buildCredentialItem(
          "cron-secret",
          "Cron secret",
          config.cronSecret,
          "Secret for scheduled sync routes and recurring refresh jobs.",
        ),
      ],
    },
    {
      title: "Keyed upstream sources",
      description:
        "These are the sources that still need their own tokens even after URLs are configured, so the operator desk can track missing execution credentials explicitly.",
      items: [
        buildCredentialItem(
          "alpha-vantage",
          "Alpha Vantage API key",
          config.alphaVantageApiKey,
          "Needed when the metals or commodity exchange-rate lane should move from a saved URL into real responses.",
        ),
        buildCredentialItem(
          "finnhub",
          "Finnhub API key",
          config.finnhubApiKey,
          "Needed when the news lane should move from a saved URL into live market-news enrichment.",
        ),
      ],
    },
  ];
}

export function getMarketSourceStackSummary() {
  const groups = getMarketSourceStackGroups();
  const items = groups.flatMap((group) => group.items);
  const configured = items.filter((item) => item.status === "Configured").length;

  return {
    total: items.length,
    configured,
    missing: items.length - configured,
    primaryConfigured: groups[0]?.items.filter((item) => item.status === "Configured").length ?? 0,
    referenceConfigured: groups[1]?.items.filter((item) => item.status === "Configured").length ?? 0,
  };
}

export function getMarketSourceCredentialSummary() {
  const groups = getMarketSourceCredentialGroups();
  const items = groups.flatMap((group) => group.items);
  const configured = items.filter((item) => item.status === "Configured").length;

  return {
    total: items.length,
    configured,
    missing: items.length - configured,
    adapterConfigured: groups[0]?.items.filter((item) => item.status === "Configured").length ?? 0,
    keyedConfigured: groups[1]?.items.filter((item) => item.status === "Configured").length ?? 0,
  };
}
