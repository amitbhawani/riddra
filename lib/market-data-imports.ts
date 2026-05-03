import { createSign, randomUUID } from "crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import { TRACKED_INDEX_SLUGS, getIndexSnapshots } from "@/lib/index-content";
import { normalizeBenchmarkSlug } from "@/lib/benchmark-labels";
import { getFunds, getStocks } from "@/lib/content";
import { parseCsvText, buildCsvTemplate, guessCsvHeader } from "@/lib/csv-import";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import {
  persistBenchmarkOhlcvHistory,
  persistFundNavSeriesHistory,
  persistStockOhlcvHistory,
  refreshLatestStockQuoteFromOhlcvHistory,
  type MarketIngestMode,
} from "@/lib/market-data-durable-store";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { getSourceEntryStore } from "@/lib/source-entry-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildYahooHistoricalCsvText,
  fetchYahooHistoricalPriceData,
} from "@/lib/yahoo-finance-service";

export const supportedMarketDataImportTypes = [
  "stock_ohlcv",
  "benchmark_ohlcv",
  "fund_nav",
] as const;

export type MarketDataImportType = (typeof supportedMarketDataImportTypes)[number];
export type MarketDataImportExecutionMode = "validate_only" | "import_valid_rows";
export type MarketDataImportDuplicateMode = "replace_matching_dates" | "skip_existing_dates";
export type MarketDataImportSourceType =
  | "manual_csv"
  | "google_sheet"
  | "yahoo_finance"
  | "provider_api";
export type MarketDataImportBatchStatus =
  | "preview_ready"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed";
export type MarketDataImportRowStatus =
  | "valid"
  | "warning"
  | "failed"
  | "imported"
  | "skipped";
export type MarketDataImportDuplicateState =
  | "none"
  | "csv_duplicate"
  | "existing_duplicate";

type ColumnDefinition = {
  key: string;
  label: string;
  aliases: string[];
  required: boolean;
  description: string;
};

export type MarketDataImportTemplate = {
  type: MarketDataImportType;
  label: string;
  description: string;
  sourceCopy: string;
  headers: string[];
  columns: ColumnDefinition[];
  sampleCsv: string;
};

export type MarketDataImportBatch = {
  id: string;
  dataType: MarketDataImportType;
  executionMode: MarketDataImportExecutionMode;
  duplicateMode: MarketDataImportDuplicateMode;
  status: MarketDataImportBatchStatus;
  sourceType: MarketDataImportSourceType;
  sourceLabel: string | null;
  sourceUrl: string | null;
  fileName: string;
  actorUserId: string | null;
  actorEmail: string;
  importedBy: string;
  importedAt: string;
  rowCount: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  duplicateRows: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MarketDataImportRow = {
  id: string;
  batchId: string;
  rowNumber: number;
  identifier: string | null;
  mappedSlug: string | null;
  mappedLabel: string | null;
  importDate: string | null;
  status: MarketDataImportRowStatus;
  duplicateState: MarketDataImportDuplicateState;
  warnings: string[];
  errors: string[];
  payload: Record<string, string>;
  resultNote: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketDataImportPreview = {
  type: MarketDataImportType;
  fileName: string;
  executionMode: MarketDataImportExecutionMode;
  duplicateMode: MarketDataImportDuplicateMode;
  sourceType: MarketDataImportSourceType;
  sourceLabel: string | null;
  sourceUrl: string | null;
  template: MarketDataImportTemplate;
  columnMapping: Record<string, string>;
  missingColumns: string[];
  rows: MarketDataImportRow[];
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  duplicateRows: number;
  canImport: boolean;
};

export type ExecuteMarketDataImportResult = {
  batch: MarketDataImportBatch;
  rows: MarketDataImportRow[];
  affectedRoutes: string[];
  affectedAssets: string[];
  warnings: string[];
  persistenceWarnings: string[];
};

type StockLookupEntry = {
  slug: string;
  label: string;
  symbol: string;
};

type FundLookupEntry = {
  slug: string;
  label: string;
  identifier: string;
};

type BenchmarkLookupEntry = {
  slug: string;
  label: string;
};

function isPlaceholderStockLabel(label: string) {
  const normalized = normalizeUpper(label).replace(/\s+/g, " ");
  return (
    normalized.startsWith("FAKE ") ||
    normalized.includes(" IMPORT TEST ") ||
    normalized.endsWith(" SAMPLE") ||
    normalized.endsWith(" DEMO")
  );
}

function getPreferredStockLookupEntry(
  existing: StockLookupEntry | undefined,
  candidate: StockLookupEntry,
) {
  if (!existing) {
    return candidate;
  }

  const existingPlaceholder = isPlaceholderStockLabel(existing.label);
  const candidatePlaceholder = isPlaceholderStockLabel(candidate.label);

  if (existingPlaceholder && !candidatePlaceholder) {
    return candidate;
  }

  if (!existingPlaceholder && candidatePlaceholder) {
    return existing;
  }

  if (!cleanString(existing.label, 240) && cleanString(candidate.label, 240)) {
    return candidate;
  }

  if (!cleanString(existing.symbol, 80) && cleanString(candidate.symbol, 80)) {
    return candidate;
  }

  return existing;
}

function setPreferredStockLookupEntry(
  collection: Map<string, StockLookupEntry>,
  key: string,
  candidate: StockLookupEntry,
) {
  const normalizedKey = cleanString(key, 160);
  if (!normalizedKey) {
    return;
  }

  collection.set(normalizedKey, getPreferredStockLookupEntry(collection.get(normalizedKey), candidate));
}

type MarketDataPreviewInput = {
  type: MarketDataImportType;
  csvText: string;
  fileName: string;
  executionMode: MarketDataImportExecutionMode;
  duplicateMode: MarketDataImportDuplicateMode;
  sourceType: MarketDataImportSourceType;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
};

type ExecuteMarketDataImportInput = MarketDataPreviewInput & {
  actorUserId: string | null;
  actorEmail: string;
  simulateFinalBatchUpdateFailure?: boolean;
};

export type GoogleSheetMarketDataIngestionInput = {
  mode: "preview" | "execute";
  type: MarketDataImportType;
  googleSheetUrl: string;
  executionMode: MarketDataImportExecutionMode;
  duplicateMode: MarketDataImportDuplicateMode;
  fileName?: string;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  actorUserId?: string | null;
  actorEmail?: string;
  simulateFinalBatchUpdateFailure?: boolean;
};

export type YahooFinanceMarketDataIngestionInput = {
  mode: "preview" | "execute";
  type: "stock_ohlcv";
  yahooSymbol: string;
  executionMode: MarketDataImportExecutionMode;
  duplicateMode: MarketDataImportDuplicateMode;
  fileName?: string;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  actorUserId?: string | null;
  actorEmail?: string;
  simulateFinalBatchUpdateFailure?: boolean;
};

export type ProviderApiMarketDataIngestionInput = {
  mode: "preview" | "execute";
  type: MarketDataImportType;
  sourceUrl: string;
  executionMode: MarketDataImportExecutionMode;
  duplicateMode: MarketDataImportDuplicateMode;
  fileName?: string;
  sourceLabel?: string | null;
  actorUserId?: string | null;
  actorEmail?: string;
  simulateFinalBatchUpdateFailure?: boolean;
};

export type ManualCsvMarketDataIngestionInput =
  | ({
      mode: "preview";
    } & MarketDataPreviewInput)
  | ({
      mode: "execute";
    } & ExecuteMarketDataImportInput);

type ExistingDateLookup = Map<string, Set<string>>;

const marketDataImportTemplates: Record<MarketDataImportType, MarketDataImportTemplate> = {
  stock_ohlcv: {
    type: "stock_ohlcv",
    label: "Stock OHLCV history",
    description:
      "Upload end-of-day stock candles into the durable stock history table. This is the correct path for long historical price data, not the stock CMS import.",
    sourceCopy: "CSV upload today. Google Sheet and provider sync can be connected later.",
    headers: ["symbol", "date", "open", "high", "low", "close", "volume", "source"],
    columns: [
      {
        key: "symbol",
        label: "Symbol",
        aliases: ["symbol", "ticker", "stock_symbol"],
        required: true,
        description: "Must match an existing stock symbol.",
      },
      {
        key: "date",
        label: "Date",
        aliases: ["date", "bar_date", "trading_date"],
        required: true,
        description: "Use YYYY-MM-DD.",
      },
      {
        key: "open",
        label: "Open",
        aliases: ["open"],
        required: true,
        description: "Opening price.",
      },
      {
        key: "high",
        label: "High",
        aliases: ["high"],
        required: true,
        description: "High price.",
      },
      {
        key: "low",
        label: "Low",
        aliases: ["low"],
        required: true,
        description: "Low price.",
      },
      {
        key: "close",
        label: "Close",
        aliases: ["close", "ltp"],
        required: true,
        description: "Closing price.",
      },
      {
        key: "volume",
        label: "Volume",
        aliases: ["volume"],
        required: false,
        description: "Optional but recommended.",
      },
      {
        key: "source",
        label: "Source",
        aliases: ["source", "source_label"],
        required: false,
        description: "Optional source label for this row or file.",
      },
    ],
    sampleCsv: buildCsvTemplate(
      ["symbol", "date", "open", "high", "low", "close", "volume", "source"],
      {
        symbol: "RELIANCE",
        date: "2026-04-25",
        open: "2935.10",
        high: "2952.80",
        low: "2911.00",
        close: "2948.25",
        volume: "8246318",
        source: "manual_csv_upload",
      },
    ),
  },
  benchmark_ohlcv: {
    type: "benchmark_ohlcv",
    label: "Benchmark / index OHLCV history",
    description:
      "Upload retained daily benchmark candles for tracked index routes such as Nifty 50 and Sensex.",
    sourceCopy: "CSV upload today. Google Sheet and provider sync can be connected later.",
    headers: [
      "benchmark_slug",
      "date",
      "open",
      "high",
      "low",
      "close",
      "volume",
      "source",
    ],
    columns: [
      {
        key: "benchmark_slug",
        label: "Benchmark slug",
        aliases: ["benchmark_slug", "index_slug", "benchmark", "index"],
        required: true,
        description: "Must match an existing tracked benchmark route such as nifty50.",
      },
      {
        key: "date",
        label: "Date",
        aliases: ["date", "bar_date", "trading_date"],
        required: true,
        description: "Use YYYY-MM-DD.",
      },
      {
        key: "open",
        label: "Open",
        aliases: ["open"],
        required: true,
        description: "Opening price.",
      },
      {
        key: "high",
        label: "High",
        aliases: ["high"],
        required: true,
        description: "High price.",
      },
      {
        key: "low",
        label: "Low",
        aliases: ["low"],
        required: true,
        description: "Low price.",
      },
      {
        key: "close",
        label: "Close",
        aliases: ["close"],
        required: true,
        description: "Closing price.",
      },
      {
        key: "volume",
        label: "Volume",
        aliases: ["volume"],
        required: false,
        description: "Optional benchmark volume.",
      },
      {
        key: "source",
        label: "Source",
        aliases: ["source", "source_label"],
        required: false,
        description: "Optional source label for this row or file.",
      },
    ],
    sampleCsv: buildCsvTemplate(
      ["benchmark_slug", "date", "open", "high", "low", "close", "volume", "source"],
      {
        benchmark_slug: "nifty50",
        date: "2026-04-25",
        open: "22410.30",
        high: "22520.90",
        low: "22385.10",
        close: "22487.20",
        volume: "0",
        source: "manual_csv_upload",
      },
    ),
  },
  fund_nav: {
    type: "fund_nav",
    label: "Mutual fund NAV history",
    description:
      "Upload durable historical NAV rows for fund routes. Use scheme code mapping, not the content importer.",
    sourceCopy: "CSV upload today. Google Sheet and provider sync can be connected later.",
    headers: ["scheme_code", "date", "nav", "source"],
    columns: [
      {
        key: "scheme_code",
        label: "Scheme code",
        aliases: ["scheme_code", "schemeCode", "amfi_code"],
        required: true,
        description:
          "Must match an existing mutual fund scheme code or the current fund source identifier/slug until AMFI mapping is connected.",
      },
      {
        key: "date",
        label: "Date",
        aliases: ["date", "nav_date"],
        required: true,
        description: "Use YYYY-MM-DD.",
      },
      {
        key: "nav",
        label: "NAV",
        aliases: ["nav"],
        required: true,
        description: "Net asset value.",
      },
      {
        key: "source",
        label: "Source",
        aliases: ["source", "source_label"],
        required: false,
        description: "Optional source label for this row or file.",
      },
    ],
    sampleCsv: buildCsvTemplate(
      ["scheme_code", "date", "nav", "source"],
      {
        scheme_code: "140503",
        date: "2026-04-25",
        nav: "102.44",
        source: "manual_csv_upload",
      },
    ),
  },
};

function ensureMarketDataImportReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error(
      "Market Data Import requires durable Supabase admin credentials in this environment.",
    );
  }
}

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

type GoogleSheetsServiceAccountCredentials = {
  clientEmail: string;
  privateKey: string;
};

export function buildGoogleSheetCsvExportUrl(sheetUrl: string) {
  const normalizedUrl = cleanString(sheetUrl, 2000);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error("Enter a valid Google Sheet URL.");
  }

  if (!/docs\.google\.com$/i.test(parsedUrl.hostname)) {
    throw new Error("Google Sheet ingestion expects a docs.google.com spreadsheet URL.");
  }

  const match = parsedUrl.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match?.[1]) {
    throw new Error("Could not read the spreadsheet id from that Google Sheet URL.");
  }

  const spreadsheetId = match[1];
  const gid = cleanString(parsedUrl.searchParams.get("gid"), 120) || "0";
  const exportUrl = new URL(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`,
  );
  exportUrl.searchParams.set("format", "csv");
  exportUrl.searchParams.set("gid", gid);

  return {
    spreadsheetId,
    gid,
    exportUrl: exportUrl.toString(),
  };
}

function buildGoogleSheetGvizCsvUrl(input: { spreadsheetId: string; gid: string }) {
  const gvizUrl = new URL(
    `https://docs.google.com/spreadsheets/d/${input.spreadsheetId}/gviz/tq`,
  );
  gvizUrl.searchParams.set("tqx", "out:csv");
  gvizUrl.searchParams.set("gid", input.gid || "0");
  return gvizUrl.toString();
}

function getGoogleSheetsServiceAccountCredentials():
  | GoogleSheetsServiceAccountCredentials
  | null {
  const clientEmail = cleanString(
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL ||
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    320,
  );
  const privateKeyValue =
    process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    "";
  const privateKey = privateKeyValue.replace(/\\n/g, "\n").trim();

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey,
  };
}

function encodeBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function fetchGoogleSheetsServiceAccessToken(
  credentials: GoogleSheetsServiceAccountCredentials,
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const jwtHeader = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaims = encodeBase64Url(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${jwtHeader}.${jwtClaims}`);
  signer.end();
  const signature = encodeBase64Url(signer.sign(credentials.privateKey));
  const assertion = `${jwtHeader}.${jwtClaims}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        access_token?: string;
        error?: string;
        error_description?: string;
      }
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      `Google Sheets API auth failed with status ${response.status}. ${
        cleanString(payload?.error_description || payload?.error, 400) ||
        "Could not obtain a service account access token."
      }`,
    );
  }

  return payload.access_token;
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function normalizeGoogleSheetDateValue(value: string) {
  const trimmed = cleanString(value, 240);
  if (!trimmed) {
    return "";
  }

  const exactDate = normalizeDate(trimmed);
  if (exactDate) {
    return exactDate;
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (Number.isFinite(serial)) {
      const wholeDays = Math.floor(serial);
      const baseUtcMs = Date.UTC(1899, 11, 30);
      const date = new Date(baseUtcMs + wholeDays * 86_400_000);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  const ddMmYyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const [, first, second, year] = ddMmYyyy;
    const month = Number(first);
    const day = Number(second);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return trimmed;
}

function convertGoogleSheetValuesToCsvText(values: string[][]) {
  if (!values.length) {
    throw new Error("Google Sheets API returned no rows.");
  }

  const headers = values[0].map((value) => cleanString(value, 240));
  const dateColumnIndexes = new Set<number>();

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeLower(header);
    if (
      normalizedHeader === "date" ||
      normalizedHeader.endsWith("_date") ||
      normalizedHeader === "nav_date"
    ) {
      dateColumnIndexes.add(index);
    }
  });

  const normalizedRows = values.map((row, rowIndex) =>
    headers.map((_, columnIndex) => {
      const rawValue = cleanString(row[columnIndex], 4000);
      if (rowIndex > 0 && dateColumnIndexes.has(columnIndex)) {
        return normalizeGoogleSheetDateValue(rawValue);
      }
      return rawValue;
    }),
  );

  return normalizedRows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

async function fetchGoogleSheetCsvTextViaApi(sheetUrl: string) {
  const credentials = getGoogleSheetsServiceAccountCredentials();
  if (!credentials) {
    return null;
  }

  const resolved = buildGoogleSheetCsvExportUrl(sheetUrl);
  const accessToken = await fetchGoogleSheetsServiceAccessToken(credentials);
  const spreadsheetMetadataUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${resolved.spreadsheetId}`,
  );
  spreadsheetMetadataUrl.searchParams.set("fields", "sheets(properties(sheetId,title))");

  const metadataResponse = await fetch(spreadsheetMetadataUrl.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const metadataPayload = (await metadataResponse.json().catch(() => null)) as
    | {
        sheets?: Array<{
          properties?: {
            sheetId?: number;
            title?: string;
          };
        }>;
        error?: {
          code?: number;
          message?: string;
          status?: string;
        };
      }
    | null;

  if (!metadataResponse.ok) {
    throw new Error(
      `Google Sheets API metadata fetch failed with status ${metadataResponse.status}. ${
        cleanString(
          metadataPayload?.error?.message || metadataPayload?.error?.status,
          400,
        ) || "Could not load spreadsheet metadata."
      }`,
    );
  }

  const targetSheet =
    metadataPayload?.sheets?.find(
      (sheet) => String(sheet.properties?.sheetId ?? "") === resolved.gid,
    ) ?? metadataPayload?.sheets?.[0];
  const targetSheetTitle = cleanString(targetSheet?.properties?.title, 240);

  if (!targetSheetTitle) {
    throw new Error(
      "Google Sheets API could not determine which worksheet tab to export.",
    );
  }

  const range = `'${targetSheetTitle.replace(/'/g, "''")}'`;
  const valuesUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${resolved.spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  valuesUrl.searchParams.set("majorDimension", "ROWS");
  valuesUrl.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");
  valuesUrl.searchParams.set("dateTimeRenderOption", "FORMATTED_STRING");

  const valuesResponse = await fetch(valuesUrl.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const valuesPayload = (await valuesResponse.json().catch(() => null)) as
    | {
        values?: Array<Array<string | number | boolean | null>>;
        error?: {
          code?: number;
          message?: string;
          status?: string;
        };
      }
    | null;

  if (!valuesResponse.ok) {
    throw new Error(
      `Google Sheets API values fetch failed with status ${valuesResponse.status}. ${
        cleanString(valuesPayload?.error?.message || valuesPayload?.error?.status, 400) ||
        "Could not read worksheet values."
      }`,
    );
  }

  const rawValues = valuesPayload?.values?.map((row) =>
    row.map((cell) => cleanString(cell, 4000)),
  );
  if (!rawValues?.length) {
    throw new Error("Google Sheets API returned no rows.");
  }

  return {
    ...resolved,
    worksheetTitle: targetSheetTitle,
    csvText: convertGoogleSheetValuesToCsvText(rawValues),
  };
}

async function fetchRemoteText(url: string, label: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "text/csv,text/plain,application/json;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${label} failed with status ${response.status}. Ensure the upstream source is reachable and publicly accessible for this environment.`,
    );
  }

  return response.text();
}

async function fetchRemoteTextViaNodeRequest(
  url: string,
  label: string,
  redirectCount = 0,
): Promise<string> {
  const requestTimeoutMs = 30_000;
  if (redirectCount > 5) {
    throw new Error(`${label} followed too many redirects.`);
  }

  const parsedUrl = new URL(url);
  const requestImpl = parsedUrl.protocol === "http:" ? httpRequest : httpsRequest;

  return new Promise<string>((resolve, reject) => {
    const request = requestImpl(
      parsedUrl,
      {
        method: "GET",
        headers: {
          Accept: "text/csv,text/plain,application/json;q=0.9,*/*;q=0.8",
          "User-Agent": "RiddraMarketDataImport/1.0",
        },
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if (
          [301, 302, 303, 307, 308].includes(statusCode) &&
          typeof response.headers.location === "string"
        ) {
          response.resume();
          resolve(
            fetchRemoteTextViaNodeRequest(
              new URL(response.headers.location, parsedUrl).toString(),
              label,
              redirectCount + 1,
            ),
          );
          return;
        }

        if (statusCode >= 400) {
          response.resume();
          reject(
            new Error(
              `${label} failed with status ${statusCode}. Ensure the upstream source is reachable and publicly accessible for this environment.`,
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );

    request.setTimeout(requestTimeoutMs, () => {
      request.destroy(
        new Error(`${label} timed out after ${Math.round(requestTimeoutMs / 1000)} seconds.`),
      );
    });
    request.on("error", (error) => reject(error));
    request.end();
  });
}

export async function fetchGoogleSheetCsvText(sheetUrl: string) {
  const resolved = buildGoogleSheetCsvExportUrl(sheetUrl);
  let apiErrorMessage: string | null = null;

  try {
    const apiResult = await fetchGoogleSheetCsvTextViaApi(sheetUrl);
    if (apiResult) {
      return apiResult;
    }
  } catch (error) {
    apiErrorMessage = getErrorMessage(
      error,
      "Google Sheets API fetch failed before CSV export fallback.",
    );
  }

  try {
    const csvText = await fetchRemoteText(
      resolved.exportUrl,
      "Google Sheet CSV export fetch",
    );
    return {
      ...resolved,
      csvText,
    };
  } catch (error) {
    try {
      const gvizCsvText = await fetchRemoteText(
        buildGoogleSheetGvizCsvUrl(resolved),
        "Google Sheet GViz CSV fetch",
      );
      return {
        ...resolved,
        csvText: gvizCsvText,
      };
    } catch (gvizError) {
      try {
        const csvText = await fetchRemoteTextViaNodeRequest(
          resolved.exportUrl,
          "Google Sheet CSV export fetch",
        );
        return {
          ...resolved,
          csvText,
        };
      } catch (nodeRequestError) {
        const exportErrorMessage = getErrorMessage(
          nodeRequestError,
          getErrorMessage(
            gvizError,
            getErrorMessage(error, "Could not fetch the Google Sheet CSV export."),
          ),
        );
        throw new Error(
          [
            apiErrorMessage,
            `${exportErrorMessage} Share or publish the sheet for CSV export before importing it, or configure Google Sheets service-account credentials for private sheets.`,
          ]
            .filter(Boolean)
            .join(" "),
        );
      }
    }
  }
}

function buildYahooFinanceChartUrl(symbol: string) {
  const normalizedSymbol = cleanString(symbol, 80).toUpperCase();
  if (!normalizedSymbol) {
    throw new Error("Yahoo Finance ingestion needs a symbol such as RELIANCE.NS.");
  }

  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}`,
  );
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "10d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");

  return {
    normalizedSymbol,
    url: url.toString(),
  };
}

export function normalizeYahooSymbolForStockLookup(symbol: string) {
  return cleanString(symbol, 80).toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "");
}

async function fetchYahooFinanceChartCsv(symbol: string) {
  const { normalizedSymbol, url } = buildYahooFinanceChartUrl(symbol);
  const fetched = await fetchYahooHistoricalPriceData({
    yahooSymbol: normalizedSymbol,
    range: "10d",
    interval: "1d",
  });

  if (!fetched.rows.length) {
    throw new Error(
      `Yahoo Finance did not return any complete OHLC candles for "${normalizedSymbol}".`,
    );
  }

  const lookupSymbol = normalizeYahooSymbolForStockLookup(normalizedSymbol);
  const latestRow = fetched.rows[fetched.rows.length - 1]!;

  return {
    queryUrl: url,
    normalizedSymbol,
    lookupSymbol,
    importDate: latestRow.tradeDate,
    csvText: buildYahooHistoricalCsvText({
      symbol: lookupSymbol,
      rows: fetched.rows,
      sourceLabel: "yahoo_finance_import",
    }),
  };
}

function formatSupabaseErrorMessage(prefix: string, error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  const parts = [prefix, error.message ?? "Unknown error."];
  if (error.code) {
    parts.push(`(code: ${error.code})`);
  }
  if (error.details) {
    parts.push(`details: ${error.details}`);
  }
  if (error.hint) {
    parts.push(`hint: ${error.hint}`);
  }
  return parts.join(" ");
}

function normalizeLower(value: unknown) {
  return cleanString(value, 400).toLowerCase();
}

function normalizeUpper(value: unknown) {
  return cleanString(value, 400).toUpperCase();
}

function normalizeIdentifierSlug(value: unknown) {
  return cleanString(value, 400)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildFundIdentifierAliases(...values: Array<string | null | undefined>) {
  const aliases = new Set<string>();
  const abbreviationMap: Array<[RegExp, string]> = [
    [/\bopportunities\b/g, "opp"],
    [/\bopportunity\b/g, "opp"],
    [/\bcompany\b/g, "co"],
  ];

  for (const value of values) {
    const normalized = normalizeIdentifierSlug(value);
    if (!normalized) {
      continue;
    }

    aliases.add(normalized);

    if (normalized.endsWith("-fund")) {
      aliases.add(normalized.slice(0, -"-fund".length));
    }

    let abbreviated = normalized;
    for (const [pattern, replacement] of abbreviationMap) {
      abbreviated = abbreviated.replace(pattern, replacement);
    }

    aliases.add(abbreviated);

    if (abbreviated.endsWith("-fund")) {
      aliases.add(abbreviated.slice(0, -"-fund".length));
    }
  }

  return Array.from(aliases).filter(Boolean);
}

function isMarketDataImportType(value: string | null | undefined): value is MarketDataImportType {
  return supportedMarketDataImportTypes.includes(value as MarketDataImportType);
}

function normalizeDate(value: string) {
  const trimmed = cleanString(value, 120);
  if (!trimmed) {
    return null;
  }

  const exactMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (!exactMatch) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

function parseNumeric(value: string) {
  const cleaned = cleanString(value, 240).replace(/,/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRowKey(mappedSlug: string, importDate: string, sourceLabel: string) {
  return `${mappedSlug}::${importDate}::${sourceLabel.toLowerCase()}`;
}

function resolveSourceLabel(rowSource: string, fallbackSource: string | null, sourceType: MarketDataImportSourceType) {
  const explicit = cleanString(rowSource, 240) || cleanString(fallbackSource, 240);
  if (explicit) {
    return explicit;
  }

  if (sourceType === "google_sheet") {
    return "google_sheet_import";
  }

  if (sourceType === "yahoo_finance") {
    return "yahoo_finance_import";
  }

  if (sourceType === "provider_api") {
    return "provider_api_import";
  }

  return "manual_csv_upload";
}

function createBatchSummary(input: {
  type: MarketDataImportType;
  rowCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
}) {
  return `${input.type} import processed ${input.rowCount} rows with ${input.successCount} imported, ${input.skippedCount} skipped, and ${input.failureCount} failed.`;
}

function getErrorMessage(error: unknown, fallback = "Unknown import failure.") {
  return error instanceof Error ? error.message : fallback;
}

function getMarketDataImportTemplate(type: MarketDataImportType) {
  return marketDataImportTemplates[type];
}

export function listMarketDataImportTemplates() {
  return supportedMarketDataImportTypes.map((type) => getMarketDataImportTemplate(type));
}

export function getMarketDataImportSampleCsv(type: MarketDataImportType) {
  return getMarketDataImportTemplate(type).sampleCsv;
}

export function buildMarketDataImportCsvTextFromRows(
  type: MarketDataImportType,
  rows: Array<Pick<MarketDataImportRow, "payload">>,
) {
  const template = getMarketDataImportTemplate(type);
  const csvRows = [
    template.headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) =>
      template.headers
        .map((header) => {
          const value = cleanString(row.payload[header], 4000);
          return escapeCsvCell(value);
        })
        .join(","),
    ),
  ];

  return csvRows.join("\n");
}

async function loadMarketDataLookups() {
  const [stocks, funds, indexSnapshots, store, sourceEntryStore] = await Promise.all([
    getStocks(),
    getFunds(),
    getIndexSnapshots(),
    getAdminOperatorStore(),
    getSourceEntryStore(),
  ]);

  const stockBySymbol = new Map<string, StockLookupEntry>();
  const stockBySlug = new Map<string, StockLookupEntry>();
  for (const stock of stocks) {
    const entry = {
      slug: stock.slug,
      label: stock.name,
      symbol: stock.symbol,
    };
    setPreferredStockLookupEntry(stockBySlug, stock.slug, entry);
    setPreferredStockLookupEntry(stockBySymbol, normalizeUpper(stock.symbol), entry);
  }

  for (const entry of sourceEntryStore.stockCloseEntries) {
    const normalizedSlug = normalizeLower(entry.slug);
    const normalizedSymbol = normalizeUpper(entry.symbol);
    if (!normalizedSlug || !normalizedSymbol) {
      continue;
    }

    const lookupEntry = {
      slug: normalizedSlug,
      label: entry.companyName,
      symbol: normalizedSymbol,
    };
    setPreferredStockLookupEntry(stockBySlug, normalizedSlug, lookupEntry);
    setPreferredStockLookupEntry(stockBySymbol, normalizedSymbol, lookupEntry);
  }

  for (const record of store.records.filter((item) => item.family === "stocks")) {
    const symbol =
      cleanString(record.sections.identity?.values.symbol, 80) ||
      cleanString(record.symbol, 80);
    const entry = {
      slug: record.slug,
      label: record.title,
      symbol: symbol || record.slug.toUpperCase(),
    };
    setPreferredStockLookupEntry(stockBySlug, record.slug, entry);
    if (symbol) {
      setPreferredStockLookupEntry(stockBySymbol, normalizeUpper(symbol), entry);
    }
  }

  const benchmarkBySlug = new Map<string, BenchmarkLookupEntry>();
  const benchmarkAliasMap = new Map<string, BenchmarkLookupEntry>();
  const trackedBenchmarkSet = new Set<string>(TRACKED_INDEX_SLUGS);
  for (const index of indexSnapshots) {
    if (!trackedBenchmarkSet.has(index.slug)) {
      continue;
    }

    const entry = {
      slug: index.slug,
      label: index.title,
    };
    benchmarkBySlug.set(index.slug, entry);
    benchmarkAliasMap.set(index.slug, entry);
    benchmarkAliasMap.set(normalizeBenchmarkSlug(index.slug), entry);
    benchmarkAliasMap.set(normalizeBenchmarkSlug(index.title), entry);
  }

  for (const slug of TRACKED_INDEX_SLUGS) {
    if (benchmarkAliasMap.has(slug)) {
      continue;
    }
    const entry = {
      slug,
      label: slug.toUpperCase(),
    };
    benchmarkBySlug.set(slug, entry);
    benchmarkAliasMap.set(slug, entry);
    benchmarkAliasMap.set(normalizeBenchmarkSlug(slug), entry);
  }

  const fundBySchemeCode = new Map<string, FundLookupEntry>();
  for (const fund of funds) {
    const identifiers = buildFundIdentifierAliases(fund.slug, fund.name);
    for (const identifier of identifiers) {
      fundBySchemeCode.set(identifier, {
        slug: fund.slug,
        label: fund.name,
        identifier: fund.slug,
      });
    }
  }

  for (const entry of sourceEntryStore.fundNavEntries) {
    const identifiers = buildFundIdentifierAliases(entry.slug, entry.fundName);
    for (const identifier of identifiers) {
      if (fundBySchemeCode.has(identifier)) {
        continue;
      }

      fundBySchemeCode.set(identifier, {
        slug: entry.slug,
        label: entry.fundName,
        identifier: entry.slug,
      });
    }
  }

  for (const record of store.records.filter((item) => item.family === "mutual-funds")) {
    const schemeCode = cleanString(record.sourceRowId, 160) || null;
    const identifiers = buildFundIdentifierAliases(
      record.sourceRowId,
      record.slug,
      record.title,
    );
    for (const identifier of identifiers) {
      if (!identifier) {
        continue;
      }

      fundBySchemeCode.set(identifier, {
        slug: record.slug,
        label: record.title,
        identifier: schemeCode || record.slug,
      });
    }
  }

  return {
    stockBySymbol,
    stockBySlug,
    benchmarkBySlug,
    benchmarkAliasMap,
    fundBySchemeCode,
  };
}

function mapHeaders(
  headers: string[],
  template: MarketDataImportTemplate,
): { columnMapping: Record<string, string>; missingColumns: string[] } {
  const mapping: Record<string, string> = {};

  for (const column of template.columns) {
    const matchedHeader = guessCsvHeader(headers, [column.key, ...column.aliases], "");
    if (matchedHeader) {
      mapping[column.key] = matchedHeader;
    }
  }

  const missingColumns = template.columns
    .filter((column) => column.required && !mapping[column.key])
    .map((column) => column.label);

  return {
    columnMapping: mapping,
    missingColumns,
  };
}

async function loadExistingDateLookup(
  type: MarketDataImportType,
  requestedKeys: Array<{ mappedSlug: string; importDate: string; sourceLabel: string }>,
) {
  ensureMarketDataImportReady();
  const supabase = createSupabaseAdminClient();
  const lookup: ExistingDateLookup = new Map();

  if (!requestedKeys.length) {
    return lookup;
  }

  const uniqueSlugs = Array.from(new Set(requestedKeys.map((item) => item.mappedSlug)));

  if (type === "stock_ohlcv") {
    const { data, error } = await supabase
      .from("stock_ohlcv_history")
      .select("slug, bar_time, source_label")
      .eq("timeframe", "1D")
      .in("slug", uniqueSlugs);

    if (error) {
      throw new Error(`Could not read existing stock OHLCV rows: ${error.message}`);
    }

    for (const row of data ?? []) {
      const date = cleanString(row.bar_time, 120).slice(0, 10);
      const key = formatRowKey(cleanString(row.slug, 160), date, cleanString(row.source_label, 240));
      if (!lookup.has(key)) {
        lookup.set(key, new Set());
      }
      lookup.get(key)?.add(date);
    }

    return lookup;
  }

  if (type === "benchmark_ohlcv") {
    const { data, error } = await supabase
      .from("benchmark_ohlcv_history")
      .select("index_slug, date, source_label")
      .in("index_slug", uniqueSlugs);

    if (error) {
      throw new Error(`Could not read existing benchmark OHLCV rows: ${error.message}`);
    }

    for (const row of data ?? []) {
      const date = cleanString(row.date, 120).slice(0, 10);
      const key = formatRowKey(
        cleanString(row.index_slug, 160),
        date,
        cleanString(row.source_label, 240),
      );
      if (!lookup.has(key)) {
        lookup.set(key, new Set());
      }
      lookup.get(key)?.add(date);
    }

    return lookup;
  }

  const { data, error } = await supabase
    .from("fund_nav_history")
    .select("slug, nav_date, source_label")
    .in("slug", uniqueSlugs);

  if (error) {
    throw new Error(`Could not read existing fund NAV rows: ${error.message}`);
  }

  for (const row of data ?? []) {
    const date = cleanString(row.nav_date, 120).slice(0, 10);
    const key = formatRowKey(cleanString(row.slug, 160), date, cleanString(row.source_label, 240));
    if (!lookup.has(key)) {
      lookup.set(key, new Set());
    }
    lookup.get(key)?.add(date);
  }

  return lookup;
}

async function assertDurableImportTrackingReady() {
  ensureMarketDataImportReady();
  const supabase = createSupabaseAdminClient();
  const checks = [
    { table: "market_data_import_batches", query: () => supabase.from("market_data_import_batches").select("id").limit(1) },
    { table: "market_data_import_rows", query: () => supabase.from("market_data_import_rows").select("id").limit(1) },
  ] as const;

  for (const { table, query } of checks) {
    const { error } = await query();
    if (error) {
      throw new Error(
        formatSupabaseErrorMessage(
          `Durable market-data import tracking is unavailable because "${table}" is not queryable.`,
          error,
        ),
      );
    }
  }
}

function createPreviewRow(input: {
  batchId?: string;
  rowNumber: number;
  identifier: string | null;
  mappedSlug: string | null;
  mappedLabel: string | null;
  importDate: string | null;
  payload: Record<string, string>;
  warnings: string[];
  errors: string[];
  duplicateState: MarketDataImportDuplicateState;
}): MarketDataImportRow {
  const createdAt = new Date().toISOString();
  const status: MarketDataImportRowStatus = input.errors.length
    ? "failed"
    : input.warnings.length
      ? "warning"
      : "valid";

  let resultNote = "Ready to import.";
  if (status === "failed") {
    resultNote = "This row has blocking issues and will not be imported.";
  } else if (input.duplicateState === "existing_duplicate") {
    resultNote = "This row matches an existing durable date and will follow the selected duplicate mode.";
  } else if (input.duplicateState === "csv_duplicate") {
    resultNote = "This row duplicates another row in the uploaded file.";
  } else if (status === "warning") {
    resultNote = "This row can be imported, but it needs attention.";
  }

  return {
    id: randomUUID(),
    batchId: input.batchId ?? "",
    rowNumber: input.rowNumber,
    identifier: input.identifier,
    mappedSlug: input.mappedSlug,
    mappedLabel: input.mappedLabel,
    importDate: input.importDate,
    status,
    duplicateState: input.duplicateState,
    warnings: input.warnings,
    errors: input.errors,
    payload: input.payload,
    resultNote,
    createdAt,
    updatedAt: createdAt,
  };
}

function countWeekdaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }

  let cursor = new Date(start);
  let weekdays = 0;
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (cursor <= end && day !== 0 && day !== 6) {
      weekdays += 1;
    }
  }

  return weekdays;
}

function ensurePreviewWarning(row: MarketDataImportRow, warning: string) {
  if (!warning || row.warnings.includes(warning)) {
    return;
  }

  row.warnings = [...row.warnings, warning];
  if (row.status === "valid") {
    row.status = "warning";
    row.resultNote = "This row can be imported, but it needs attention.";
  }
}

export async function previewMarketDataImport(input: MarketDataPreviewInput): Promise<MarketDataImportPreview> {
  if (!isMarketDataImportType(input.type)) {
    throw new Error("Choose a supported market-data import type.");
  }

  const template = getMarketDataImportTemplate(input.type);
  const parsed = parseCsvText(input.csvText);
  const { columnMapping, missingColumns } = mapHeaders(parsed.headers, template);
  const sourceLabel = cleanString(input.sourceLabel, 240) || null;
  const sourceUrl = cleanString(input.sourceUrl, 400) || null;
  const lookups = await loadMarketDataLookups();

  const requestedExistingKeys: Array<{
    mappedSlug: string;
    importDate: string;
    sourceLabel: string;
  }> = [];

  const pendingRows = parsed.rows.map((rawRow, index) => {
    const payload = Object.fromEntries(
      template.columns.map((column) => [column.key, cleanString(rawRow[columnMapping[column.key]], 4000)]),
    );

    const warnings: string[] = [];
    const errors: string[] = [];

    if (missingColumns.length) {
      errors.push(`Missing required columns: ${missingColumns.join(", ")}.`);
    }

    const importDate = normalizeDate(payload.date);
    if (!importDate) {
      errors.push("Date must be a valid YYYY-MM-DD value.");
    }

    let identifier: string | null = null;
    let mappedSlug: string | null = null;
    let mappedLabel: string | null = null;

    if (input.type === "stock_ohlcv") {
      const symbol = normalizeUpper(payload.symbol);
      identifier = symbol || null;
      if (!symbol) {
        errors.push("Symbol is required.");
      } else {
        const match = lookups.stockBySymbol.get(symbol) ?? lookups.stockBySlug.get(normalizeLower(symbol));
        if (!match) {
          errors.push(`No existing stock mapping was found for symbol "${payload.symbol}".`);
        } else {
          mappedSlug = match.slug;
          mappedLabel = match.label;
        }
      }
    } else if (input.type === "benchmark_ohlcv") {
      const benchmarkSlug = cleanString(payload.benchmark_slug, 160);
      identifier = benchmarkSlug || null;
      if (!benchmarkSlug) {
        errors.push("Benchmark slug is required.");
      } else {
        const match =
          lookups.benchmarkAliasMap.get(normalizeBenchmarkSlug(benchmarkSlug)) ??
          lookups.benchmarkBySlug.get(normalizeLower(benchmarkSlug));
        if (!match) {
          errors.push(`No tracked benchmark mapping was found for "${benchmarkSlug}".`);
        } else {
          mappedSlug = match.slug;
          mappedLabel = match.label;
        }
      }
    } else {
      const schemeCode = normalizeLower(payload.scheme_code);
      identifier = schemeCode || null;
      if (!schemeCode) {
        errors.push("Scheme code is required.");
      } else {
        const match = lookups.fundBySchemeCode.get(schemeCode);
        if (!match) {
          errors.push(
            `No existing mutual fund mapping was found for scheme code "${payload.scheme_code}". Current records can use the existing scheme code or the fund source identifier/slug until AMFI mapping is fully connected.`,
          );
        } else {
          mappedSlug = match.slug;
          mappedLabel = match.label;
        }
      }
    }

    if (input.type === "fund_nav") {
      const nav = parseNumeric(payload.nav);
      if (nav === null) {
        errors.push("NAV must be numeric.");
      } else if (nav < 0) {
        errors.push("NAV cannot be negative.");
      }
    } else {
      const open = parseNumeric(payload.open);
      const high = parseNumeric(payload.high);
      const low = parseNumeric(payload.low);
      const close = parseNumeric(payload.close);

      if (open === null) errors.push("Open must be numeric.");
      if (high === null) errors.push("High must be numeric.");
      if (low === null) errors.push("Low must be numeric.");
      if (close === null) errors.push("Close must be numeric.");

      for (const [label, value] of [
        ["Open", open],
        ["High", high],
        ["Low", low],
        ["Close", close],
      ] as const) {
        if (value !== null && value < 0) {
          errors.push(`${label} cannot be negative.`);
        }
      }

      const volume = parseNumeric(payload.volume);
      if (!cleanString(payload.volume)) {
        warnings.push("Volume is missing and should be verified.");
      } else if (volume === null) {
        errors.push("Volume must be numeric when provided.");
      } else if (volume !== null && volume < 0) {
        warnings.push("Volume is negative and should be verified.");
      }

      if (open !== null && high !== null && low !== null && (open > high || open < low)) {
        warnings.push("Open is outside the high/low range.");
      }

      if (close !== null && high !== null && low !== null && (close > high || close < low)) {
        warnings.push("Close is outside the high/low range.");
      }
    }

    if (!columnMapping.source && !cleanString(payload.source)) {
      warnings.push("Source column is missing, so the inferred source label will be used.");
    }

    if (importDate && importDate > new Date().toISOString().slice(0, 10)) {
      warnings.push("This row is future-dated compared with today.");
    }

    const resolvedSourceLabel = resolveSourceLabel(payload.source, sourceLabel, input.sourceType);
    if (mappedSlug && importDate) {
      requestedExistingKeys.push({
        mappedSlug,
        importDate,
        sourceLabel: resolvedSourceLabel,
      });
    }

    return {
      payload,
      warnings,
      errors,
      identifier,
      mappedSlug,
      mappedLabel,
      importDate,
      resolvedSourceLabel,
      rowNumber: index + 2,
    };
  });

  const existingLookup = await loadExistingDateLookup(input.type, requestedExistingKeys);
  const seenUploadKeys = new Set<string>();

  const rows = pendingRows.map((row) => {
    const warnings = [...row.warnings];
    const errors = [...row.errors];
    let duplicateState: MarketDataImportDuplicateState = "none";

    if (row.mappedSlug && row.importDate) {
      const key = formatRowKey(row.mappedSlug, row.importDate, row.resolvedSourceLabel);
      if (seenUploadKeys.has(key)) {
        duplicateState = "csv_duplicate";
        errors.push("Duplicate row found inside the uploaded file for the same asset and date.");
      } else {
        seenUploadKeys.add(key);
      }

      if (existingLookup.has(key)) {
        duplicateState = duplicateState === "csv_duplicate" ? "csv_duplicate" : "existing_duplicate";
        warnings.push(
          input.duplicateMode === "skip_existing_dates"
            ? "A durable row already exists for this date and will be skipped during import."
            : "A durable row already exists for this date and will be replaced during import.",
        );
      }
    }

    return createPreviewRow({
      rowNumber: row.rowNumber,
      identifier: row.identifier,
      mappedSlug: row.mappedSlug,
      mappedLabel: row.mappedLabel,
      importDate: row.importDate,
      payload: {
        ...row.payload,
        source: row.resolvedSourceLabel,
      },
      warnings,
      errors,
      duplicateState,
    });
  });

  const rowsByAsset = new Map<string, MarketDataImportRow[]>();
  for (const row of rows) {
    if (!row.mappedSlug || !row.importDate || row.status === "failed") {
      continue;
    }
    const key = `${row.mappedSlug}::${cleanString(row.payload.source, 240)}`;
    const current = rowsByAsset.get(key) ?? [];
    current.push(row);
    rowsByAsset.set(key, current);
  }

  for (const groupRows of rowsByAsset.values()) {
    const sorted = [...groupRows].sort((left, right) =>
      cleanString(left.importDate, 120).localeCompare(cleanString(right.importDate, 120)),
    );
    let previousClose: number | null = null;
    let previousDate: string | null = null;

    for (const row of sorted) {
      const closeValue =
        input.type === "fund_nav" ? parseNumeric(row.payload.nav) : parseNumeric(row.payload.close);

      if (previousClose !== null && closeValue !== null && previousClose > 0) {
        const percentJump = Math.abs(((closeValue - previousClose) / previousClose) * 100);
        if (percentJump > 20) {
          ensurePreviewWarning(
            row,
            `Price moved ${percentJump.toFixed(1)}% versus the previous imported row and should be reviewed.`,
          );
        }
      }

      if (previousDate && row.importDate) {
        const weekdayGap = countWeekdaysBetween(previousDate, row.importDate);
        if (weekdayGap > 5) {
          ensurePreviewWarning(
            row,
            `There is a gap of ${weekdayGap} trading weekdays since the previous imported row.`,
          );
        }
      }

      if (closeValue !== null) {
        previousClose = closeValue;
      }
      if (row.importDate) {
        previousDate = row.importDate;
      }
    }
  }

  const validRows = rows.filter((row) => row.status === "valid").length;
  const warningRows = rows.filter((row) => row.status === "warning").length;
  const failedRows = rows.filter((row) => row.status === "failed").length;
  const duplicateRows = rows.filter((row) => row.duplicateState !== "none").length;

  return {
    type: input.type,
    fileName: input.fileName,
    executionMode: input.executionMode,
    duplicateMode: input.duplicateMode,
    sourceType: input.sourceType,
    sourceLabel,
    sourceUrl,
    template,
    columnMapping,
    missingColumns,
    rows,
    totalRows: rows.length,
    validRows,
    warningRows,
    failedRows,
    duplicateRows,
    canImport: rows.some((row) => row.status !== "failed"),
  };
}

async function prepareGoogleSheetMarketDataImportInput(
  input: Omit<GoogleSheetMarketDataIngestionInput, "mode">,
): Promise<MarketDataPreviewInput | ExecuteMarketDataImportInput> {
  const fetched = await fetchGoogleSheetCsvText(input.googleSheetUrl);
  const baseInput = {
    type: input.type,
    csvText: fetched.csvText,
    fileName:
      cleanString(input.fileName, 240) ||
      `${input.type}-${fetched.spreadsheetId}-${fetched.gid}.csv`,
    executionMode: input.executionMode,
    duplicateMode: input.duplicateMode,
    sourceType: "google_sheet" as const,
    sourceLabel: cleanString(input.sourceLabel, 240) || null,
    sourceUrl: cleanString(input.sourceUrl, 400) || input.googleSheetUrl,
  };

  if ("actorEmail" in input && typeof input.actorEmail === "string") {
    return {
      ...baseInput,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail,
      simulateFinalBatchUpdateFailure: input.simulateFinalBatchUpdateFailure,
    };
  }

  return baseInput;
}

async function prepareYahooFinanceMarketDataImportInput(
  input: Omit<YahooFinanceMarketDataIngestionInput, "mode">,
): Promise<MarketDataPreviewInput | ExecuteMarketDataImportInput> {
  const fetched = await fetchYahooFinanceChartCsv(input.yahooSymbol);
  const baseInput = {
    type: "stock_ohlcv" as const,
    csvText: fetched.csvText,
    fileName:
      cleanString(input.fileName, 240) ||
      `${fetched.lookupSymbol}-${fetched.importDate}-yahoo-finance.csv`,
    executionMode: input.executionMode,
    duplicateMode: input.duplicateMode,
    sourceType: "yahoo_finance" as const,
    sourceLabel: cleanString(input.sourceLabel, 240) || null,
    sourceUrl: cleanString(input.sourceUrl, 400) || fetched.queryUrl,
  };

  if ("actorEmail" in input && typeof input.actorEmail === "string") {
    return {
      ...baseInput,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail,
      simulateFinalBatchUpdateFailure: input.simulateFinalBatchUpdateFailure,
    };
  }

  return baseInput;
}

async function prepareProviderApiMarketDataImportInput(
  input: Omit<ProviderApiMarketDataIngestionInput, "mode">,
): Promise<MarketDataPreviewInput | ExecuteMarketDataImportInput> {
  const sourceUrl = cleanString(input.sourceUrl, 2000);
  if (!sourceUrl) {
    throw new Error("Provider API ingestion needs a fetchable source URL.");
  }

  const csvText = await fetchRemoteText(sourceUrl, "Provider API fetch");
  const baseInput = {
    type: input.type,
    csvText,
    fileName: cleanString(input.fileName, 240) || `${input.type}-provider-api.csv`,
    executionMode: input.executionMode,
    duplicateMode: input.duplicateMode,
    sourceType: "provider_api" as const,
    sourceLabel: cleanString(input.sourceLabel, 240) || null,
    sourceUrl,
  };

  if ("actorEmail" in input && typeof input.actorEmail === "string") {
    return {
      ...baseInput,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail,
      simulateFinalBatchUpdateFailure: input.simulateFinalBatchUpdateFailure,
    };
  }

  return baseInput;
}

export async function runMarketDataIngestion(
  sourceType: MarketDataImportSourceType,
  config:
    | ManualCsvMarketDataIngestionInput
    | GoogleSheetMarketDataIngestionInput
    | YahooFinanceMarketDataIngestionInput
    | ProviderApiMarketDataIngestionInput,
): Promise<MarketDataImportPreview | ExecuteMarketDataImportResult> {
  if (sourceType === "manual_csv") {
    const manualConfig = config as ManualCsvMarketDataIngestionInput;
    if (manualConfig.mode === "preview") {
      return previewMarketDataImport(manualConfig);
    }

    return executeMarketDataImport(manualConfig);
  }

  if (sourceType === "google_sheet") {
    const googleSheetConfig = config as GoogleSheetMarketDataIngestionInput;
    const prepared = await prepareGoogleSheetMarketDataImportInput(googleSheetConfig);
    if (googleSheetConfig.mode === "preview") {
      return previewMarketDataImport(prepared as MarketDataPreviewInput);
    }

    return executeMarketDataImport(prepared as ExecuteMarketDataImportInput);
  }

  if (sourceType === "yahoo_finance") {
    const yahooConfig = config as YahooFinanceMarketDataIngestionInput;
    const prepared = await prepareYahooFinanceMarketDataImportInput(yahooConfig);
    if (yahooConfig.mode === "preview") {
      return previewMarketDataImport(prepared as MarketDataPreviewInput);
    }

    return executeMarketDataImport(prepared as ExecuteMarketDataImportInput);
  }

  if (sourceType === "provider_api") {
    const providerConfig = config as ProviderApiMarketDataIngestionInput;
    const prepared = await prepareProviderApiMarketDataImportInput(providerConfig);
    if (providerConfig.mode === "preview") {
      return previewMarketDataImport(prepared as MarketDataPreviewInput);
    }

    return executeMarketDataImport(prepared as ExecuteMarketDataImportInput);
  }

  throw new Error(`Unsupported market-data ingestion source type: ${sourceType}`);
}

function normalizeBatchRow(value: Record<string, unknown>): MarketDataImportBatch {
  return {
    id: cleanString(value.id, 160),
    dataType: cleanString(value.data_type, 120) as MarketDataImportType,
    executionMode: cleanString(value.execution_mode, 120) as MarketDataImportExecutionMode,
    duplicateMode: cleanString(value.duplicate_mode, 120) as MarketDataImportDuplicateMode,
    status: cleanString(value.status, 120) as MarketDataImportBatchStatus,
    sourceType: cleanString(value.source_type, 120) as MarketDataImportSourceType,
    sourceLabel: cleanString(value.source_label, 240) || null,
    sourceUrl: cleanString(value.source_url, 400) || null,
    fileName: cleanString(value.file_name, 240),
    actorUserId: cleanString(value.actor_user_id, 160) || null,
    actorEmail: cleanString(value.actor_email, 240),
    importedBy: cleanString(value.imported_by, 240),
    importedAt: cleanString(value.imported_at, 120),
    rowCount: Number(value.row_count ?? 0) || 0,
    validRows: Number(value.valid_rows ?? 0) || 0,
    warningRows: Number(value.warning_rows ?? 0) || 0,
    failedRows: Number(value.failed_rows ?? 0) || 0,
    duplicateRows: Number(value.duplicate_rows ?? 0) || 0,
    successCount: Number(value.success_count ?? 0) || 0,
    failureCount: Number(value.failure_count ?? 0) || 0,
    skippedCount: Number(value.skipped_count ?? 0) || 0,
    summary: cleanString(value.summary, 4000),
    metadata:
      value.metadata && typeof value.metadata === "object"
        ? (value.metadata as Record<string, unknown>)
        : {},
    createdAt: cleanString(value.created_at, 120),
    updatedAt: cleanString(value.updated_at, 120),
  };
}

function normalizeImportRow(value: Record<string, unknown>): MarketDataImportRow {
  const payloadSource =
    value.payload && typeof value.payload === "object"
      ? (value.payload as Record<string, unknown>)
      : value.raw_row && typeof value.raw_row === "object"
        ? (value.raw_row as Record<string, unknown>)
        : {};

  return {
    id: cleanString(value.id, 160),
    batchId: cleanString(value.batch_id, 160),
    rowNumber: Number(value.row_number ?? 0) || 0,
    identifier:
      cleanString(value.identifier, 240) ||
      cleanString(value.source_key, 240) ||
      cleanString(value.symbol, 240) ||
      cleanString(value.scheme_code, 240) ||
      cleanString(value.benchmark_slug, 240) ||
      null,
    mappedSlug: cleanString(value.mapped_slug, 160) || null,
    mappedLabel: cleanString(value.mapped_label, 240) || null,
    importDate:
      cleanString(value.import_date, 120) ||
      cleanString(value.trade_date, 120) ||
      cleanString(value.date, 120) ||
      null,
    status: cleanString(value.status || value.row_status, 120) as MarketDataImportRowStatus,
    duplicateState: cleanString(value.duplicate_state, 120) as MarketDataImportDuplicateState,
    warnings: Array.isArray(value.warnings)
      ? value.warnings.map((item) => cleanString(item, 4000)).filter(Boolean)
      : [],
    errors: Array.isArray(value.errors)
      ? value.errors.map((item) => cleanString(item, 4000)).filter(Boolean)
      : [],
    payload: Object.fromEntries(
      Object.entries(payloadSource).map(([key, payloadValue]) => [
        key,
        cleanString(payloadValue, 4000),
      ]),
    ),
    resultNote: cleanString(value.result_note, 4000),
    createdAt: cleanString(value.created_at, 120),
    updatedAt: cleanString(value.updated_at, 120),
  };
}

async function saveDurableMarketDataImportBatch(batch: MarketDataImportBatch) {
  ensureMarketDataImportReady();
  const supabase = createSupabaseAdminClient();
  const completedAt =
    batch.status === "importing" ? null : batch.updatedAt || batch.importedAt || new Date().toISOString();
  const { data, error } = await supabase
    .from("market_data_import_batches")
    .upsert(
      {
        id: batch.id,
        data_type: batch.dataType,
        import_type: batch.dataType,
        execution_mode: batch.executionMode,
        import_mode: batch.executionMode,
        duplicate_mode: batch.duplicateMode,
        duplicate_strategy: batch.duplicateMode,
        status: batch.status,
        source_type: batch.sourceType,
        source_label: batch.sourceLabel,
        source_url: batch.sourceUrl,
        file_name: batch.fileName,
        actor_user_id: batch.actorUserId,
        actor_email: batch.actorEmail,
        imported_by: batch.importedBy,
        imported_at: batch.importedAt,
        started_at: batch.importedAt,
        completed_at: completedAt,
        row_count: batch.rowCount,
        total_rows: batch.rowCount,
        valid_rows: batch.validRows,
        warning_rows: batch.warningRows,
        warning_count: batch.warningRows,
        failed_rows: batch.failedRows,
        error_count: batch.failedRows,
        duplicate_rows: batch.duplicateRows,
        success_count: batch.successCount,
        failure_count: batch.failureCount,
        skipped_count: batch.skippedCount,
        summary: batch.summary,
        metadata: batch.metadata,
        created_at: batch.createdAt,
        updated_at: batch.updatedAt,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Could not save market-data import batch.", error),
    );
  }

  return normalizeBatchRow((data ?? {}) as Record<string, unknown>);
}

function buildMarketDataImportRowCompatibilityPayload(
  batch: Pick<MarketDataImportBatch, "id" | "dataType">,
  row: MarketDataImportRow,
) {
  const symbol =
    batch.dataType === "stock_ohlcv"
      ? cleanString(row.payload.symbol || row.identifier, 160) || null
      : null;
  const schemeCode =
    batch.dataType === "fund_nav"
      ? cleanString(row.payload.scheme_code || row.identifier, 160) || null
      : null;
  const benchmarkSlug =
    batch.dataType === "benchmark_ohlcv"
      ? cleanString(row.payload.benchmark_slug || row.identifier, 160) || null
      : null;
  const sourceKey = cleanString(
    row.identifier || symbol || schemeCode || benchmarkSlug,
    240,
  ) || null;
  const targetKey = cleanString(
    row.mappedSlug
      ? row.importDate
        ? `${row.mappedSlug}:${row.importDate}`
        : row.mappedSlug
      : "",
    240,
  ) || null;

  return {
    data_type: batch.dataType,
    import_type: batch.dataType,
    row_status: row.status,
    source_key: sourceKey,
    target_key: targetKey,
    trade_date: row.importDate,
    date: row.importDate,
    symbol,
    scheme_code: schemeCode,
    benchmark_slug: benchmarkSlug,
    index_slug: benchmarkSlug,
    raw_row: row.payload,
    normalized_row: {
      dataType: batch.dataType,
      importType: batch.dataType,
      rowStatus: row.status,
      sourceKey,
      targetKey,
      tradeDate: row.importDate,
      symbol,
      schemeCode,
      benchmarkSlug,
      identifier: row.identifier,
      mappedSlug: row.mappedSlug,
      mappedLabel: row.mappedLabel,
      importDate: row.importDate,
      duplicateState: row.duplicateState,
      payload: row.payload,
    },
  };
}

async function replaceDurableMarketDataImportRows(
  batch: Pick<MarketDataImportBatch, "id" | "dataType">,
  rows: MarketDataImportRow[],
) {
  ensureMarketDataImportReady();
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("market_data_import_rows")
    .delete()
    .eq("batch_id", batch.id);

  if (deleteError) {
    throw new Error(
      formatSupabaseErrorMessage("Could not clear market-data import rows.", deleteError),
    );
  }

  if (!rows.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("market_data_import_rows")
    .insert(
      rows.map((row) => ({
        id: row.id,
        batch_id: batch.id,
        row_number: row.rowNumber,
        identifier: row.identifier,
        mapped_slug: row.mappedSlug,
        mapped_label: row.mappedLabel,
        import_date: row.importDate,
        status: row.status,
        duplicate_state: row.duplicateState,
        warnings: row.warnings,
        errors: row.errors,
        payload: row.payload,
        result_note: row.resultNote,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        ...buildMarketDataImportRowCompatibilityPayload(batch, row),
      })),
    )
    .select("*");

  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Could not save market-data import rows.", error),
    );
  }

  return (data ?? []).map((row) => normalizeImportRow(row as Record<string, unknown>));
}

export async function listMarketDataImportBatches(
  type: MarketDataImportType | null = null,
  limit = 8,
) {
  ensureMarketDataImportReady();
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("market_data_import_batches")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq("data_type", type);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(
      formatSupabaseErrorMessage("Could not load market-data import batches.", error),
    );
  }

  return (data ?? []).map((row) => normalizeBatchRow(row as Record<string, unknown>));
}

export async function getMarketDataImportBatchDetails(batchId: string) {
  ensureMarketDataImportReady();
  const supabase = createSupabaseAdminClient();
  const [{ data: batchData, error: batchError }, { data: rowData, error: rowError }] =
    await Promise.all([
      supabase.from("market_data_import_batches").select("*").eq("id", batchId).maybeSingle(),
      supabase
        .from("market_data_import_rows")
        .select("*")
        .eq("batch_id", batchId)
        .order("row_number", { ascending: true }),
    ]);

  if (batchError) {
    throw new Error(
      formatSupabaseErrorMessage("Could not load market-data import batch.", batchError),
    );
  }

  if (rowError) {
    throw new Error(
      formatSupabaseErrorMessage("Could not load market-data import rows.", rowError),
    );
  }

  if (!batchData) {
    return null;
  }

  return {
    batch: normalizeBatchRow(batchData as Record<string, unknown>),
    rows: (rowData ?? []).map((row) => normalizeImportRow(row as Record<string, unknown>)),
  };
}

function toCandleRow(row: MarketDataImportRow) {
  const volume = parseNumeric(row.payload.volume);
  return {
    time: row.importDate!,
    open: parseNumeric(row.payload.open) ?? 0,
    high: parseNumeric(row.payload.high) ?? 0,
    low: parseNumeric(row.payload.low) ?? 0,
    close: parseNumeric(row.payload.close) ?? 0,
    ...(volume === null ? {} : { volume }),
  };
}

function toFundNavRow(row: MarketDataImportRow) {
  return {
    navDate: row.importDate!,
    nav: parseNumeric(row.payload.nav) ?? 0,
    returns1Y: null,
  };
}

export async function executeMarketDataImport(
  input: ExecuteMarketDataImportInput,
): Promise<ExecuteMarketDataImportResult> {
  await assertDurableImportTrackingReady();
  const preview = await previewMarketDataImport(input);
  const now = new Date().toISOString();

  const batchSeed: MarketDataImportBatch = {
    id: randomUUID(),
    dataType: input.type,
    executionMode: input.executionMode,
    duplicateMode: input.duplicateMode,
    status: input.executionMode === "validate_only" ? "preview_ready" : "importing",
    sourceType: input.sourceType,
    sourceLabel: cleanString(input.sourceLabel, 240) || null,
    sourceUrl: cleanString(input.sourceUrl, 400) || null,
    fileName: input.fileName,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    importedBy: input.actorEmail,
    importedAt: now,
    rowCount: preview.totalRows,
    validRows: preview.validRows,
    warningRows: preview.warningRows,
    failedRows: preview.failedRows,
    duplicateRows: preview.duplicateRows,
    successCount: 0,
    failureCount: preview.failedRows,
    skippedCount: 0,
    summary: "",
    metadata: {
      sourceCopy: preview.template.sourceCopy,
      columnMapping: preview.columnMapping,
      missingColumns: preview.missingColumns,
    },
    createdAt: now,
    updatedAt: now,
  };

  if (input.executionMode === "validate_only") {
    const previewBatch = await saveDurableMarketDataImportBatch({
      ...batchSeed,
      status: "preview_ready",
      summary: `Validated ${preview.totalRows} ${input.type} rows without importing them.`,
    });
    const previewRows = await replaceDurableMarketDataImportRows(
      previewBatch,
      preview.rows.map((row) => ({ ...row, batchId: previewBatch.id })),
    );
    return {
      batch: previewBatch,
      rows: previewRows,
      affectedRoutes: [],
      affectedAssets: [],
      warnings: [],
      persistenceWarnings: [],
    };
  }

  const importableRows = preview.rows.filter((row) => row.status !== "failed");
  const baseMutableRows = preview.rows.map((row) => ({ ...row, batchId: batchSeed.id }));
  if (!importableRows.length) {
    const failedBatch = await saveDurableMarketDataImportBatch({
      ...batchSeed,
      status: "failed",
      failureCount: preview.rows.filter((row) => row.status === "failed").length,
      summary: "No importable rows were found in this file.",
    });
    const failedRows = await replaceDurableMarketDataImportRows(
      failedBatch,
      baseMutableRows.map((row) => ({ ...row, batchId: failedBatch.id })),
    );
    return {
      batch: failedBatch,
      rows: failedRows,
      affectedRoutes: [],
      affectedAssets: [],
      warnings: [],
      persistenceWarnings: [],
    };
  }

  const startedBatch = await saveDurableMarketDataImportBatch({
    ...batchSeed,
    status: "importing",
    failureCount: preview.rows.filter((row) => row.status === "failed").length,
    summary: `Importing ${preview.totalRows} ${input.type} row${preview.totalRows === 1 ? "" : "s"} into durable market-data storage.`,
  });

  const rowsByGroup = new Map<string, MarketDataImportRow[]>();
  const mutableRows = preview.rows.map((row) => ({ ...row, batchId: startedBatch.id }));
  const affectedRoutes = new Set<string>();
  const affectedAssets = new Set<string>();
  const warnings: string[] = [];
  const persistenceWarnings: string[] = [];

  try {
    await replaceDurableMarketDataImportRows(startedBatch, mutableRows);

    for (const row of mutableRows) {
      if (row.status === "failed") {
        continue;
      }

      if (input.duplicateMode === "skip_existing_dates" && row.duplicateState === "existing_duplicate") {
        row.status = "skipped";
        row.resultNote = "Skipped because a durable row already exists for this date.";
        row.updatedAt = new Date().toISOString();
        continue;
      }

      const sourceLabel = resolveSourceLabel(row.payload.source, input.sourceLabel ?? null, input.sourceType);
      const groupKey = `${row.mappedSlug ?? "unknown"}::${sourceLabel}`;
      const current = rowsByGroup.get(groupKey) ?? [];
      row.payload = {
        ...row.payload,
        source: sourceLabel,
      };
      current.push(row);
      rowsByGroup.set(groupKey, current);
    }

    for (const [groupKey, rows] of rowsByGroup.entries()) {
      const [mappedSlug, sourceLabel] = groupKey.split("::");
      if (!mappedSlug || !rows.length) {
        continue;
      }

      try {
        if (input.type === "stock_ohlcv") {
          await persistStockOhlcvHistory({
            slug: mappedSlug,
            sourceLabel,
            sourceCode: null,
            timeframe: "1D",
            bars: rows.map((row) => toCandleRow(row)),
            lastUpdated: rows[rows.length - 1]?.importDate ?? now,
            ingestMode: "manual_entry" satisfies MarketIngestMode,
            triggerSource: "admin_market_data_import",
            requestedBy: input.actorEmail,
            metadata: {
              batchId: startedBatch.id,
              sourceType: input.sourceType,
              sourceUrl: input.sourceUrl ?? null,
            },
          });
          await refreshLatestStockQuoteFromOhlcvHistory({
            slug: mappedSlug,
            sourceLabel,
            ingestMode: "manual_entry",
            triggerSource: "admin_market_data_import",
            requestedBy: input.actorEmail,
            metadata: {
              batchId: startedBatch.id,
              sourceType: input.sourceType,
            },
          });
          affectedRoutes.add(`/stocks/${mappedSlug}`);
          affectedRoutes.add("/stocks");
          affectedAssets.add(mappedSlug);
        } else if (input.type === "benchmark_ohlcv") {
          await persistBenchmarkOhlcvHistory({
            slug: mappedSlug,
            sourceLabel,
            sourceCode: null,
            timeframe: "1D",
            bars: rows.map((row) => toCandleRow(row)),
            lastUpdated: rows[rows.length - 1]?.importDate ?? now,
            ingestMode: "manual_entry",
            triggerSource: "admin_market_data_import",
            requestedBy: input.actorEmail,
            metadata: {
              batchId: startedBatch.id,
              sourceType: input.sourceType,
              sourceUrl: input.sourceUrl ?? null,
            },
          });
          affectedRoutes.add(`/${mappedSlug}`);
          affectedRoutes.add("/indices");
          affectedAssets.add(mappedSlug);
        } else {
          await persistFundNavSeriesHistory({
            slug: mappedSlug,
            sourceLabel,
            sourceCode: null,
            entries: rows.map((row) => toFundNavRow(row)),
            lastUpdated: rows[rows.length - 1]?.importDate ?? now,
            ingestMode: "manual_entry",
            triggerSource: "admin_market_data_import",
            requestedBy: input.actorEmail,
            metadata: {
              batchId: startedBatch.id,
              sourceType: input.sourceType,
              sourceUrl: input.sourceUrl ?? null,
            },
          });
          affectedRoutes.add(`/mutual-funds/${mappedSlug}`);
          affectedRoutes.add("/mutual-funds");
          affectedAssets.add(mappedSlug);
        }

        for (const row of rows) {
          row.status = "imported";
          row.resultNote = "Imported into durable market-data storage.";
          row.updatedAt = new Date().toISOString();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown import failure.";
        for (const row of rows) {
          row.status = "failed";
          row.errors = [...row.errors, message];
          row.resultNote = "This row failed during durable import.";
          row.updatedAt = new Date().toISOString();
        }
      }
    }

    const successCount = mutableRows.filter((row) => row.status === "imported").length;
    const skippedCount = mutableRows.filter((row) => row.status === "skipped").length;
    const failureCount = mutableRows.filter((row) => row.status === "failed").length;
    if (successCount === 0 && failureCount > 0) {
      const failedSummary = `No ${input.type} rows were imported into durable market-data storage.`;
      try {
        const failedBatch = await saveDurableMarketDataImportBatch({
          ...startedBatch,
          status: "failed",
          successCount,
          skippedCount,
          failureCount,
          failedRows: failureCount,
          summary: failedSummary,
          updatedAt: new Date().toISOString(),
          metadata: {
            ...batchSeed.metadata,
            affectedAssets: Array.from(affectedAssets),
            affectedRoutes: Array.from(affectedRoutes),
          },
        });
        await replaceDurableMarketDataImportRows(failedBatch, mutableRows);
      } catch (finalizationError) {
        console.error(
          "[market-data-import] failed to persist failed import finalization state",
          finalizationError,
        );
      }

      throw new Error(failedSummary);
    }

    const completedStatus: MarketDataImportBatchStatus =
      failureCount > 0 ? "completed_with_errors" : "completed";
    const finalBatchInput: MarketDataImportBatch = {
      ...startedBatch,
      status: completedStatus,
      successCount,
      skippedCount,
      failureCount,
      failedRows: failureCount,
      summary: createBatchSummary({
        type: input.type,
        rowCount: preview.totalRows,
        successCount,
        failureCount,
        skippedCount,
      }),
      updatedAt: new Date().toISOString(),
      metadata: {
        ...batchSeed.metadata,
        affectedAssets: Array.from(affectedAssets),
        affectedRoutes: Array.from(affectedRoutes),
      },
    };

    let finalizedBatch: MarketDataImportBatch = finalBatchInput;
    try {
      if (input.simulateFinalBatchUpdateFailure) {
        throw new Error("Simulated final batch update failure after data writes.");
      }
      finalizedBatch = await saveDurableMarketDataImportBatch(finalBatchInput);
    } catch (finalizationError) {
      const warning = `Batch finalization warning: ${getErrorMessage(
        finalizationError,
        "Could not persist the final batch state after data writes.",
      )}`;
      warnings.push(warning);
      persistenceWarnings.push(warning);
      finalizedBatch = {
        ...finalBatchInput,
        metadata: {
          ...finalBatchInput.metadata,
          finalization_warning: warning,
        },
      };
    }

    let finalizedRows = mutableRows;
    try {
      finalizedRows = await replaceDurableMarketDataImportRows(finalizedBatch, mutableRows);
    } catch (rowFinalizationError) {
      const warning = `Import-row finalization warning: ${getErrorMessage(
        rowFinalizationError,
        "Could not persist final import-row tracking after data writes.",
      )}`;
      warnings.push(warning);
      persistenceWarnings.push(warning);
      finalizedBatch = {
        ...finalizedBatch,
        metadata: {
          ...finalizedBatch.metadata,
          finalization_warning: warning,
        },
      };
    }

    return {
      batch: finalizedBatch,
      rows: finalizedRows,
      affectedRoutes: Array.from(affectedRoutes),
      affectedAssets: Array.from(affectedAssets),
      warnings,
      persistenceWarnings,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    for (const row of mutableRows) {
      if (row.status === "valid" || row.status === "warning") {
        row.status = "failed";
        row.errors = [...row.errors, message];
        row.resultNote = "This row failed before the import batch could complete.";
        row.updatedAt = new Date().toISOString();
      }
    }

    const failureCount = mutableRows.filter((row) => row.status === "failed").length;
    const skippedCount = mutableRows.filter((row) => row.status === "skipped").length;
    const successCount = mutableRows.filter((row) => row.status === "imported").length;

    try {
      const failedBatch = await saveDurableMarketDataImportBatch({
        ...startedBatch,
        status: "failed",
        successCount,
        skippedCount,
        failureCount,
        failedRows: failureCount,
        summary: message,
        updatedAt: new Date().toISOString(),
        metadata: {
          ...batchSeed.metadata,
          affectedAssets: Array.from(affectedAssets),
          affectedRoutes: Array.from(affectedRoutes),
          fatalError: message,
        },
      });
      await replaceDurableMarketDataImportRows(failedBatch, mutableRows);
    } catch (batchError) {
      console.error("[market-data-import] failed to persist failed batch state", batchError);
    }

    throw error;
  }
}
