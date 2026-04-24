import { buildCsvTemplate, parseCsvText, type CsvRow } from "@/lib/csv-import";
import {
  getUserPortfolioHoldings,
  resolveUserPortfolioImportStock,
  saveUserPortfolioHolding,
  type UserPortfolioHoldingView,
} from "@/lib/user-product-store";
import type { User } from "@supabase/supabase-js";

export type PortfolioImportFieldKey = "stock" | "quantity" | "buyPrice" | "buyDate";
export type PortfolioImportRowStatus = "valid" | "warning" | "failed" | "imported";

export type PortfolioImportTemplate = {
  fileName: string;
  help: string[];
  fields: Array<{
    key: PortfolioImportFieldKey;
    label: string;
    required: boolean;
    description: string;
    example: string;
  }>;
  sampleCsv: string;
};

export type PortfolioImportRow = {
  rowNumber: number;
  stockInput: string;
  matchedSlug: string | null;
  matchedSymbol: string | null;
  matchedName: string | null;
  quantity: number | null;
  buyPrice: number | null;
  buyDate: string | null;
  status: PortfolioImportRowStatus;
  warnings: string[];
  errors: string[];
  note: string;
};

export type PortfolioImportPreview = {
  fileName: string;
  fieldMapping: Record<string, PortfolioImportFieldKey>;
  unmappedHeaders: string[];
  availableFields: Array<{ key: PortfolioImportFieldKey; label: string }>;
  rows: PortfolioImportRow[];
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  canImport: boolean;
};

export type ExecutePortfolioImportResult = {
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  rows: PortfolioImportRow[];
  holdings: UserPortfolioHoldingView[];
};

const fieldDefinitions: Array<{
  key: PortfolioImportFieldKey;
  label: string;
  required: boolean;
  description: string;
  example: string;
  aliases: string[];
}> = [
  {
    key: "stock",
    label: "Stock slug or symbol",
    required: true,
    description: "Use the stock slug or symbol already known in the system.",
    example: "tata-motors",
    aliases: ["stock", "stock_slug", "slug", "symbol", "stock_symbol", "ticker"],
  },
  {
    key: "quantity",
    label: "Quantity",
    required: true,
    description: "The number of shares you hold.",
    example: "12",
    aliases: ["quantity", "qty", "shares"],
  },
  {
    key: "buyPrice",
    label: "Buy price",
    required: true,
    description: "Average buy price per share.",
    example: "620",
    aliases: ["buy_price", "buyprice", "average_price", "avg_buy_price", "price"],
  },
  {
    key: "buyDate",
    label: "Buy date",
    required: false,
    description: "Optional buy date for your own reference.",
    example: "2026-04-22",
    aliases: ["buy_date", "buydate", "purchase_date"],
  },
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getPortfolioImportTemplate(): PortfolioImportTemplate {
  const headers = fieldDefinitions.map((field) => field.key);
  return {
    fileName: "portfolio-sample.csv",
    help: [
      "Use a CSV file with one holding per row.",
      "The stock column should match a stock slug or symbol already known in the system.",
      "Quantity and buy price must be positive numbers.",
      "Buy date is optional and only for your own reference right now.",
    ],
    fields: fieldDefinitions.map(({ aliases: _aliases, ...field }) => field),
    sampleCsv: buildCsvTemplate(headers, {
      stock: "tata-motors",
      quantity: "12",
      buyPrice: "620",
      buyDate: "2026-04-22",
    }),
  };
}

function buildFieldMapping(
  headers: string[],
  inputMapping?: Record<string, PortfolioImportFieldKey>,
) {
  const mapping: Record<string, PortfolioImportFieldKey> = {};
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const manual = inputMapping?.[header];
    if (manual && fieldDefinitions.some((field) => field.key === manual)) {
      mapping[header] = manual;
      continue;
    }

    const normalizedHeader = normalizeHeader(header);
    const matchedField = fieldDefinitions.find((field) =>
      field.aliases.some((alias) => normalizeHeader(alias) === normalizedHeader),
    );

    if (matchedField) {
      mapping[header] = matchedField.key;
    } else {
      unmappedHeaders.push(header);
    }
  }

  return {
    mapping,
    unmappedHeaders,
  };
}

function buildPayload(headers: string[], row: CsvRow, fieldMapping: Record<string, PortfolioImportFieldKey>) {
  const payload = {
    stock: "",
    quantity: "",
    buyPrice: "",
    buyDate: "",
  };

  for (const header of headers) {
    const mapped = fieldMapping[header];
    if (!mapped) {
      continue;
    }
    payload[mapped] = String(row[header] ?? "").trim();
  }

  return payload;
}

function parsePositiveNumber(value: string) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : null;
}

export async function previewPortfolioImport(input: {
  csvText: string;
  fileName: string;
  fieldMapping?: Record<string, PortfolioImportFieldKey>;
}): Promise<PortfolioImportPreview> {
  const parsed = parseCsvText(input.csvText);
  const mappingResult = buildFieldMapping(parsed.headers, input.fieldMapping);
  const rows = parsed.rows.map((row, index) => {
    const payload = buildPayload(parsed.headers, row, mappingResult.mapping);
    const errors: string[] = [];
    const warnings: string[] = [];
    const stock = resolveUserPortfolioImportStock(payload.stock);
    const quantity = parsePositiveNumber(payload.quantity);
    const buyPrice = parsePositiveNumber(payload.buyPrice);
    const buyDate = payload.buyDate ? new Date(payload.buyDate) : null;

    if (!stock) {
      errors.push("We could not match the stock column to a known stock slug or symbol.");
    }

    if (quantity === null) {
      errors.push("Quantity must be a positive number.");
    }

    if (buyPrice === null) {
      errors.push("Buy price must be a positive number.");
    }

    if (payload.buyDate && (!buyDate || Number.isNaN(buyDate.getTime()))) {
      errors.push("Buy date must be a valid date.");
    }

    if (payload.buyDate) {
      warnings.push("Buy date is optional and does not change portfolio calculations right now.");
    }

    const status: PortfolioImportRowStatus = errors.length
      ? "failed"
      : warnings.length
        ? "warning"
        : "valid";

    return {
      rowNumber: index + 1,
      stockInput: payload.stock,
      matchedSlug: stock?.slug ?? null,
      matchedSymbol: stock?.symbol ?? null,
      matchedName: stock?.name ?? null,
      quantity,
      buyPrice,
      buyDate: payload.buyDate || null,
      status,
      warnings,
      errors,
      note: errors.length
        ? "This row cannot be imported until the issues are fixed."
        : stock
          ? `This row will import ${stock.name}.`
          : "This row is ready to import.",
    } satisfies PortfolioImportRow;
  });

  return {
    fileName: input.fileName,
    fieldMapping: mappingResult.mapping,
    unmappedHeaders: mappingResult.unmappedHeaders,
    availableFields: fieldDefinitions.map((field) => ({ key: field.key, label: field.label })),
    rows,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "valid").length,
    warningRows: rows.filter((row) => row.status === "warning").length,
    failedRows: rows.filter((row) => row.status === "failed").length,
    canImport: rows.some((row) => row.status !== "failed") && mappingResult.unmappedHeaders.length === 0,
  };
}

export async function executePortfolioImport(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: {
    csvText: string;
    fileName: string;
    fieldMapping?: Record<string, PortfolioImportFieldKey>;
    skipInvalid?: boolean;
  },
): Promise<ExecutePortfolioImportResult> {
  const preview = await previewPortfolioImport(input);
  if (preview.unmappedHeaders.length > 0) {
    throw new Error("This file still has column names that need to be mapped before import can continue.");
  }

  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = preview.failedRows;
  const rows: PortfolioImportRow[] = [];

  for (const row of preview.rows) {
    if (row.status === "failed") {
      skippedCount += 1;
      rows.push(row);
      continue;
    }

    if (!row.matchedSlug || row.quantity === null || row.buyPrice === null) {
      failedCount += 1;
      rows.push({
        ...row,
        status: "failed",
        errors: [...row.errors, "This row could not be imported because the stock match is missing."],
        note: "This row could not be imported.",
      });
      continue;
    }

    await saveUserPortfolioHolding(user, {
      stockSlug: row.matchedSlug,
      quantity: row.quantity,
      buyPrice: row.buyPrice,
    });

    importedCount += 1;
    rows.push({
      ...row,
      status: "imported",
      note: `${row.matchedName ?? row.matchedSlug} was added to your portfolio.`,
    });
  }

  return {
    importedCount,
    skippedCount,
    failedCount,
    rows,
    holdings: await getUserPortfolioHoldings(user),
  };
}
