import { getIndianMarketSession, type MarketSessionState } from "@/lib/market-session";

export type StockFreshnessReasonCategory =
  | "fresh"
  | "stale_missing_price"
  | "stale_missing_snapshot"
  | "provider_no_data"
  | "provider_lag"
  | "market_not_closed"
  | "holiday_or_weekend"
  | "symbol_issue";

const ACCEPTED_PROVIDER_NO_DATA_YAHOO_SYMBOLS = new Set([
  "KIRANVYPAR.NS",
  "NEAGI.NS",
]);

export function isAcceptedProviderNoDataSymbol(yahooSymbol?: string | null) {
  const normalizedYahooSymbol = yahooSymbol?.trim().toUpperCase() || "";
  return ACCEPTED_PROVIDER_NO_DATA_YAHOO_SYMBOLS.has(normalizedYahooSymbol);
}

export type TradingDatePolicyContext = {
  evaluationDate: string;
  expectedTradingDate: string;
  marketSessionState: MarketSessionState;
  policyReason: Extract<StockFreshnessReasonCategory, "market_not_closed" | "holiday_or_weekend"> | null;
};

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shiftIsoDate(value: string, days: number) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatIsoDate(parsed);
}

export function getCurrentIsoDateInTimeZone(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getPreviousIndianTradingDate(value: string) {
  let cursor = shiftIsoDate(value, -1);

  while (true) {
    const parsed = parseIsoDate(cursor);
    if (!parsed) {
      return cursor;
    }
    const weekday = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(parsed);
    if (weekday !== "Sat" && weekday !== "Sun") {
      return cursor;
    }
    cursor = shiftIsoDate(cursor, -1);
  }
}

export function resolveIndianTradingDatePolicy(input?: {
  now?: Date;
  globalLatestTradingDate?: string | null;
}) : TradingDatePolicyContext {
  const now = input?.now ?? new Date();
  const evaluationDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const session = getIndianMarketSession(now);
  const globalLatestTradingDate = input?.globalLatestTradingDate?.trim() || null;
  const previousTradingDate = getPreviousIndianTradingDate(evaluationDate);

  if (session.state === "weekend") {
    return {
      evaluationDate,
      expectedTradingDate: globalLatestTradingDate || previousTradingDate,
      marketSessionState: session.state,
      policyReason: "holiday_or_weekend",
    };
  }

  if (session.state === "pre_open" || session.state === "open") {
    return {
      evaluationDate,
      expectedTradingDate:
        globalLatestTradingDate && globalLatestTradingDate < evaluationDate
          ? globalLatestTradingDate
          : previousTradingDate,
      marketSessionState: session.state,
      policyReason: "market_not_closed",
    };
  }

  if (globalLatestTradingDate && globalLatestTradingDate < evaluationDate) {
    return {
      evaluationDate,
      expectedTradingDate: globalLatestTradingDate,
      marketSessionState: session.state,
      policyReason: "holiday_or_weekend",
    };
  }

  return {
    evaluationDate,
    expectedTradingDate: evaluationDate,
    marketSessionState: session.state,
    policyReason: null,
  };
}

export function classifyStockFreshness(input: {
  yahooSymbol?: string | null;
  expectedTradingDate: string;
  policyReason: TradingDatePolicyContext["policyReason"];
  hasExpectedPrice: boolean;
  hasExpectedSnapshot: boolean;
  lastPriceDate?: string | null;
  lastSnapshotDate?: string | null;
}) {
  const yahooSymbol = input.yahooSymbol?.trim() || null;
  const lastPriceDate = input.lastPriceDate?.trim() || null;
  const lastSnapshotDate = input.lastSnapshotDate?.trim() || null;

  if (input.policyReason && input.hasExpectedPrice && input.hasExpectedSnapshot) {
    return {
      isStale: false,
      reasonCategory: input.policyReason,
    };
  }

  if (input.hasExpectedPrice && input.hasExpectedSnapshot) {
    return {
      isStale: false,
      reasonCategory: "fresh" as const,
    };
  }

  const previousTradingDate = getPreviousIndianTradingDate(input.expectedTradingDate);
  const hasProviderLagPrice =
    !input.hasExpectedPrice &&
    lastPriceDate === previousTradingDate;
  const hasProviderLagSnapshot =
    !input.hasExpectedSnapshot &&
    lastSnapshotDate === previousTradingDate;

  if (
    isAcceptedProviderNoDataSymbol(yahooSymbol) &&
    (!input.hasExpectedPrice || !input.hasExpectedSnapshot)
  ) {
    return {
      isStale: false,
      reasonCategory: "provider_no_data" as const,
    };
  }

  if (!input.policyReason && yahooSymbol && (hasProviderLagPrice || hasProviderLagSnapshot)) {
    return {
      isStale: false,
      reasonCategory: "provider_lag" as const,
    };
  }

  if (!yahooSymbol || (!lastPriceDate && !lastSnapshotDate)) {
    return {
      isStale: true,
      reasonCategory: "symbol_issue" as const,
    };
  }

  if (!input.hasExpectedPrice) {
    return {
      isStale: true,
      reasonCategory: "stale_missing_price" as const,
    };
  }

  return {
    isStale: true,
    reasonCategory: "stale_missing_snapshot" as const,
  };
}
