import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

type FundChartProxy = {
  symbol: string;
  label: string;
  detail: string;
  href: string;
  hrefLabel: string;
};

const stockSymbolOverrides: Record<string, string> = {
  "M&M": "NSE:M_M",
};

const indexSymbolMap: Record<string, string> = {
  nifty50: "NSE:NIFTY",
  banknifty: "NSE:BANKNIFTY",
  finnifty: "NSE:FINNIFTY",
  sensex: "BSE:SENSEX",
};

export function getTradingviewStockSymbol(symbol: string) {
  return stockSymbolOverrides[symbol] ?? `NSE:${symbol}`;
}

export function getTradingviewIndexSymbol(slug: string) {
  const config = getRuntimeLaunchConfig();
  const overrideMap: Record<string, string> = {
    nifty50: config.nifty50ChartSymbol,
    banknifty: config.bankNiftyChartSymbol,
    finnifty: config.finNiftyChartSymbol,
    sensex: config.sensexChartSymbol,
  };

  return overrideMap[slug]?.trim() || indexSymbolMap[slug] || "NSE:NIFTY";
}

export function getTradingviewFundChartProxy(benchmark: string): FundChartProxy {
  const normalized = benchmark.toLowerCase();

  if (normalized.includes("nifty 50")) {
    return {
      symbol: getTradingviewIndexSymbol("nifty50"),
      label: "Benchmark chart",
      detail: "This route uses the Nifty 50 benchmark chart as the closest liquid market proxy for this fund.",
      href: "/nifty50",
      hrefLabel: "Open Nifty 50 chart route",
    };
  }

  if (normalized.includes("nifty 100")) {
    return {
      symbol: getTradingviewIndexSymbol("nifty50"),
      label: "Benchmark chart",
      detail: "This route uses the Nifty benchmark chart as a clean broad-market proxy while direct scheme chart support is still being normalized.",
      href: "/nifty50",
      hrefLabel: "Open Nifty 50 chart route",
    };
  }

  if (normalized.includes("midcap")) {
    return {
      symbol: getTradingviewIndexSymbol("nifty50"),
      label: "Market proxy chart",
      detail: "This route currently falls back to a broad-market TradingView proxy while benchmark-specific mid-cap chart mapping is still being hardened.",
      href: "/markets",
      hrefLabel: "Open markets chart view",
    };
  }

  return {
    symbol: getTradingviewIndexSymbol("nifty50"),
    label: "Market proxy chart",
    detail: "This route uses a broad-market TradingView proxy until direct benchmark or scheme chart mapping is verified for this fund.",
    href: "/markets",
    hrefLabel: "Open markets chart view",
  };
}
