import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import {
  cmsImportRowStates,
  getOperatorCmsEntityDefinition,
  type OperatorCmsEntityDefinition,
} from "@/lib/operator-cms";
import { saveOperatorCmsRecord } from "@/lib/operator-cms-mutations";

type CmsImportRowState = (typeof cmsImportRowStates)[number];

type ImportSourceFormat = "csv" | "json";

type ImportFieldMapping = {
  titleField: string;
  slugField: string;
  symbolField: string;
};

type RawImportRecord = Record<string, unknown>;

type ContentRecordLookupRow = {
  id: string;
  entity_type: string;
  canonical_slug: string;
  canonical_symbol: string | null;
  title: string;
  source_table: string | null;
  source_row_id: string | null;
  workflow_state: string;
  verification_state: string;
  publication_visibility: "private" | "public";
  review_queue_reason: string | null;
  source_payload: Record<string, unknown> | null;
  editorial_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

type ImportTrustedMatch = {
  status: "matched" | "unmatched" | "manual_only";
  matchedBy?: string | null;
  sourceTable?: string | null;
  sourceRowId?: string | null;
  summary: string;
};

type NormalizedImportRow = {
  rowNumber: number;
  rawRecord: RawImportRecord;
  proposedTitle: string | null;
  proposedSlug: string | null;
  proposedSymbol: string | null;
  normalizedPayload: Record<string, unknown>;
  validationState: CmsImportRowState;
  validationErrors: string[];
  reviewNotes: string | null;
  trustedMatch: ImportTrustedMatch;
  duplicateOfId: string | null;
  targetRecordId: string | null;
};

export type OperatorCmsImportPreviewRow = {
  rowNumber: number;
  proposedTitle: string | null;
  proposedSlug: string | null;
  proposedSymbol: string | null;
  validationState: CmsImportRowState;
  validationErrors: string[];
  reviewNotes: string | null;
  trustedMatchSummary: string;
  targetRecordId: string | null;
  duplicateOfId: string | null;
};

export type OperatorCmsImportPreview = {
  rowCount: number;
  validRows: number;
  duplicateRows: number;
  unmatchedRows: number;
  invalidRows: number;
  pendingReviewRows: number;
  rows: OperatorCmsImportPreviewRow[];
};

export type OperatorCmsImportBatchListItem = {
  id: string;
  entityType: string;
  sourceLabel: string;
  sourceReference: string | null;
  uploadedFilename: string | null;
  batchStatus: string;
  rowCount: number;
  createdAt: string;
  validRows: number;
  duplicateRows: number;
  unmatchedRows: number;
  invalidRows: number;
  pendingReviewRows: number;
  approvedRows: number;
  appliedRows: number;
};

export type OperatorCmsImportBatchRow = {
  id: string;
  rowNumber: number;
  proposedTitle: string | null;
  proposedSlug: string | null;
  proposedSymbol: string | null;
  validationState: CmsImportRowState;
  validationErrors: string[];
  reviewNotes: string | null;
  trustedMatchSummary: string;
  trustedMatchStatus: string;
  targetRecordId: string | null;
  duplicateOfId: string | null;
  updatedAt: string;
};

export type OperatorCmsImportBatchPageData = {
  schemaReady: boolean;
  schemaError: string | null;
  entity: OperatorCmsEntityDefinition | null;
  batch: {
    id: string;
    sourceLabel: string;
    sourceReference: string | null;
    uploadedFilename: string | null;
    batchStatus: string;
    rowCount: number;
    createdAt: string;
    validRows: number;
    duplicateRows: number;
    unmatchedRows: number;
    invalidRows: number;
    pendingReviewRows: number;
    approvedRows: number;
    appliedRows: number;
  } | null;
  rows: OperatorCmsImportBatchRow[];
  activeState: string;
  activeQuery: string;
};

export type OperatorCmsImportListPageData = {
  schemaReady: boolean;
  schemaError: string | null;
  entity: OperatorCmsEntityDefinition | null;
  batches: OperatorCmsImportBatchListItem[];
  activeStatus: string;
};

type TrustedSourceRow = {
  id: string;
  slug?: string | null;
  symbol?: string | null;
  title?: string | null;
  extra?: string | null;
};

const previewRowLimit = 120;

const entityImportConfig: Record<
  string,
  {
    titleCandidates: string[];
    slugCandidates: string[];
    symbolCandidates: string[];
    requiredFields: string[];
    requiresTrustedMatch: boolean;
  }
> = {
  stock: {
    titleCandidates: ["title", "name", "company_name"],
    slugCandidates: ["slug", "canonical_slug"],
    symbolCandidates: ["symbol", "ticker", "canonical_symbol"],
    requiredFields: ["title", "slug", "symbol"],
    requiresTrustedMatch: true,
  },
  mutual_fund: {
    titleCandidates: ["fund_name", "title", "name"],
    slugCandidates: ["slug", "canonical_slug"],
    symbolCandidates: ["amfi_code", "scheme_code", "symbol"],
    requiredFields: ["title", "slug", "category"],
    requiresTrustedMatch: true,
  },
  course: {
    titleCandidates: ["title", "course_title", "name"],
    slugCandidates: ["slug", "canonical_slug"],
    symbolCandidates: ["code", "symbol"],
    requiredFields: ["title", "slug"],
    requiresTrustedMatch: false,
  },
  webinar: {
    titleCandidates: ["title", "webinar_title", "name"],
    slugCandidates: ["slug", "canonical_slug"],
    symbolCandidates: ["code", "symbol"],
    requiredFields: ["title", "slug"],
    requiresTrustedMatch: false,
  },
};

function assertCmsImportAdminReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error(
      "Supabase admin environment variables are missing, so the operator CMS import flow cannot read or write durable batches yet.",
    );
  }
}

function isTableMissingError(error: unknown) {
  const code = typeof error === "object" && error ? (error as { code?: string }).code : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  return code === "42P01" || /relation .* does not exist/i.test(message);
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalSymbol(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized ? normalized : null;
}

function getStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function readField(record: RawImportRecord, names: string[]) {
  for (const name of names) {
    const direct = record[name];
    const lowerMatch = Object.keys(record).find((key) => key.toLowerCase() === name.toLowerCase());
    const value = direct ?? (lowerMatch ? record[lowerMatch] : undefined);
    const normalized = getStringValue(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\"") {
      const nextCharacter = line[index + 1];

      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"(.*)"$/, "$1").trim());
}

function parseCsvPayload(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV import needs a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]);
  if (!headers.length || headers.every((header) => !header)) {
    throw new Error("CSV import header row is empty.");
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: RawImportRecord = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function parseJsonPayload(text: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON import payload must be valid JSON.");
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { rows?: unknown }).rows)
      ? (parsed as { rows: unknown[] }).rows
      : null;

  if (!rows) {
    throw new Error("JSON import must be an array of objects or an object with a rows array.");
  }

  const normalizedRows = rows.filter(
    (row): row is RawImportRecord => Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );

  if (!normalizedRows.length) {
    throw new Error("JSON import does not contain any object rows.");
  }

  return normalizedRows;
}

function parseImportPayload(input: { format: ImportSourceFormat; rawPayloadText: string }) {
  const raw = input.rawPayloadText.trim();

  if (!raw) {
    throw new Error("Import data is required.");
  }

  return input.format === "json" ? parseJsonPayload(raw) : parseCsvPayload(raw);
}

function buildReviewSummary(rows: NormalizedImportRow[]) {
  const summary = {
    validRows: 0,
    duplicateRows: 0,
    unmatchedRows: 0,
    invalidRows: 0,
    pendingReviewRows: 0,
    approvedRows: 0,
    rejectedRows: 0,
    appliedRows: 0,
  };

  for (const row of rows) {
    if (row.validationState === "valid") summary.validRows += 1;
    if (row.validationState === "duplicate") summary.duplicateRows += 1;
    if (row.validationState === "unmatched") summary.unmatchedRows += 1;
    if (row.validationState === "invalid") summary.invalidRows += 1;
    if (row.validationState === "approved_for_import") summary.approvedRows += 1;
    if (row.validationState === "rejected") summary.rejectedRows += 1;
  }

  summary.pendingReviewRows =
    summary.duplicateRows + summary.unmatchedRows + summary.invalidRows;

  return summary;
}

function summarizeTrustedMatch(match: ImportTrustedMatch) {
  return match.summary;
}

function normalizeBatchStatus(rows: NormalizedImportRow[]) {
  if (!rows.length) {
    return "draft";
  }

  if (rows.some((row) => row.validationState === "approved_for_import")) {
    return "approved";
  }

  return "review";
}

async function readExistingCmsRecords(entityType: string, slugs: string[], symbols: string[]) {
  const supabase = createSupabaseAdminClient();
  const rows = new Map<string, ContentRecordLookupRow>();
  const symbolRows = new Map<string, ContentRecordLookupRow>();

  if (slugs.length) {
    const { data, error } = await supabase
      .from("content_records")
      .select(
        "id,entity_type,canonical_slug,canonical_symbol,title,source_table,source_row_id,workflow_state,verification_state,publication_visibility,review_queue_reason,source_payload,editorial_payload,metadata",
      )
      .eq("entity_type", entityType)
      .in("canonical_slug", slugs);

    if (error) {
      throw new Error(`Unable to validate existing CMS slugs: ${error.message}`);
    }

    for (const row of data ?? []) {
      rows.set(row.canonical_slug, row as ContentRecordLookupRow);
      if ((row as ContentRecordLookupRow).canonical_symbol) {
        symbolRows.set(
          (row as ContentRecordLookupRow).canonical_symbol as string,
          row as ContentRecordLookupRow,
        );
      }
    }
  }

  if (symbols.length) {
    const { data, error } = await supabase
      .from("content_records")
      .select(
        "id,entity_type,canonical_slug,canonical_symbol,title,source_table,source_row_id,workflow_state,verification_state,publication_visibility,review_queue_reason,source_payload,editorial_payload,metadata",
      )
      .eq("entity_type", entityType)
      .in("canonical_symbol", symbols);

    if (error) {
      throw new Error(`Unable to validate existing CMS symbols: ${error.message}`);
    }

    for (const row of data ?? []) {
      rows.set((row as ContentRecordLookupRow).canonical_slug, row as ContentRecordLookupRow);
      if ((row as ContentRecordLookupRow).canonical_symbol) {
        symbolRows.set(
          (row as ContentRecordLookupRow).canonical_symbol as string,
          row as ContentRecordLookupRow,
        );
      }
    }
  }

  return { bySlug: rows, bySymbol: symbolRows };
}

async function readTrustedSourceMatches(input: {
  entityType: string;
  slugs: string[];
  symbols: string[];
  titles: string[];
}) {
  const entity = getOperatorCmsEntityDefinition(input.entityType);
  const supabase = createSupabaseAdminClient();
  const bySlug = new Map<string, TrustedSourceRow>();
  const bySymbol = new Map<string, TrustedSourceRow>();
  const byTitle = new Map<string, TrustedSourceRow>();

  if (!entity?.sourceTable || entity.sourceTable === "asset_registry_entries") {
    return { entity, bySlug, bySymbol, byTitle, manualOnly: true };
  }

  try {
    if (entity.code === "stock") {
      if (input.slugs.length) {
        const { data, error } = await supabase
          .from("instruments")
          .select("id,slug,symbol,name,exchange")
          .eq("instrument_type", "stock")
          .in("slug", input.slugs);

        if (error) {
          throw error;
        }

        for (const row of data ?? []) {
          bySlug.set(row.slug, {
            id: row.id,
            slug: row.slug,
            symbol: row.symbol,
            title: row.name,
            extra: row.exchange,
          });
        }
      }

      if (input.symbols.length) {
        const { data, error } = await supabase
          .from("instruments")
          .select("id,slug,symbol,name,exchange")
          .eq("instrument_type", "stock")
          .in("symbol", input.symbols);

        if (error) {
          throw error;
        }

        for (const row of data ?? []) {
          if (row.symbol) {
            bySymbol.set(row.symbol, {
              id: row.id,
              slug: row.slug,
              symbol: row.symbol,
              title: row.name,
              extra: row.exchange,
            });
          }
        }
      }
    } else if (entity.code === "mutual_fund") {
      if (input.slugs.length) {
        const { data, error } = await supabase
          .from("mutual_funds")
          .select("id,slug,fund_name,category,amc_name")
          .in("slug", input.slugs);

        if (error) {
          throw error;
        }

        for (const row of data ?? []) {
          bySlug.set(row.slug, {
            id: row.id,
            slug: row.slug,
            title: row.fund_name,
            extra: row.category,
          });
        }
      }

      if (input.titles.length) {
        const { data, error } = await supabase
          .from("mutual_funds")
          .select("id,slug,fund_name,category,amc_name")
          .in("fund_name", input.titles);

        if (error) {
          throw error;
        }

        for (const row of data ?? []) {
          byTitle.set(row.fund_name.toLowerCase(), {
            id: row.id,
            slug: row.slug,
            title: row.fund_name,
            extra: row.category,
          });
        }
      }
    } else if (entity.code === "ipo") {
      if (input.slugs.length) {
        const { data, error } = await supabase
          .from("ipos")
          .select("id,slug,company_name,status")
          .in("slug", input.slugs);

        if (error) {
          throw error;
        }

        for (const row of data ?? []) {
          bySlug.set(row.slug, {
            id: row.id,
            slug: row.slug,
            title: row.company_name,
            extra: row.status,
          });
        }
      }

      if (input.titles.length) {
        const { data, error } = await supabase
          .from("ipos")
          .select("id,slug,company_name,status")
          .in("company_name", input.titles);

        if (error) {
          throw error;
        }

        for (const row of data ?? []) {
          byTitle.set(row.company_name.toLowerCase(), {
            id: row.id,
            slug: row.slug,
            title: row.company_name,
            extra: row.status,
          });
        }
      }
    }

    return { entity, bySlug, bySymbol, byTitle, manualOnly: false };
  } catch (error) {
    if (isTableMissingError(error)) {
      return { entity, bySlug, bySymbol, byTitle, manualOnly: true };
    }

    throw new Error(
      error instanceof Error
        ? `Unable to validate trusted source rows: ${error.message}`
        : "Unable to validate trusted source rows.",
    );
  }
}

function getImportConfig(entityType: string) {
  return (
    entityImportConfig[entityType] ?? {
      titleCandidates: ["title", "name"],
      slugCandidates: ["slug", "canonical_slug"],
      symbolCandidates: ["symbol", "code"],
      requiredFields: ["title", "slug"],
      requiresTrustedMatch: false,
    }
  );
}

function getMappedFieldNames(mapping: ImportFieldMapping, config: ReturnType<typeof getImportConfig>) {
  return {
    title: [mapping.titleField, ...config.titleCandidates].filter(Boolean),
    slug: [mapping.slugField, ...config.slugCandidates].filter(Boolean),
    symbol: [mapping.symbolField, ...config.symbolCandidates].filter(Boolean),
  };
}

async function normalizeImportRows(input: {
  entityType: string;
  rows: RawImportRecord[];
  mapping: ImportFieldMapping;
}) {
  const config = getImportConfig(input.entityType);
  const fieldNames = getMappedFieldNames(input.mapping, config);

  const prelimRows = input.rows.map((record, index) => {
    const proposedTitle = readField(record, fieldNames.title) || null;
    const rawSlug = readField(record, fieldNames.slug);
    const proposedSlug = normalizeSlug(rawSlug || proposedTitle || "");
    const proposedSymbol = normalizeOptionalSymbol(readField(record, fieldNames.symbol));

    return {
      rowNumber: index + 1,
      rawRecord: record,
      proposedTitle,
      proposedSlug: proposedSlug || null,
      proposedSymbol,
    };
  });

  const slugCounts = new Map<string, number>();
  const symbolCounts = new Map<string, number>();

  for (const row of prelimRows) {
    if (row.proposedSlug) {
      slugCounts.set(row.proposedSlug, (slugCounts.get(row.proposedSlug) ?? 0) + 1);
    }
    if (row.proposedSymbol) {
      symbolCounts.set(row.proposedSymbol, (symbolCounts.get(row.proposedSymbol) ?? 0) + 1);
    }
  }

  const existingRecords = await readExistingCmsRecords(
    input.entityType,
    [...slugCounts.keys()],
    [...symbolCounts.keys()],
  );
  const trustedMatches = await readTrustedSourceMatches({
    entityType: input.entityType,
    slugs: [...slugCounts.keys()],
    symbols: [...symbolCounts.keys()],
    titles: prelimRows
      .map((row) => row.proposedTitle?.trim() ?? "")
      .filter(Boolean),
  });

  return prelimRows.map((row) => {
    const validationErrors: string[] = [];
    const normalizedPayload = {
      ...row.rawRecord,
      canonical_slug: row.proposedSlug,
      canonical_symbol: row.proposedSymbol,
      title: row.proposedTitle,
    } as Record<string, unknown>;

    if (config.requiredFields.includes("title") && !row.proposedTitle) {
      validationErrors.push("Missing required title field.");
    }
    if (config.requiredFields.includes("slug") && !row.proposedSlug) {
      validationErrors.push("Missing required slug field.");
    }
    if (config.requiredFields.includes("symbol") && !row.proposedSymbol) {
      validationErrors.push("Missing required symbol field.");
    }
    if (config.requiredFields.includes("category") && !getStringValue(row.rawRecord.category)) {
      validationErrors.push("Missing required category field.");
    }

    let validationState: CmsImportRowState = validationErrors.length ? "invalid" : "valid";
    let reviewNotes: string | null = null;
    let duplicateOfId: string | null = null;
    let targetRecordId: string | null = null;

    const existingBySlug = row.proposedSlug
      ? existingRecords.bySlug.get(row.proposedSlug)
      : null;
    const existingBySymbol = row.proposedSymbol
      ? existingRecords.bySymbol.get(row.proposedSymbol)
      : null;

    if (validationState !== "invalid" && row.proposedSlug && (slugCounts.get(row.proposedSlug) ?? 0) > 1) {
      validationState = "duplicate";
      reviewNotes = "Duplicate slug detected inside this import batch.";
    }

    if (
      validationState === "valid" &&
      row.proposedSymbol &&
      (symbolCounts.get(row.proposedSymbol) ?? 0) > 1
    ) {
      validationState = "duplicate";
      reviewNotes = "Duplicate symbol detected inside this import batch.";
    }

    if (validationState === "valid" && existingBySlug && existingBySymbol && existingBySlug.id !== existingBySymbol.id) {
      validationState = "duplicate";
      duplicateOfId = existingBySlug.id;
      reviewNotes = "Slug and symbol conflict with different existing CMS records.";
    } else if (validationState === "valid" && existingBySlug) {
      targetRecordId = existingBySlug.id;
    } else if (validationState === "valid" && existingBySymbol) {
      targetRecordId = existingBySymbol.id;
    }

    const trustedMatchBySlug =
      row.proposedSlug ? trustedMatches.bySlug.get(row.proposedSlug) : null;
    const trustedMatchBySymbol =
      row.proposedSymbol ? trustedMatches.bySymbol.get(row.proposedSymbol) : null;
    const trustedMatchByTitle =
      row.proposedTitle ? trustedMatches.byTitle.get(row.proposedTitle.toLowerCase()) : null;
    const trustedMatch = trustedMatchBySlug ?? trustedMatchBySymbol ?? trustedMatchByTitle;

    const trustedMatchPayload: ImportTrustedMatch = trustedMatches.manualOnly
      ? {
          status: "manual_only",
          sourceTable: trustedMatches.entity?.sourceTable ?? null,
          summary: "Manual import lane. No trusted source match is required for this content type.",
        }
      : trustedMatch
        ? {
            status: "matched",
            matchedBy: trustedMatchBySlug
              ? "slug"
              : trustedMatchBySymbol
                ? "symbol"
                : "title",
            sourceTable: trustedMatches.entity?.sourceTable ?? null,
            sourceRowId: trustedMatch.id,
            summary: trustedMatchBySlug
              ? `Trusted source matched by slug: ${trustedMatch.slug}`
              : trustedMatchBySymbol
                ? `Trusted source matched by symbol: ${trustedMatch.symbol}`
                : `Trusted source matched by title: ${trustedMatch.title}`,
          }
        : {
            status: "unmatched",
            sourceTable: trustedMatches.entity?.sourceTable ?? null,
            summary: "No trusted source row matched this import row.",
          };

    if (
      validationState === "valid" &&
      config.requiresTrustedMatch &&
      trustedMatchPayload.status !== "matched"
    ) {
      validationState = "unmatched";
      reviewNotes = "This row could not be matched to a trusted source row.";
    }

    if (validationState === "valid" && existingBySlug && !reviewNotes) {
      reviewNotes = "This row will update an existing CMS record.";
    }

    return {
      rowNumber: row.rowNumber,
      rawRecord: row.rawRecord,
      proposedTitle: row.proposedTitle,
      proposedSlug: row.proposedSlug,
      proposedSymbol: row.proposedSymbol,
      normalizedPayload,
      validationState,
      validationErrors,
      reviewNotes,
      trustedMatch: trustedMatchPayload,
      duplicateOfId,
      targetRecordId,
    } satisfies NormalizedImportRow;
  });
}

function mapPreviewRows(rows: NormalizedImportRow[]) {
  return rows.slice(0, previewRowLimit).map((row) => ({
    rowNumber: row.rowNumber,
    proposedTitle: row.proposedTitle,
    proposedSlug: row.proposedSlug,
    proposedSymbol: row.proposedSymbol,
    validationState: row.validationState,
    validationErrors: row.validationErrors,
    reviewNotes: row.reviewNotes,
    trustedMatchSummary: summarizeTrustedMatch(row.trustedMatch),
    targetRecordId: row.targetRecordId,
    duplicateOfId: row.duplicateOfId,
  }));
}

export async function previewOperatorCmsImport(input: {
  entityType: string;
  format: ImportSourceFormat;
  rawPayloadText: string;
  mapping: ImportFieldMapping;
}) {
  assertCmsImportAdminReady();
  const entity = getOperatorCmsEntityDefinition(input.entityType);

  if (!entity) {
    throw new Error("CMS content type is not registered for import.");
  }

  const parsedRows = parseImportPayload({
    format: input.format,
    rawPayloadText: input.rawPayloadText,
  });
  const normalizedRows = await normalizeImportRows({
    entityType: input.entityType,
    rows: parsedRows,
    mapping: input.mapping,
  });
  const summary = buildReviewSummary(normalizedRows);

  return {
    rowCount: normalizedRows.length,
    validRows: summary.validRows,
    duplicateRows: summary.duplicateRows,
    unmatchedRows: summary.unmatchedRows,
    invalidRows: summary.invalidRows,
    pendingReviewRows:
      summary.duplicateRows + summary.unmatchedRows + summary.invalidRows,
    rows: mapPreviewRows(normalizedRows),
  } satisfies OperatorCmsImportPreview;
}

export async function createOperatorCmsImportBatch(input: {
  entityType: string;
  sourceLabel: string;
  sourceReference?: string | null;
  uploadedFilename?: string | null;
  format: ImportSourceFormat;
  rawPayloadText: string;
  mapping: ImportFieldMapping;
  actorId?: string | null;
}) {
  assertCmsImportAdminReady();
  const entity = getOperatorCmsEntityDefinition(input.entityType);

  if (!entity) {
    throw new Error("CMS content type is not registered for import.");
  }

  const parsedRows = parseImportPayload({
    format: input.format,
    rawPayloadText: input.rawPayloadText,
  });
  const normalizedRows = await normalizeImportRows({
    entityType: input.entityType,
    rows: parsedRows,
    mapping: input.mapping,
  });

  const reviewSummary = buildReviewSummary(normalizedRows);
  const batchStatus = normalizeBatchStatus(normalizedRows);
  const supabase = createSupabaseAdminClient();
  const actorId = input.actorId === "local-admin-bypass" ? null : input.actorId ?? null;
  const { data: batchRow, error: batchError } = await supabase
    .from("content_import_batches")
    .insert({
      entity_type: entity.code,
      source_label: input.sourceLabel.trim() || `${entity.label} import`,
      source_reference: input.sourceReference?.trim() || null,
      uploaded_filename: input.uploadedFilename?.trim() || null,
      batch_status: batchStatus,
      row_count: normalizedRows.length,
      review_summary: reviewSummary,
      validation_schema: {
        format: input.format,
        mapping: input.mapping,
      },
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id,entity_type")
    .single();

  if (batchError || !batchRow) {
    throw new Error(
      `Unable to create CMS import batch: ${batchError?.message ?? "Unknown error"}`,
    );
  }

  const rowsToInsert = normalizedRows.map((row) => ({
    batch_id: batchRow.id,
    entity_type: entity.code,
    row_number: row.rowNumber,
    proposed_slug: row.proposedSlug,
    proposed_symbol: row.proposedSymbol,
    proposed_title: row.proposedTitle,
    normalized_payload: row.normalizedPayload,
    trusted_match: row.trustedMatch,
    validation_state: row.validationState,
    validation_errors: row.validationErrors,
    duplicate_of_id: row.duplicateOfId,
    target_record_id: row.targetRecordId,
    review_notes: row.reviewNotes,
  }));

  const { error: rowError } = await supabase.from("content_import_rows").insert(rowsToInsert);

  if (rowError) {
    throw new Error(`Unable to create CMS import rows: ${rowError.message}`);
  }

  return {
    batchId: batchRow.id,
    entityType: batchRow.entity_type,
    message: "Import batch created with validation preview results.",
  };
}

async function refreshImportBatchSummary(batchId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("content_import_rows")
    .select("validation_state")
    .eq("batch_id", batchId);

  if (error) {
    throw new Error(`Unable to refresh import batch summary: ${error.message}`);
  }

  const normalizedRows = (rows ?? []).map((row, index) => ({
    rowNumber: index + 1,
    rawRecord: {},
    proposedTitle: null,
    proposedSlug: null,
    proposedSymbol: null,
    normalizedPayload: {},
    validationState: row.validation_state as CmsImportRowState,
    validationErrors: [],
    reviewNotes: null,
    trustedMatch: {
      status: "manual_only",
      summary: "",
    } as ImportTrustedMatch,
    duplicateOfId: null,
    targetRecordId: null,
  }));
  const reviewSummary = buildReviewSummary(normalizedRows);
  const batchStatus =
    reviewSummary.approvedRows > 0 ? "approved" : reviewSummary.rejectedRows === normalizedRows.length ? "rejected" : "review";

  const { error: updateError } = await supabase
    .from("content_import_batches")
    .update({
      batch_status: batchStatus,
      review_summary: reviewSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  if (updateError) {
    throw new Error(`Unable to update import batch summary: ${updateError.message}`);
  }
}

export async function reviewOperatorCmsImportRow(input: {
  batchId: string;
  rowId: string;
  decision: "approve_for_import" | "reject";
  reviewNotes?: string | null;
}) {
  assertCmsImportAdminReady();
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("content_import_rows")
    .select("id,entity_type,validation_state")
    .eq("id", input.rowId)
    .eq("batch_id", input.batchId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load import row for review: ${error.message}`);
  }

  if (!row) {
    throw new Error("Import row not found.");
  }

  if (input.decision === "approve_for_import" && row.validation_state !== "valid") {
    throw new Error("Only rows in the valid state can be approved for import.");
  }

  const { error: updateError } = await supabase
    .from("content_import_rows")
    .update({
      validation_state:
        input.decision === "approve_for_import" ? "approved_for_import" : "rejected",
      review_notes: input.reviewNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.rowId);

  if (updateError) {
    throw new Error(`Unable to update import row review state: ${updateError.message}`);
  }

  await refreshImportBatchSummary(input.batchId);

  return {
    entityType: row.entity_type,
    message:
      input.decision === "approve_for_import"
        ? "Import row approved for safe apply."
        : "Import row rejected.",
  };
}

function toJsonText(value: Record<string, unknown> | null | undefined) {
  return JSON.stringify(value ?? {}, null, 2);
}

export async function applyOperatorCmsImportBatch(input: {
  batchId: string;
  actorId?: string | null;
}) {
  assertCmsImportAdminReady();
  const supabase = createSupabaseAdminClient();
  const { data: batch, error: batchError } = await supabase
    .from("content_import_batches")
    .select("id,entity_type,source_label,source_reference")
    .eq("id", input.batchId)
    .maybeSingle();

  if (batchError) {
    throw new Error(`Unable to load import batch: ${batchError.message}`);
  }

  if (!batch) {
    throw new Error("Import batch not found.");
  }

  const { data: rows, error: rowsError } = await supabase
    .from("content_import_rows")
    .select(
      "id,row_number,proposed_slug,proposed_symbol,proposed_title,normalized_payload,trusted_match,target_record_id",
    )
    .eq("batch_id", input.batchId)
    .eq("validation_state", "approved_for_import")
    .order("row_number", { ascending: true });

  if (rowsError) {
    throw new Error(`Unable to load import rows for apply: ${rowsError.message}`);
  }

  if (!rows || rows.length === 0) {
    throw new Error("No rows have been approved for import in this batch yet.");
  }

  let appliedRows = 0;

  for (const row of rows) {
    const existingRecord = row.target_record_id
      ? (
          await supabase
        .from("content_records")
        .select(
          "id,title,canonical_slug,canonical_symbol,source_table,source_row_id,verification_state,publication_visibility,review_queue_reason,source_payload,editorial_payload,metadata",
        )
            .eq("id", row.target_record_id)
            .maybeSingle()
        ).data
      : null;

    const trustedMatch = (row.trusted_match ?? {}) as ImportTrustedMatch;
    if (
      existingRecord?.source_row_id &&
      trustedMatch.status === "matched" &&
      trustedMatch.sourceRowId &&
      trustedMatch.sourceRowId !== existingRecord.source_row_id
    ) {
      throw new Error(
        `Import row ${row.row_number} matched a different trusted source row than the existing CMS record. Review the mapping before applying.`,
      );
    }
    const sourcePayload = {
      ...(existingRecord?.source_payload ?? {}),
      ...((row.normalized_payload as Record<string, unknown>) ?? {}),
      import_batch: {
        batchId: batch.id,
        sourceLabel: batch.source_label,
        sourceReference: batch.source_reference,
        rowNumber: row.row_number,
      },
      trusted_match: trustedMatch,
    };
    const metadata = {
      ...(existingRecord?.metadata ?? {}),
      last_import_batch_id: batch.id,
      last_import_row_number: row.row_number,
    };
    const verificationState =
      existingRecord?.verification_state === "verified"
        ? "verified"
        : trustedMatch.status === "matched"
          ? "trusted_match"
          : existingRecord?.verification_state ?? "unverified";

    await saveOperatorCmsRecord({
      entityType: batch.entity_type,
      recordId: row.target_record_id,
      title: row.proposed_title ?? existingRecord?.title ?? "",
      canonicalSlug: row.proposed_slug ?? existingRecord?.canonical_slug ?? "",
      canonicalSymbol: row.proposed_symbol ?? existingRecord?.canonical_symbol ?? "",
      sourceTable:
        trustedMatch.status === "matched"
          ? trustedMatch.sourceTable ?? existingRecord?.source_table ?? null
          : existingRecord?.source_table ?? null,
      sourceRowId:
        trustedMatch.status === "matched"
          ? trustedMatch.sourceRowId ?? existingRecord?.source_row_id ?? null
          : existingRecord?.source_row_id ?? null,
      verificationState,
      publicationVisibility: existingRecord?.publication_visibility ?? "private",
      reviewQueueReason:
        existingRecord?.review_queue_reason ??
        `Imported from batch ${batch.source_label} row ${row.row_number}.`,
      sourcePayloadText: toJsonText(sourcePayload),
      editorialPayloadText: toJsonText(existingRecord?.editorial_payload ?? {}),
      metadataText: toJsonText(metadata),
      intent: row.target_record_id ? "save" : "save_draft",
      actorId: input.actorId ?? null,
    });

    appliedRows += 1;
  }

  const { data: currentBatch } = await supabase
    .from("content_import_batches")
    .select("review_summary")
    .eq("id", input.batchId)
    .maybeSingle();
  const reviewSummary = {
    ...((currentBatch?.review_summary as Record<string, unknown>) ?? {}),
    appliedRows,
  };

  const { error: updateBatchError } = await supabase
    .from("content_import_batches")
    .update({
      batch_status: "applied",
      review_summary: reviewSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.batchId);

  if (updateBatchError) {
    throw new Error(`Unable to mark import batch as applied: ${updateBatchError.message}`);
  }

  return {
    entityType: batch.entity_type,
    batchId: batch.id,
    message: `Applied ${appliedRows} approved import row${appliedRows === 1 ? "" : "s"} to CMS records.`,
  };
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeSearchTerm(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

export async function getOperatorCmsImportListPageData(input: {
  entityType: string;
  status?: string;
}): Promise<OperatorCmsImportListPageData> {
  const entity = getOperatorCmsEntityDefinition(input.entityType);

  if (!entity) {
    return {
      schemaReady: true,
      schemaError: null,
      entity: null,
      batches: [],
      activeStatus: "",
    };
  }

  if (!hasRuntimeSupabaseAdminEnv()) {
    return {
      schemaReady: false,
      schemaError:
        "Supabase admin environment variables are missing, so import batches cannot be loaded yet.",
      entity,
      batches: [],
      activeStatus: "",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("content_import_batches")
      .select(
        "id,entity_type,source_label,source_reference,uploaded_filename,batch_status,row_count,review_summary,created_at",
      )
      .eq("entity_type", input.entityType)
      .order("created_at", { ascending: false });

    if (input.status) {
      query = query.eq("batch_status", input.status);
    }

    const { data, error } = await query.limit(40);

    if (error) {
      throw error;
    }

    return {
      schemaReady: true,
      schemaError: null,
      entity,
      activeStatus: input.status?.trim() ?? "",
      batches: (data ?? []).map((batch) => ({
        id: batch.id,
        entityType: batch.entity_type,
        sourceLabel: batch.source_label,
        sourceReference: batch.source_reference,
        uploadedFilename: batch.uploaded_filename,
        batchStatus: batch.batch_status,
        rowCount: batch.row_count,
        createdAt: batch.created_at,
        validRows: toNumber(batch.review_summary?.validRows),
        duplicateRows: toNumber(batch.review_summary?.duplicateRows),
        unmatchedRows: toNumber(batch.review_summary?.unmatchedRows),
        invalidRows: toNumber(batch.review_summary?.invalidRows),
        pendingReviewRows: toNumber(batch.review_summary?.pendingReviewRows),
        approvedRows: toNumber(batch.review_summary?.approvedRows),
        appliedRows: toNumber(batch.review_summary?.appliedRows),
      })),
    };
  } catch (error) {
    return {
      schemaReady: false,
      schemaError: isTableMissingError(error)
        ? "The CMS import tables are not available yet. Apply the CMS foundation migration first."
        : error instanceof Error
          ? error.message
          : "Import batches could not be loaded.",
      entity,
      batches: [],
      activeStatus: input.status?.trim() ?? "",
    };
  }
}

export async function getOperatorCmsImportBatchPageData(input: {
  entityType: string;
  batchId: string;
  state?: string;
  query?: string;
}): Promise<OperatorCmsImportBatchPageData> {
  const entity = getOperatorCmsEntityDefinition(input.entityType);

  if (!entity) {
    return {
      schemaReady: true,
      schemaError: null,
      entity: null,
      batch: null,
      rows: [],
      activeState: "",
      activeQuery: "",
    };
  }

  if (!hasRuntimeSupabaseAdminEnv()) {
    return {
      schemaReady: false,
      schemaError:
        "Supabase admin environment variables are missing, so import batch detail cannot be loaded yet.",
      entity,
      batch: null,
      rows: [],
      activeState: "",
      activeQuery: "",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: batch, error: batchError } = await supabase
      .from("content_import_batches")
      .select(
        "id,source_label,source_reference,uploaded_filename,batch_status,row_count,created_at,review_summary,entity_type",
      )
      .eq("id", input.batchId)
      .eq("entity_type", input.entityType)
      .maybeSingle();

    if (batchError) {
      throw batchError;
    }

    if (!batch) {
      throw new Error("Import batch not found.");
    }

    let rowsQuery = supabase
      .from("content_import_rows")
      .select(
        "id,row_number,proposed_slug,proposed_symbol,proposed_title,validation_state,validation_errors,review_notes,trusted_match,target_record_id,duplicate_of_id,updated_at",
      )
      .eq("batch_id", input.batchId)
      .order("row_number", { ascending: true });

    if (cmsImportRowStates.includes(input.state as CmsImportRowState)) {
      rowsQuery = rowsQuery.eq("validation_state", input.state as CmsImportRowState);
    }

    const normalizedQuery = normalizeSearchTerm(input.query?.trim() ?? "");
    if (normalizedQuery) {
      rowsQuery = rowsQuery.or(
        [
          `proposed_title.ilike.%${normalizedQuery}%`,
          `proposed_slug.ilike.%${normalizedQuery}%`,
          `proposed_symbol.ilike.%${normalizedQuery}%`,
        ].join(","),
      );
    }

    const { data: rows, error: rowsError } = await rowsQuery.limit(400);

    if (rowsError) {
      throw rowsError;
    }

    return {
      schemaReady: true,
      schemaError: null,
      entity,
      activeState: input.state?.trim() ?? "",
      activeQuery: normalizedQuery,
      batch: {
        id: batch.id,
        sourceLabel: batch.source_label,
        sourceReference: batch.source_reference,
        uploadedFilename: batch.uploaded_filename,
        batchStatus: batch.batch_status,
        rowCount: batch.row_count,
        createdAt: batch.created_at,
        validRows: toNumber(batch.review_summary?.validRows),
        duplicateRows: toNumber(batch.review_summary?.duplicateRows),
        unmatchedRows: toNumber(batch.review_summary?.unmatchedRows),
        invalidRows: toNumber(batch.review_summary?.invalidRows),
        pendingReviewRows: toNumber(batch.review_summary?.pendingReviewRows),
        approvedRows: toNumber(batch.review_summary?.approvedRows),
        appliedRows: toNumber(batch.review_summary?.appliedRows),
      },
      rows: (rows ?? []).map((row) => ({
        id: row.id,
        rowNumber: row.row_number,
        proposedTitle: row.proposed_title,
        proposedSlug: row.proposed_slug,
        proposedSymbol: row.proposed_symbol,
        validationState: row.validation_state as CmsImportRowState,
        validationErrors: Array.isArray(row.validation_errors)
          ? row.validation_errors.map((value) => String(value))
          : [],
        reviewNotes: row.review_notes,
        trustedMatchSummary:
          typeof row.trusted_match === "object" && row.trusted_match
            ? String((row.trusted_match as { summary?: unknown }).summary ?? "No trusted match summary")
            : "No trusted match summary",
        trustedMatchStatus:
          typeof row.trusted_match === "object" && row.trusted_match
            ? String((row.trusted_match as { status?: unknown }).status ?? "unknown")
            : "unknown",
        targetRecordId: row.target_record_id,
        duplicateOfId: row.duplicate_of_id,
        updatedAt: row.updated_at,
      })),
    };
  } catch (error) {
    return {
      schemaReady: false,
      schemaError:
        error instanceof Error ? error.message : "Import batch detail could not be loaded.",
      entity,
      batch: null,
      rows: [],
      activeState: input.state?.trim() ?? "",
      activeQuery: input.query?.trim() ?? "",
    };
  }
}
