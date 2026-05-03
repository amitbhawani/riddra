import { createHash, randomUUID } from "crypto";

import {
  getYahooDryRunFixture,
  type YahooDryRunFixture,
} from "@/lib/yahoo-finance-dry-run-fixtures";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const YAHOO_QUOTE_SUMMARY_PROFILE_MODULES = [
  "price",
  "quoteType",
  "assetProfile",
  "summaryProfile",
] as const;

export const YAHOO_QUOTE_SUMMARY_VALUATION_MODULES = [
  "summaryDetail",
  "defaultKeyStatistics",
  "financialData",
  "price",
] as const;

export const YAHOO_QUOTE_SUMMARY_FINANCIAL_STATEMENT_MODULES = [
  "incomeStatementHistory",
  "incomeStatementHistoryQuarterly",
  "balanceSheetHistory",
  "balanceSheetHistoryQuarterly",
  "cashflowStatementHistory",
  "cashflowStatementHistoryQuarterly",
] as const;

export const YAHOO_QUOTE_SUMMARY_HOLDER_MODULES = [
  "majorHoldersBreakdown",
  "institutionOwnership",
  "fundOwnership",
  "insiderHolders",
  "netSharePurchaseActivity",
] as const;

export const YAHOO_QUOTE_SUMMARY_EARNINGS_MODULES = [
  "calendarEvents",
  "earnings",
  "earningsTrend",
  "recommendationTrend",
  "upgradeDowngradeHistory",
] as const;

export type YahooQuoteSummaryModule =
  | (typeof YAHOO_QUOTE_SUMMARY_PROFILE_MODULES)[number]
  | (typeof YAHOO_QUOTE_SUMMARY_VALUATION_MODULES)[number]
  | (typeof YAHOO_QUOTE_SUMMARY_FINANCIAL_STATEMENT_MODULES)[number]
  | (typeof YAHOO_QUOTE_SUMMARY_HOLDER_MODULES)[number]
  | (typeof YAHOO_QUOTE_SUMMARY_EARNINGS_MODULES)[number];

export type YahooRequestType =
  | "quote_latest"
  | "quote_summary"
  | "historical_prices"
  | "financial_statements"
  | "holders"
  | "dividends_splits"
  | "options"
  | "news";

export type YahooRawImportStatus = "completed" | "failed";

export type YahooResolvedStockTarget = {
  stockId: string | null;
  instrumentId: string | null;
  slug: string | null;
  symbol: string;
  yahooSymbol: string;
  companyName: string | null;
  exchange: string | null;
};

export type YahooRawImportRecord = {
  id: string;
  stockId: string | null;
  symbol: string;
  yahooSymbol: string;
  sourceBucket: string;
  moduleName: string | null;
  requestUrl: string;
  requestType: string;
  importedAt: string;
  status: YahooRawImportStatus;
  errorMessage: string | null;
  responseStatus: number | null;
  responseHash: string | null;
  deduplicated: boolean;
  linkedRawImportId: string | null;
};

export type YahooOperationalConfig = {
  requestsPerSecond: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxConcurrentWorkers: number;
  failureCooldownMinutes: number;
  maxRetries: number;
};

export type YahooOperationalGuardrailSnapshot = YahooOperationalConfig & {
  requestsUsedCurrentHour: number;
  requestsUsedToday: number;
  requestsRemainingCurrentHour: number;
  requestsRemainingToday: number;
  currentRequestPaceLabel: string;
  snapshotCapturedAt: string;
};

export type YahooHistoricalPriceRow = {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number | null;
  volume: number | null;
  timestamp: number;
};

type YahooRequestContext = {
  stock: YahooResolvedStockTarget;
  jobId?: string | null;
  bucketKey: string;
  moduleName: string;
  requestType: YahooRequestType;
  requestUrl: string;
  requestPayload?: Record<string, unknown>;
  requestContext?: Record<string, unknown>;
};

type YahooRequestAttemptMetadata = {
  normalizedPayload?: Record<string, unknown>;
  tradeDate?: string | null;
  fiscalDate?: string | null;
  sourceRecordedAt?: string | null;
  payloadSymbol?: string | null;
};

type YahooRequestUsageState = {
  hourKey: string;
  dayKey: string;
  requestsUsedCurrentHour: number;
  requestsUsedToday: number;
  refreshedAtMs: number;
};

type YahooJsonRequestInput<TParsed> = YahooRequestContext & {
  dryRunFixture?: YahooDryRunFixture | null;
  extractApiError?: (payload: TParsed) => string | null;
  requestHeaders?: Record<string, string>;
  summarizeParsedPayload?: (payload: TParsed) => YahooRequestAttemptMetadata;
  validateParsedPayload?: (payload: TParsed) => string | null;
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeYahooResponseSymbol(value: unknown) {
  return cleanString(value, 160).toUpperCase();
}

function extractTopLevelYahooFinanceError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const finance = "finance" in payload ? payload.finance : null;
  if (!finance || typeof finance !== "object") {
    return null;
  }

  const error = "error" in finance ? finance.error : null;
  if (!error || typeof error !== "object") {
    return null;
  }

  const description =
    "description" in error ? cleanString(error.description, 400) : "";
  const code = "code" in error ? cleanString(error.code, 160) : "";

  return description || code || null;
}

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? cleanString(error.message, 2000) : cleanString(error, 2000);
}

function buildYahooBrowserHeaders(input?: {
  accept?: string;
  cookieHeader?: string | null;
  refererUrl?: string | null;
  origin?: string | null;
}) {
  const headers: Record<string, string> = {
    Accept: cleanString(input?.accept, 240) || "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  };

  if (cleanString(input?.cookieHeader, 4000)) {
    headers.Cookie = cleanString(input?.cookieHeader, 4000);
  }
  if (cleanString(input?.refererUrl, 1200)) {
    headers.Referer = cleanString(input?.refererUrl, 1200);
  }
  if (cleanString(input?.origin, 240)) {
    headers.Origin = cleanString(input?.origin, 240);
  }

  return headers;
}

function extractCookieHeaderFromSetCookies(setCookies: string[]) {
  return setCookies
    .map((value) => cleanString(value, 4000).split(";")[0] || "")
    .filter(Boolean)
    .join("; ");
}

function normalizeJsonbValue(value: unknown): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  if (value === null || value === undefined) {
    return {};
  }

  return { value };
}

function toIsoDateInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function extractYahooChartPayloadSymbol(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const chart = "chart" in payload ? payload.chart : null;
  if (!chart || typeof chart !== "object") {
    return null;
  }

  const result = Array.isArray((chart as Record<string, unknown>).result)
    ? ((chart as Record<string, unknown>).result as unknown[])[0]
    : null;
  if (!result || typeof result !== "object") {
    return null;
  }

  const meta = "meta" in result ? (result as Record<string, unknown>).meta : null;
  if (!meta || typeof meta !== "object") {
    return null;
  }

  return normalizeYahooResponseSymbol((meta as Record<string, unknown>).symbol) || null;
}

function doesYahooRequestUrlTargetSymbol(requestUrl: string, yahooSymbol: string) {
  const normalizedSymbol = normalizeYahooResponseSymbol(yahooSymbol);
  const normalizedUrl = cleanString(requestUrl, 2000);
  if (!normalizedSymbol || !normalizedUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    const symbolFromPath = decodeURIComponent(
      parsedUrl.pathname.split("/").filter(Boolean).at(-1) ?? "",
    ).toUpperCase();
    if (symbolFromPath === normalizedSymbol) {
      return true;
    }

    for (const [, value] of parsedUrl.searchParams.entries()) {
      if (cleanString(value, 200).toUpperCase() === normalizedSymbol) {
        return true;
      }
    }
  } catch {
    return normalizedUrl.toUpperCase().includes(normalizedSymbol);
  }

  return normalizedUrl.toUpperCase().includes(normalizedSymbol);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function safeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeInteger(value: unknown) {
  const parsed = safeNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function readPositiveEnvNumber(name: string, fallback: number) {
  const parsed = Number(process.env[name] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getYahooRequestsPerSecond() {
  return readPositiveEnvNumber("YAHOO_FINANCE_REQUESTS_PER_SECOND", 1);
}

function getYahooMaxRequestsPerHour() {
  return Math.max(
    getYahooRequestsPerSecond(),
    Math.floor(readPositiveEnvNumber("YAHOO_FINANCE_MAX_REQUESTS_PER_HOUR", 2_000)),
  );
}

function getYahooMaxRequestsPerDay() {
  return Math.max(
    getYahooMaxRequestsPerHour(),
    Math.floor(readPositiveEnvNumber("YAHOO_FINANCE_MAX_REQUESTS_PER_DAY", 15_000)),
  );
}

export function getYahooMaxConcurrentWorkers() {
  return Math.max(1, Math.floor(readPositiveEnvNumber("YAHOO_FINANCE_MAX_CONCURRENT_WORKERS", 1)));
}

export function getYahooFailureCooldownMinutes() {
  return Math.max(1, Math.floor(readPositiveEnvNumber("YAHOO_FINANCE_FAILURE_COOLDOWN_MINUTES", 45)));
}

function getYahooTimeoutMs() {
  return readPositiveEnvNumber("YAHOO_FINANCE_TIMEOUT_MS", 12_000);
}

function getYahooMaxRetries() {
  return Math.max(0, Math.floor(readPositiveEnvNumber("YAHOO_FINANCE_MAX_RETRIES", 3)));
}

function getYahooRetryBaseMs() {
  return readPositiveEnvNumber("YAHOO_FINANCE_RETRY_BASE_MS", 1_000);
}

let yahooThrottleChain = Promise.resolve();
let yahooNextRequestAt = 0;
let yahooRequestUsageState: YahooRequestUsageState | null = null;

class YahooOperationalGuardrailError extends Error {
  code: string;
  retryAfterMs: number | null;

  constructor(message: string, input: { code: string; retryAfterMs?: number | null }) {
    super(message);
    this.name = "YahooOperationalGuardrailError";
    this.code = input.code;
    this.retryAfterMs = input.retryAfterMs ?? null;
  }
}

export function isYahooGuardrailError(error: unknown): error is YahooOperationalGuardrailError {
  return error instanceof YahooOperationalGuardrailError;
}

export function getYahooOperationalConfig(): YahooOperationalConfig {
  return {
    requestsPerSecond: getYahooRequestsPerSecond(),
    maxRequestsPerHour: getYahooMaxRequestsPerHour(),
    maxRequestsPerDay: getYahooMaxRequestsPerDay(),
    maxConcurrentWorkers: getYahooMaxConcurrentWorkers(),
    failureCooldownMinutes: getYahooFailureCooldownMinutes(),
    maxRetries: getYahooMaxRetries(),
  };
}

function getHourKey(date: Date) {
  return date.toISOString().slice(0, 13);
}

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getHourStartIso(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), 0, 0, 0),
  ).toISOString();
}

function getDayStartIso(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  ).toISOString();
}

function getNextHourStartMs(nowMs: number) {
  const date = new Date(nowMs);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours() + 1,
    0,
    0,
    0,
  );
}

function getNextDayStartMs(nowMs: number) {
  const date = new Date(nowMs);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
}

async function queryYahooRequestCountSince(startIso: string) {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("raw_yahoo_imports")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "yahoo_finance")
    .gte("imported_at", startIso);

  if (error) {
    throw new Error(`Could not read raw_yahoo_imports for Yahoo guardrails. ${error.message}`);
  }

  return typeof count === "number" ? count : 0;
}

async function refreshYahooRequestUsageState(force = false) {
  ensureYahooServiceReady();
  const now = new Date();
  const nowMs = now.getTime();
  const hourKey = getHourKey(now);
  const dayKey = getDayKey(now);

  if (
    !force &&
    yahooRequestUsageState &&
    yahooRequestUsageState.hourKey === hourKey &&
    yahooRequestUsageState.dayKey === dayKey &&
    nowMs - yahooRequestUsageState.refreshedAtMs < 60_000
  ) {
    return yahooRequestUsageState;
  }

  const [requestsUsedCurrentHour, requestsUsedToday] = await Promise.all([
    queryYahooRequestCountSince(getHourStartIso(now)),
    queryYahooRequestCountSince(getDayStartIso(now)),
  ]);

  yahooRequestUsageState = {
    hourKey,
    dayKey,
    requestsUsedCurrentHour,
    requestsUsedToday,
    refreshedAtMs: nowMs,
  };

  return yahooRequestUsageState;
}

function incrementYahooRequestUsageState() {
  const now = new Date();
  const hourKey = getHourKey(now);
  const dayKey = getDayKey(now);

  if (!yahooRequestUsageState || yahooRequestUsageState.hourKey !== hourKey || yahooRequestUsageState.dayKey !== dayKey) {
    yahooRequestUsageState = {
      hourKey,
      dayKey,
      requestsUsedCurrentHour: 0,
      requestsUsedToday: 0,
      refreshedAtMs: now.getTime(),
    };
  }

  yahooRequestUsageState.requestsUsedCurrentHour += 1;
  yahooRequestUsageState.requestsUsedToday += 1;
  yahooRequestUsageState.refreshedAtMs = now.getTime();
}

function ensureYahooRequestBudget(state: YahooRequestUsageState, nowMs: number) {
  const config = getYahooOperationalConfig();
  if (state.requestsUsedCurrentHour >= config.maxRequestsPerHour) {
    throw new YahooOperationalGuardrailError(
      `Yahoo Finance hourly request cap reached (${config.maxRequestsPerHour} requests). Wait for the next hour before continuing.`,
      {
        code: "YAHOO_HOURLY_LIMIT_REACHED",
        retryAfterMs: Math.max(1, getNextHourStartMs(nowMs) - nowMs),
      },
    );
  }
  if (state.requestsUsedToday >= config.maxRequestsPerDay) {
    throw new YahooOperationalGuardrailError(
      `Yahoo Finance daily request cap reached (${config.maxRequestsPerDay} requests). Wait until the next UTC day before continuing.`,
      {
        code: "YAHOO_DAILY_LIMIT_REACHED",
        retryAfterMs: Math.max(1, getNextDayStartMs(nowMs) - nowMs),
      },
    );
  }
}

export async function getYahooOperationalGuardrailSnapshot(): Promise<YahooOperationalGuardrailSnapshot> {
  const config = getYahooOperationalConfig();
  const state = await refreshYahooRequestUsageState(true);
  return {
    ...config,
    requestsUsedCurrentHour: state.requestsUsedCurrentHour,
    requestsUsedToday: state.requestsUsedToday,
    requestsRemainingCurrentHour: Math.max(0, config.maxRequestsPerHour - state.requestsUsedCurrentHour),
    requestsRemainingToday: Math.max(0, config.maxRequestsPerDay - state.requestsUsedToday),
    currentRequestPaceLabel: `${config.requestsPerSecond} req/sec cap`,
    snapshotCapturedAt: new Date().toISOString(),
  };
}

async function waitForYahooThrottleWindow() {
  const requestsPerSecond = getYahooRequestsPerSecond();
  const intervalMs = Math.max(1, Math.round(1000 / requestsPerSecond));

  let releaseThrottle = () => {};
  const previous = yahooThrottleChain;
  yahooThrottleChain = new Promise<void>((resolve) => {
    releaseThrottle = resolve;
  });

  await previous;

  try {
    const now = Date.now();
    const requestUsageState = await refreshYahooRequestUsageState();
    ensureYahooRequestBudget(requestUsageState, now);
    const waitMs = Math.max(0, yahooNextRequestAt - now);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    incrementYahooRequestUsageState();
    yahooNextRequestAt = Date.now() + intervalMs;
  } finally {
    releaseThrottle();
  }
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isYahooProtectedEndpointMessage(message: string) {
  const normalized = cleanString(message, 2000).toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    "invalid crumb",
    "unauthorized",
    "user is unable to access this feature",
    "too many requests",
  ].some((token) => normalized.includes(token));
}

export function isYahooProtectedEndpointUnavailableError(error: unknown) {
  return isYahooProtectedEndpointMessage(extractErrorMessage(error));
}

function getRetryBackoffMs(attemptNumber: number) {
  const baseMs = getYahooRetryBaseMs();
  const boundedAttempt = Math.max(1, attemptNumber);
  return Math.min(baseMs * 2 ** (boundedAttempt - 1), 30_000);
}

export function isLikelyYahooProviderFailureMessage(message: string) {
  const normalized = cleanString(message, 600).toLowerCase();
  if (!normalized) {
    return false;
  }
  return [
    "yahoo",
    "rate limit",
    "429",
    "timeout",
    "timed out",
    "network",
    "query1.finance.yahoo.com",
    "finance.yahoo.com",
    "blocked",
    "temporarily unavailable",
  ].some((token) => normalized.includes(token));
}

function stringifyRequestContext(value: Record<string, unknown> | undefined) {
  if (!value || !Object.keys(value).length) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function buildPayloadHash(value: unknown) {
  try {
    return createHash("sha256")
      .update(JSON.stringify(value ?? {}))
      .digest("hex");
  } catch {
    return null;
  }
}

function buildResponseHash(input: {
  responseStatus?: number | null;
  errorMessage?: string | null;
  rawPayload?: unknown;
}) {
  return buildPayloadHash({
    responseStatus:
      typeof input.responseStatus === "number" && Number.isFinite(input.responseStatus)
        ? input.responseStatus
        : null,
    errorMessage: cleanString(input.errorMessage, 4000) || null,
    rawPayload: normalizeJsonbValue(input.rawPayload),
  });
}

function getUtcDayStartIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    ).toISOString();
  }
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0),
  ).toISOString();
}

function responseHeadersToObject(headers: Headers) {
  const normalized: Record<string, string> = {};
  headers.forEach((value, key) => {
    normalized[key] = value;
  });
  return normalized;
}

export function normalizeYahooSymbolForStockLookup(symbol: string) {
  return cleanString(symbol, 80).toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "");
}

function normalizeYahooSymbol(symbol: string) {
  return cleanString(symbol, 80).toUpperCase();
}

function buildSlugFromSymbol(symbol: string) {
  return cleanString(symbol, 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureYahooServiceReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error(
      "Yahoo Finance service requires durable Supabase admin credentials in this environment.",
    );
  }
}

function buildYahooChartUrl(symbol: string, input?: {
  interval?: string;
  range?: string;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  includePrePost?: boolean;
  events?: string;
}) {
  const normalizedSymbol = normalizeYahooSymbol(symbol);
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}`,
  );
  url.searchParams.set("interval", cleanString(input?.interval, 20) || "1d");
  const periodStartDate = cleanString(input?.periodStartDate, 40);
  const periodEndDate = cleanString(input?.periodEndDate, 40);
  if (periodStartDate) {
    const startDate = new Date(`${periodStartDate}T00:00:00Z`);
    const endDate = periodEndDate
      ? new Date(`${periodEndDate}T23:59:59Z`)
      : new Date();
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      url.searchParams.set("period1", String(Math.max(0, Math.floor(startDate.getTime() / 1000))));
      url.searchParams.set("period2", String(Math.max(0, Math.floor(endDate.getTime() / 1000))));
    } else {
      url.searchParams.set("range", cleanString(input?.range, 40) || "1mo");
    }
  } else {
    url.searchParams.set("range", cleanString(input?.range, 40) || "1mo");
  }
  url.searchParams.set(
    "includePrePost",
    input?.includePrePost ? "true" : "false",
  );
  url.searchParams.set("events", cleanString(input?.events, 80) || "div,splits");
  return {
    normalizedSymbol,
    requestUrl: url.toString(),
  };
}

function buildYahooQuoteLatestUrl(symbol: string) {
  const normalizedSymbol = normalizeYahooSymbol(symbol);
  const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
  url.searchParams.set("symbols", normalizedSymbol);
  url.searchParams.set("formatted", "false");
  return {
    normalizedSymbol,
    requestUrl: url.toString(),
  };
}

function buildYahooQuoteSummaryUrl(symbol: string, modules: YahooQuoteSummaryModule[]) {
  const normalizedSymbol = normalizeYahooSymbol(symbol);
  const url = new URL(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(normalizedSymbol)}`,
  );
  url.searchParams.set("modules", modules.join(","));
  url.searchParams.set("formatted", "false");
  url.searchParams.set("corsDomain", "finance.yahoo.com");
  return {
    normalizedSymbol,
    requestUrl: url.toString(),
  };
}

function buildYahooOptionsUrl(symbol: string, expirationDate?: string | null) {
  const normalizedSymbol = normalizeYahooSymbol(symbol);
  const url = new URL(
    `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(normalizedSymbol)}`,
  );
  if (cleanString(expirationDate, 40)) {
    url.searchParams.set("date", cleanString(expirationDate, 40));
  }
  return {
    normalizedSymbol,
    requestUrl: url.toString(),
  };
}

function buildYahooNewsUrl(symbol: string, newsCount = 10) {
  const normalizedSymbol = normalizeYahooSymbol(symbol);
  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", normalizedSymbol);
  url.searchParams.set("quotesCount", "1");
  url.searchParams.set("newsCount", String(Math.max(1, newsCount)));
  url.searchParams.set("enableFuzzyQuery", "false");
  return {
    normalizedSymbol,
    requestUrl: url.toString(),
  };
}

async function resolveStockFromMaster(
  normalizedYahooSymbol: string,
  lookupSymbol: string,
) {
  const supabase = createSupabaseAdminClient();

  const byYahoo = await supabase
    .from("stocks_master")
    .select("*")
    .eq("yahoo_symbol", normalizedYahooSymbol)
    .limit(1)
    .maybeSingle();

  if (byYahoo.error) {
    throw new Error(`Could not read stocks_master by Yahoo symbol. ${byYahoo.error.message}`);
  }
  if (byYahoo.data) {
    return byYahoo.data as Record<string, unknown>;
  }

  const bySymbol = await supabase
    .from("stocks_master")
    .select("*")
    .eq("symbol", lookupSymbol)
    .limit(1)
    .maybeSingle();

  if (bySymbol.error) {
    throw new Error(`Could not read stocks_master by symbol. ${bySymbol.error.message}`);
  }
  if (bySymbol.data) {
    return bySymbol.data as Record<string, unknown>;
  }

  return null;
}

async function createStockMasterFromInstrument(
  normalizedYahooSymbol: string,
  lookupSymbol: string,
) {
  const supabase = createSupabaseAdminClient();
  const instrumentResult = await supabase
    .from("instruments")
    .select("*")
    .eq("symbol", lookupSymbol)
    .limit(1)
    .maybeSingle();

  if (instrumentResult.error) {
    throw new Error(`Could not read instruments for Yahoo stock resolution. ${instrumentResult.error.message}`);
  }

  if (!instrumentResult.data) {
    return null;
  }

  const instrument = instrumentResult.data as Record<string, unknown>;
  const companyResult = await supabase
    .from("companies")
    .select("*")
    .eq("instrument_id", cleanString(instrument.id, 160))
    .limit(1)
    .maybeSingle();

  if (companyResult.error) {
    throw new Error(`Could not read companies for Yahoo stock resolution. ${companyResult.error.message}`);
  }

  const company = (companyResult.data ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const slug = cleanString(instrument.slug, 160) || buildSlugFromSymbol(lookupSymbol);
  const row = {
    instrument_id: cleanString(instrument.id, 160) || null,
    slug,
    symbol: lookupSymbol,
    company_name:
      cleanString(company.legal_name, 240) || cleanString(instrument.name, 240) || lookupSymbol,
    yahoo_symbol: normalizedYahooSymbol,
    exchange: cleanString(instrument.exchange, 120) || null,
    quote_currency: "INR",
    market: cleanString(instrument.exchange, 120) || null,
    status: cleanString(instrument.status, 80) || "active",
    primary_source_code: cleanString(instrument.primary_source_code, 120) || "yahoo_finance",
    source_name: "instrument_backfill",
    source_url: null,
    metadata: {
      company: normalizeJsonbValue(company),
      instrument_name: cleanString(instrument.name, 240) || null,
    },
    imported_at: now,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("stocks_master")
    .upsert(row, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not upsert stocks_master for Yahoo stock resolution. ${error.message}`);
  }

  return (data ?? null) as Record<string, unknown> | null;
}

export async function resolveYahooStockTarget(yahooSymbol: string): Promise<YahooResolvedStockTarget> {
  ensureYahooServiceReady();
  const normalizedYahooSymbol = normalizeYahooSymbol(yahooSymbol);
  if (!normalizedYahooSymbol) {
    throw new Error("Yahoo Finance requests need a symbol such as RELIANCE.NS.");
  }

  const lookupSymbol = normalizeYahooSymbolForStockLookup(normalizedYahooSymbol);
  const masterRow =
    (await resolveStockFromMaster(normalizedYahooSymbol, lookupSymbol)) ??
    (await createStockMasterFromInstrument(normalizedYahooSymbol, lookupSymbol));

  if (!masterRow) {
    return {
      stockId: null,
      instrumentId: null,
      slug: null,
      symbol: lookupSymbol,
      yahooSymbol: normalizedYahooSymbol,
      companyName: null,
      exchange: null,
    };
  }

  return {
    stockId: cleanString(masterRow.id, 160) || null,
    instrumentId: cleanString(masterRow.instrument_id, 160) || null,
    slug: cleanString(masterRow.slug, 160) || null,
    symbol: cleanString(masterRow.symbol, 160) || lookupSymbol,
    yahooSymbol: cleanString(masterRow.yahoo_symbol, 160) || normalizedYahooSymbol,
    companyName: cleanString(masterRow.company_name, 240) || null,
    exchange: cleanString(masterRow.exchange, 120) || null,
  };
}

async function persistRawYahooImport(input: {
  stock: YahooResolvedStockTarget;
  sourceBucket: string;
  moduleName: string;
  requestUrl: string;
  requestType: string;
  requestPayload?: Record<string, unknown>;
  requestContext?: Record<string, unknown>;
  responseStatus?: number | null;
  responseHeaders?: Record<string, unknown>;
  rawPayload?: unknown;
  normalizedPayload?: Record<string, unknown>;
  tradeDate?: string | null;
  fiscalDate?: string | null;
  sourceRecordedAt?: string | null;
  status: YahooRawImportStatus;
  errorMessage?: string | null;
}) {
  ensureYahooServiceReady();
  const isDryRun = input.requestContext?.dryRun === true;
  const importedAt = new Date().toISOString();
  const rawPayload = normalizeJsonbValue(input.rawPayload);
  const responseHash = buildResponseHash({
    responseStatus: input.responseStatus ?? null,
    errorMessage: input.errorMessage ?? null,
    rawPayload,
  });

  if (isDryRun) {
    return {
      id: `dry-run:${randomUUID()}`,
      stockId: input.stock.stockId,
      symbol: input.stock.symbol,
      yahooSymbol: input.stock.yahooSymbol,
      sourceBucket: input.sourceBucket,
      moduleName: input.moduleName,
      requestUrl: input.requestUrl,
      requestType: input.requestType,
      importedAt,
      status: input.status,
      errorMessage: cleanString(input.errorMessage, 4000) || null,
      responseStatus: input.responseStatus ?? null,
      responseHash,
      deduplicated: false,
      linkedRawImportId: null,
    } satisfies YahooRawImportRecord;
  }

  const supabase = createSupabaseAdminClient();
  const normalizedPayload = normalizeJsonbValue(input.normalizedPayload ?? {});
  const requestPayload = normalizeJsonbValue(input.requestPayload ?? {});
  const responseHeaders = normalizeJsonbValue(input.responseHeaders ?? {});
  const payloadHash = buildPayloadHash(rawPayload);

  if (input.status === "failed" && responseHash) {
    let duplicateLookup = supabase
      .from("raw_yahoo_imports")
      .select("*")
      .eq("source_type", "yahoo_finance")
      .eq("status", "failed")
      .eq("source_bucket", input.sourceBucket)
      .eq("module_name", input.moduleName)
      .eq("request_type", input.requestType)
      .eq("response_hash", responseHash)
      .gte("imported_at", getUtcDayStartIso(importedAt))
      .order("imported_at", { ascending: false })
      .limit(1);

    if (input.stock.stockId) {
      duplicateLookup = duplicateLookup.eq("stock_id", input.stock.stockId);
    } else {
      duplicateLookup = duplicateLookup.eq("yahoo_symbol", input.stock.yahooSymbol);
    }

    const { data: existingFailedRow, error: existingFailedRowError } =
      await duplicateLookup.maybeSingle();

    if (existingFailedRowError) {
      throw new Error(
        `Could not inspect prior failed raw Yahoo imports. ${existingFailedRowError.message}`,
      );
    }

    if (existingFailedRow) {
      return {
        id: cleanString(existingFailedRow.id, 160),
        stockId: cleanString(existingFailedRow.stock_id, 160) || input.stock.stockId,
        symbol: cleanString(existingFailedRow.symbol, 160) || input.stock.symbol,
        yahooSymbol:
          cleanString(existingFailedRow.yahoo_symbol, 160) || input.stock.yahooSymbol,
        sourceBucket:
          cleanString(existingFailedRow.source_bucket, 160) || input.sourceBucket,
        moduleName: cleanString(existingFailedRow.module_name, 400) || input.moduleName,
        requestUrl:
          cleanString(existingFailedRow.request_url || existingFailedRow.source_url, 2000) ||
          input.requestUrl,
        requestType: cleanString(existingFailedRow.request_type, 160) || input.requestType,
        importedAt: cleanString(existingFailedRow.imported_at, 120) || importedAt,
        status: "failed",
        errorMessage:
          cleanString(existingFailedRow.error_message, 4000) ||
          cleanString(input.errorMessage, 4000) ||
          null,
        responseStatus:
          typeof existingFailedRow.response_status === "number"
            ? existingFailedRow.response_status
            : input.responseStatus ?? null,
        responseHash:
          cleanString(existingFailedRow.response_hash, 160) || responseHash,
        deduplicated: true,
        linkedRawImportId: cleanString(existingFailedRow.id, 160) || null,
      } satisfies YahooRawImportRecord;
    }
  }

  const { data, error } = await supabase
    .from("raw_yahoo_imports")
    .insert({
      id: randomUUID(),
      stock_id: input.stock.stockId,
      symbol: input.stock.symbol,
      yahoo_symbol: input.stock.yahooSymbol,
      source_type: "yahoo_finance",
      source_bucket: input.sourceBucket,
      module_name: input.moduleName,
      source_url: input.requestUrl,
      request_url: input.requestUrl,
      request_type: input.requestType,
      request_method: "GET",
      request_context: stringifyRequestContext(input.requestContext),
      request_payload: requestPayload,
      response_status: input.responseStatus ?? null,
      response_headers: responseHeaders,
      raw_payload: rawPayload,
      normalized_payload: normalizedPayload,
      payload_hash: payloadHash,
      response_hash: responseHash,
      status: input.status,
      error_message: cleanString(input.errorMessage, 4000) || null,
      trade_date: cleanString(input.tradeDate, 40) || null,
      fiscal_date: cleanString(input.fiscalDate, 40) || null,
      source_recorded_at: cleanString(input.sourceRecordedAt, 120) || importedAt,
      imported_at: importedAt,
      created_at: importedAt,
      updated_at: importedAt,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not save raw Yahoo import response. ${error.message}`);
  }

  return {
    id: cleanString(data?.id, 160),
    stockId: cleanString(data?.stock_id, 160) || null,
    symbol: cleanString(data?.symbol, 160) || input.stock.symbol,
    yahooSymbol: cleanString(data?.yahoo_symbol, 160) || input.stock.yahooSymbol,
    sourceBucket: cleanString(data?.source_bucket, 160) || input.sourceBucket,
    moduleName: cleanString(data?.module_name, 400) || input.moduleName,
    requestUrl: cleanString(data?.request_url || data?.source_url, 2000) || input.requestUrl,
    requestType: cleanString(data?.request_type, 160) || input.requestType,
    importedAt: cleanString(data?.imported_at, 120) || importedAt,
    status:
      cleanString(data?.status, 120) === "failed" ? "failed" : "completed",
    errorMessage: cleanString(data?.error_message, 4000) || null,
    responseStatus:
      typeof data?.response_status === "number" ? data.response_status : input.responseStatus ?? null,
    responseHash: cleanString(data?.response_hash, 160) || responseHash,
    deduplicated: false,
    linkedRawImportId: null,
  } satisfies YahooRawImportRecord;
}

export async function logYahooImportError(input: {
  jobId?: string | null;
  stock: YahooResolvedStockTarget;
  bucketKey: string;
  errorStage: string;
  errorCode?: string | null;
  errorMessage: string;
  tradeDate?: string | null;
  fiscalDate?: string | null;
  rawPayload?: unknown;
  context?: Record<string, unknown>;
}) {
  ensureYahooServiceReady();
  if (input.context?.dryRun === true) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const importedAt = new Date().toISOString();
  const { error } = await supabase.from("stock_import_errors").insert({
    id: randomUUID(),
    job_id: cleanString(input.jobId, 160) || null,
    job_item_id: null,
    stock_id: input.stock.stockId,
    symbol: input.stock.symbol,
    bucket_key: input.bucketKey,
    error_stage: cleanString(input.errorStage, 120) || "fetch",
    error_code: cleanString(input.errorCode, 240) || null,
    error_message: cleanString(input.errorMessage, 4000),
    trade_date: cleanString(input.tradeDate, 40) || null,
    fiscal_date: cleanString(input.fiscalDate, 40) || null,
    raw_payload: normalizeJsonbValue(input.rawPayload ?? {}),
    context_json: normalizeJsonbValue(input.context ?? {}),
    imported_at: importedAt,
    created_at: importedAt,
    updated_at: importedAt,
  });

  if (error) {
    console.error("[yahoo-finance-service] failed to persist stock_import_errors row", {
      bucketKey: input.bucketKey,
      symbol: input.stock.symbol,
      jobId: input.jobId ?? null,
      error: error.message,
    });
  }
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { rawText: text };
  }
}

async function executeYahooJsonRequest<TParsed>(
  input: YahooJsonRequestInput<TParsed>,
): Promise<{
  stock: YahooResolvedStockTarget;
  rawImport: YahooRawImportRecord;
  payload: TParsed;
}> {
  ensureYahooServiceReady();

  if (input.dryRunFixture) {
    const parsedPayload = input.dryRunFixture.payload as TParsed;
    const apiError = input.extractApiError?.(parsedPayload) ?? null;
    const validationError = input.validateParsedPayload?.(parsedPayload) ?? null;
    const summary = input.summarizeParsedPayload?.(parsedPayload) ?? {};
    const combinedError = validationError || apiError;
    const rawImport = await persistRawYahooImport({
      stock: input.stock,
      sourceBucket: input.bucketKey,
      moduleName: input.moduleName,
      requestUrl: input.requestUrl,
      requestType: input.requestType,
      requestPayload: input.requestPayload,
      requestContext: {
        attempt: 1,
        dryRun: true,
        fixtureName: input.dryRunFixture.fixtureName,
        ...input.requestContext,
      },
      responseStatus: input.dryRunFixture.responseStatus,
      responseHeaders: input.dryRunFixture.responseHeaders,
      rawPayload: parsedPayload,
      normalizedPayload: summary.normalizedPayload,
      tradeDate: summary.tradeDate,
      fiscalDate: summary.fiscalDate,
      sourceRecordedAt: summary.sourceRecordedAt,
      status: combinedError ? "failed" : "completed",
      errorMessage: combinedError,
    });

    if (combinedError) {
      throw new Error(combinedError);
    }

    return {
      stock: input.stock,
      rawImport,
      payload: parsedPayload,
    };
  }

  const timeoutMs = getYahooTimeoutMs();
  const maxAttempts = getYahooMaxRetries() + 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await waitForYahooThrottleWindow();

    let responseStatus: number | null = null;
    let responseHeaders: Record<string, unknown> = {};
    let parsedPayload: TParsed | null = null;
    let rawPayloadForStorage: unknown = {};

    try {
      const response = await fetch(input.requestUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "RiddraYahooFinanceService/1.0",
          ...(input.requestHeaders ?? {}),
        },
      });

      responseStatus = response.status;
      responseHeaders = responseHeadersToObject(response.headers);
      const responseText = await response.text();
      rawPayloadForStorage = safeParseJson(responseText);
      parsedPayload = rawPayloadForStorage as TParsed;

      const apiError = input.extractApiError?.(parsedPayload) ?? null;
      const validationError = input.validateParsedPayload?.(parsedPayload) ?? null;
      const summary = input.summarizeParsedPayload?.(parsedPayload) ?? {};
      const failedRequest = !response.ok || Boolean(apiError) || Boolean(validationError);
      const requestErrorMessage =
        validationError ||
        apiError ||
        (!response.ok
          ? `Yahoo Finance ${input.requestType} request failed with status ${response.status}.`
          : null);

      const rawImport = await persistRawYahooImport({
        stock: input.stock,
        sourceBucket: input.bucketKey,
        moduleName: input.moduleName,
        requestUrl: input.requestUrl,
        requestType: input.requestType,
        requestPayload: input.requestPayload,
        requestContext: {
          attempt,
          ...input.requestContext,
        },
        responseStatus,
        responseHeaders,
        rawPayload: rawPayloadForStorage,
        normalizedPayload: summary.normalizedPayload,
        tradeDate: summary.tradeDate,
        fiscalDate: summary.fiscalDate,
        sourceRecordedAt: summary.sourceRecordedAt,
        status: failedRequest ? "failed" : "completed",
        errorMessage: requestErrorMessage,
      });

      if (!failedRequest) {
        return {
          stock: input.stock,
          rawImport,
          payload: parsedPayload,
        };
      }

      lastError = new Error(requestErrorMessage || "Yahoo Finance returned an unknown failure.");
      const canRetry = attempt < maxAttempts && shouldRetryStatus(response.status);
      if (!canRetry) {
        await logYahooImportError({
          jobId: input.jobId ?? null,
          stock: input.stock,
          bucketKey: input.bucketKey,
          errorStage: "fetch",
          errorCode: String(response.status),
          errorMessage: lastError.message,
          tradeDate: summary.tradeDate,
          fiscalDate: summary.fiscalDate,
          rawPayload: rawPayloadForStorage,
          context: {
            moduleName: input.moduleName,
            requestType: input.requestType,
            requestUrl: input.requestUrl,
            rawImportId: rawImport.id,
          },
        });
        throw lastError;
      }
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(`Yahoo Finance ${input.requestType} request failed.`);

      if (responseStatus === null) {
        let rawImportId: string | null = null;
        try {
          const rawImport = await persistRawYahooImport({
            stock: input.stock,
            sourceBucket: input.bucketKey,
            moduleName: input.moduleName,
            requestUrl: input.requestUrl,
            requestType: input.requestType,
            requestPayload: input.requestPayload,
            requestContext: {
              attempt,
              ...input.requestContext,
            },
            responseStatus: null,
            responseHeaders,
            rawPayload: rawPayloadForStorage,
            normalizedPayload: {},
            status: "failed",
            errorMessage: lastError.message,
          });
          rawImportId = rawImport.id;
        } catch (rawPersistError) {
          throw new Error(
            `${lastError.message} Raw Yahoo response persistence also failed: ${
              rawPersistError instanceof Error ? rawPersistError.message : "Unknown raw persistence error."
            }`,
          );
        }

        if (attempt >= maxAttempts) {
          await logYahooImportError({
            jobId: input.jobId ?? null,
            stock: input.stock,
            bucketKey: input.bucketKey,
            errorStage: "fetch",
            errorCode: "NETWORK_OR_TIMEOUT",
            errorMessage: lastError.message,
            rawPayload: rawPayloadForStorage,
            context: {
              moduleName: input.moduleName,
              requestType: input.requestType,
              requestUrl: input.requestUrl,
              rawImportId,
            },
          });
          throw lastError;
        }
      }
    }

    if (attempt < maxAttempts) {
      await sleep(getRetryBackoffMs(attempt));
    }
  }

  throw lastError ?? new Error(`Yahoo Finance ${input.requestType} request failed.`);
}

async function acquireYahooBrowserAuthContext(symbol: string) {
  const normalizedSymbol = normalizeYahooSymbol(symbol);
  const refererUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(normalizedSymbol)}`;
  const timeoutMs = getYahooTimeoutMs();

  const pageResponse = await fetch(refererUrl, {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: buildYahooBrowserHeaders({
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      refererUrl,
    }),
  });

  const setCookies =
    typeof pageResponse.headers.getSetCookie === "function"
      ? pageResponse.headers.getSetCookie()
      : [];
  const cookieHeader = extractCookieHeaderFromSetCookies(setCookies);

  if (!cookieHeader) {
    throw new Error(
      `Yahoo browser-auth fallback could not obtain cookies for "${normalizedSymbol}".`,
    );
  }

  const crumbResponse = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: buildYahooBrowserHeaders({
      accept: "*/*",
      cookieHeader,
      refererUrl,
    }),
  });

  const crumbText = cleanString(await crumbResponse.text(), 400);
  if (!crumbResponse.ok || !crumbText || /^too many requests/i.test(crumbText)) {
    throw new Error(
      `Yahoo browser-auth fallback could not obtain a crumb for "${normalizedSymbol}" (status ${crumbResponse.status}).`,
    );
  }

  return {
    cookieHeader,
    crumb: crumbText,
    refererUrl,
  };
}

export async function fetchYahooLatestQuote(input: {
  yahooSymbol: string;
  jobId?: string | null;
  dryRun?: boolean;
}) {
  const { normalizedSymbol, requestUrl } = buildYahooQuoteLatestUrl(input.yahooSymbol);
  const stock = await resolveYahooStockTarget(normalizedSymbol);
  return executeYahooJsonRequest<{
    quoteResponse?: {
      result?: Array<Record<string, unknown>>;
      error?: { code?: string | null; description?: string | null } | null;
    };
  }>({
    stock,
    jobId: input.jobId,
    dryRunFixture: input.dryRun
      ? getYahooDryRunFixture({
          yahooSymbol: normalizedSymbol,
          requestType: "quote_latest",
        })
      : null,
    bucketKey: "quote_latest",
    moduleName: "quote",
    requestType: "quote_latest",
    requestUrl,
    requestPayload: {
      symbol: normalizedSymbol,
    },
    extractApiError: (payload) => {
      const financeError = extractTopLevelYahooFinanceError(payload);
      if (financeError) {
        return financeError;
      }
      const quoteError = payload.quoteResponse?.error;
      if (quoteError) {
        return cleanString(quoteError.description || quoteError.code, 400) || "Yahoo quote error.";
      }
      if (!(payload.quoteResponse?.result?.length ?? 0)) {
        return `Yahoo Finance did not return a quote result for "${normalizedSymbol}".`;
      }
      return null;
    },
    summarizeParsedPayload: (payload) => {
      const quote = payload.quoteResponse?.result?.[0] ?? {};
      const marketTime = safeInteger(quote.regularMarketTime);
      return {
        tradeDate:
          marketTime !== null
            ? toIsoDateInTimeZone(new Date(marketTime * 1000), "Asia/Kolkata")
            : null,
        normalizedPayload: {
          symbol: cleanString(quote.symbol, 160) || normalizedSymbol,
          marketState: cleanString(quote.marketState, 120) || null,
          regularMarketPrice: safeNumber(quote.regularMarketPrice),
          regularMarketTime: marketTime,
        },
        sourceRecordedAt: marketTime !== null ? new Date(marketTime * 1000).toISOString() : null,
      };
    },
  });
}

export async function fetchYahooQuoteSummaryModules(input: {
  yahooSymbol: string;
  modules: YahooQuoteSummaryModule[];
  bucketKey?: string;
  requestType?: YahooRequestType;
  jobId?: string | null;
  dryRun?: boolean;
}) {
  const modules = Array.from(new Set(input.modules.map((item) => cleanString(item, 120)).filter(Boolean)));
  const { normalizedSymbol, requestUrl } = buildYahooQuoteSummaryUrl(
    input.yahooSymbol,
    modules as YahooQuoteSummaryModule[],
  );
  const stock = await resolveYahooStockTarget(normalizedSymbol);
  const executeRequest = (
    runtimeUrl: string,
    requestHeaders?: Record<string, string>,
    requestContext?: Record<string, unknown>,
  ) =>
    executeYahooJsonRequest<{
    quoteSummary?: {
      result?: Array<Record<string, unknown>>;
      error?: { code?: string | null; description?: string | null } | null;
    };
  }>({
    stock,
    jobId: input.jobId,
    dryRunFixture: input.dryRun
      ? getYahooDryRunFixture({
          yahooSymbol: normalizedSymbol,
          requestType:
            input.requestType === "financial_statements"
              ? "financial_statements"
              : "quote_summary",
          modules,
        })
      : null,
    bucketKey: cleanString(input.bucketKey, 160) || "quote_summary",
    moduleName: modules.join(","),
    requestType: input.requestType ?? "quote_summary",
    requestHeaders,
    requestUrl: runtimeUrl,
    requestPayload: {
      symbol: normalizedSymbol,
      modules,
    },
    requestContext,
    extractApiError: (payload) => {
      const financeError = extractTopLevelYahooFinanceError(payload);
      if (financeError) {
        return financeError;
      }
      const summaryError = payload.quoteSummary?.error;
      if (summaryError) {
        return cleanString(summaryError.description || summaryError.code, 400) || "Yahoo quote summary error.";
      }
      if (!(payload.quoteSummary?.result?.length ?? 0)) {
        return `Yahoo Finance did not return quote summary modules for "${normalizedSymbol}".`;
      }
      return null;
    },
    summarizeParsedPayload: (payload) => ({
      normalizedPayload: {
        modules,
      },
      sourceRecordedAt: new Date().toISOString(),
    }),
  });

  try {
    return await executeRequest(requestUrl);
  } catch (error) {
    if (input.dryRun || !isYahooProtectedEndpointUnavailableError(error)) {
      throw error;
    }

    try {
      const authContext = await acquireYahooBrowserAuthContext(normalizedSymbol);
      const fallbackUrl = new URL(requestUrl);
      fallbackUrl.searchParams.set("crumb", authContext.crumb);

      return await executeRequest(
        fallbackUrl.toString(),
        buildYahooBrowserHeaders({
          accept: "application/json, text/plain, */*",
          cookieHeader: authContext.cookieHeader,
          refererUrl: authContext.refererUrl,
          origin: "https://finance.yahoo.com",
        }),
        {
          fallbackStrategy: "browser_cookie_crumb",
          acquiredCrumb: true,
        },
      );
    } catch (fallbackError) {
      throw new Error(
        `${extractErrorMessage(error)} Browser-auth fallback also failed: ${extractErrorMessage(
          fallbackError,
        )}`,
      );
    }
  }
}

export async function fetchYahooHistoricalPriceData(input: {
  yahooSymbol: string;
  range?: string;
  interval?: string;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  includePrePost?: boolean;
  events?: string;
  jobId?: string | null;
  dryRun?: boolean;
}) {
  const { normalizedSymbol, requestUrl } = buildYahooChartUrl(input.yahooSymbol, {
    range: input.range,
    interval: input.interval,
    periodStartDate: input.periodStartDate ?? null,
    periodEndDate: input.periodEndDate ?? null,
    includePrePost: input.includePrePost,
    events: input.events,
  });
  const stock = await resolveYahooStockTarget(normalizedSymbol);

  const response = await executeYahooJsonRequest<{
    chart?: {
      result?: Array<{
        meta?: Record<string, unknown>;
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
            volume?: Array<number | null>;
          }>;
          adjclose?: Array<{
            adjclose?: Array<number | null>;
          }>;
        };
        events?: {
          dividends?: Record<string, Record<string, unknown>>;
          splits?: Record<string, Record<string, unknown>>;
        };
      }>;
      error?: { code?: string | null; description?: string | null } | null;
    };
  }>({
    stock,
    jobId: input.jobId,
    dryRunFixture: input.dryRun
      ? getYahooDryRunFixture({
          yahooSymbol: normalizedSymbol,
          requestType: "historical_prices",
        })
      : null,
    bucketKey: "historical_prices",
    moduleName: "chart",
    requestType: "historical_prices",
    requestUrl,
    requestPayload: {
      symbol: normalizedSymbol,
      range: cleanString(input.range, 40) || "1mo",
      interval: cleanString(input.interval, 20) || "1d",
      periodStartDate: cleanString(input.periodStartDate, 40) || null,
      periodEndDate: cleanString(input.periodEndDate, 40) || null,
      events: cleanString(input.events, 80) || "div,splits",
    },
    requestContext: {
      expectedYahooSymbol: normalizedSymbol,
      responseIsolationScope: "yahoo_symbol",
      responseIsolationKey: `historical_prices:${normalizedSymbol}`,
      range: cleanString(input.range, 40) || "1mo",
      periodStartDate: cleanString(input.periodStartDate, 40) || null,
      periodEndDate: cleanString(input.periodEndDate, 40) || null,
    },
    extractApiError: (payload) => {
      const chartError = payload.chart?.error;
      if (chartError) {
        return cleanString(chartError.description || chartError.code, 400) || "Yahoo chart error.";
      }
      if (!(payload.chart?.result?.length ?? 0)) {
        return `Yahoo Finance did not return chart data for "${normalizedSymbol}".`;
      }
      return null;
    },
    validateParsedPayload: (payload) => {
      const payloadSymbol = extractYahooChartPayloadSymbol(payload);
      if (!payloadSymbol) {
        return `Yahoo chart payload for "${normalizedSymbol}" did not include a meta.symbol value.`;
      }
      if (payloadSymbol !== normalizedSymbol) {
        return `Yahoo chart payload symbol mismatch. Expected "${normalizedSymbol}" but received "${payloadSymbol}".`;
      }
      if (!doesYahooRequestUrlTargetSymbol(requestUrl, normalizedSymbol)) {
        return `Yahoo chart request URL did not resolve to the expected symbol "${normalizedSymbol}".`;
      }
      return null;
    },
    summarizeParsedPayload: (payload) => {
      const result = payload.chart?.result?.[0];
      const timestamps = result?.timestamp ?? [];
      const lastTimestamp = timestamps.length ? timestamps[timestamps.length - 1] : null;
      return {
        payloadSymbol: extractYahooChartPayloadSymbol(payload),
        tradeDate:
          typeof lastTimestamp === "number"
            ? toIsoDateInTimeZone(new Date(lastTimestamp * 1000), "Asia/Kolkata")
            : null,
        normalizedPayload: {
          candleCount: timestamps.length,
          hasDividends: Boolean(result?.events?.dividends),
          hasSplits: Boolean(result?.events?.splits),
        },
        sourceRecordedAt:
          typeof lastTimestamp === "number"
            ? new Date(lastTimestamp * 1000).toISOString()
            : new Date().toISOString(),
      };
    },
  });

  const result = response.payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const adjClose = result?.indicators?.adjclose?.[0]?.adjclose ?? [];
  const exchangeTimeZone = cleanString(result?.meta?.exchangeTimezoneName, 120) || "Asia/Kolkata";

  const rows: YahooHistoricalPriceRow[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const timestamp = timestamps[index];
    const open = quote?.open?.[index];
    const high = quote?.high?.[index];
    const low = quote?.low?.[index];
    const close = quote?.close?.[index];
    if (
      typeof timestamp !== "number" ||
      typeof open !== "number" ||
      !Number.isFinite(open) ||
      typeof high !== "number" ||
      !Number.isFinite(high) ||
      typeof low !== "number" ||
      !Number.isFinite(low) ||
      typeof close !== "number" ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    const volumeValue = quote?.volume?.[index];
    rows.push({
      tradeDate: toIsoDateInTimeZone(new Date(timestamp * 1000), exchangeTimeZone),
      open,
      high,
      low,
      close,
      adjClose:
        typeof adjClose[index] === "number" && Number.isFinite(adjClose[index] as number)
          ? (adjClose[index] as number)
          : null,
      volume:
        typeof volumeValue === "number" && Number.isFinite(volumeValue) ? volumeValue : null,
      timestamp,
    });
  }

  return {
    ...response,
    rows,
    meta: (result?.meta ?? {}) as Record<string, unknown>,
    dividends: normalizeJsonbValue(result?.events?.dividends ?? {}),
    splits: normalizeJsonbValue(result?.events?.splits ?? {}),
  };
}

export async function fetchYahooFinancialStatements(input: {
  yahooSymbol: string;
  jobId?: string | null;
  dryRun?: boolean;
}) {
  return fetchYahooQuoteSummaryModules({
    yahooSymbol: input.yahooSymbol,
    modules: [...YAHOO_QUOTE_SUMMARY_FINANCIAL_STATEMENT_MODULES],
    bucketKey: "financial_statements",
    requestType: "financial_statements",
    jobId: input.jobId,
    dryRun: input.dryRun,
  });
}

export async function fetchYahooHolders(input: {
  yahooSymbol: string;
  jobId?: string | null;
}) {
  return fetchYahooQuoteSummaryModules({
    yahooSymbol: input.yahooSymbol,
    modules: [...YAHOO_QUOTE_SUMMARY_HOLDER_MODULES],
    bucketKey: "holders",
    requestType: "holders",
    jobId: input.jobId,
  });
}

export async function fetchYahooDividendsAndSplits(input: {
  yahooSymbol: string;
  range?: string;
  interval?: string;
  jobId?: string | null;
  dryRun?: boolean;
}) {
  const historical = await fetchYahooHistoricalPriceData({
    yahooSymbol: input.yahooSymbol,
    range: input.range ?? "1y",
    interval: input.interval ?? "1d",
    events: "div,splits",
    jobId: input.jobId,
    dryRun: input.dryRun,
  });

  return {
    ...historical,
    requestType: "dividends_splits" as const,
  };
}

export async function fetchYahooOptions(input: {
  yahooSymbol: string;
  expirationDate?: string | null;
  jobId?: string | null;
}) {
  const { normalizedSymbol, requestUrl } = buildYahooOptionsUrl(
    input.yahooSymbol,
    input.expirationDate,
  );
  const stock = await resolveYahooStockTarget(normalizedSymbol);
  return executeYahooJsonRequest<{
    optionChain?: {
      result?: Array<Record<string, unknown>>;
      error?: { code?: string | null; description?: string | null } | null;
    };
  }>({
    stock,
    jobId: input.jobId,
    bucketKey: "options",
    moduleName: "options",
    requestType: "options",
    requestUrl,
    requestPayload: {
      symbol: normalizedSymbol,
      expirationDate: cleanString(input.expirationDate, 40) || null,
    },
    extractApiError: (payload) => {
      const optionError = payload.optionChain?.error;
      if (optionError) {
        return cleanString(optionError.description || optionError.code, 400) || "Yahoo options error.";
      }
      if (!(payload.optionChain?.result?.length ?? 0)) {
        return `Yahoo Finance did not return option chain data for "${normalizedSymbol}".`;
      }
      return null;
    },
    summarizeParsedPayload: (payload) => ({
      normalizedPayload: {
        expirationCount:
          Array.isArray(payload.optionChain?.result?.[0]?.expirationDates)
            ? (payload.optionChain?.result?.[0]?.expirationDates as unknown[]).length
            : 0,
      },
      sourceRecordedAt: new Date().toISOString(),
    }),
  });
}

export async function fetchYahooNews(input: {
  yahooSymbol: string;
  newsCount?: number;
  jobId?: string | null;
}) {
  const { normalizedSymbol, requestUrl } = buildYahooNewsUrl(
    input.yahooSymbol,
    input.newsCount ?? 10,
  );
  const stock = await resolveYahooStockTarget(normalizedSymbol);
  return executeYahooJsonRequest<Record<string, unknown>>({
    stock,
    jobId: input.jobId,
    bucketKey: "news",
    moduleName: "news",
    requestType: "news",
    requestUrl,
    requestPayload: {
      symbol: normalizedSymbol,
      newsCount: input.newsCount ?? 10,
    },
    extractApiError: (payload) => {
      if (Array.isArray(payload.news) || Array.isArray(payload.stream)) {
        return null;
      }
      return null;
    },
    summarizeParsedPayload: (payload) => ({
      normalizedPayload: {
        newsCount:
          Array.isArray(payload.news)
            ? payload.news.length
            : Array.isArray(payload.stream)
              ? payload.stream.length
              : 0,
      },
      sourceRecordedAt: new Date().toISOString(),
    }),
  });
}

export function buildYahooHistoricalCsvText(input: {
  symbol: string;
  rows: YahooHistoricalPriceRow[];
  sourceLabel?: string | null;
}) {
  const sourceLabel = cleanString(input.sourceLabel, 240) || "yahoo_finance_import";
  const header = ["symbol", "date", "open", "high", "low", "close", "volume", "source"];
  const bodyRows = [...input.rows]
    .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate))
    .map((row) =>
      [
        input.symbol,
        row.tradeDate,
        String(row.open),
        String(row.high),
        String(row.low),
        String(row.close),
        row.volume === null ? "" : String(row.volume),
        sourceLabel,
      ]
        .map((value) => escapeCsvCell(cleanString(value, 4000)))
        .join(","),
    );

  return [header.join(","), ...bodyRows].join("\n");
}
