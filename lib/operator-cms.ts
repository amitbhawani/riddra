import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

export const cmsWorkflowStates = [
  "draft",
  "pending_review",
  "approved",
  "published",
  "archived",
  "rejected",
] as const;

export const cmsVerificationStates = [
  "unverified",
  "trusted_match",
  "verified",
  "needs_review",
  "rejected",
] as const;

export const cmsImportRowStates = [
  "pending_validation",
  "valid",
  "duplicate",
  "unmatched",
  "invalid",
  "approved_for_import",
  "rejected",
] as const;

type CmsWorkflowState = (typeof cmsWorkflowStates)[number];
type CmsVerificationState = (typeof cmsVerificationStates)[number];
type CmsImportRowState = (typeof cmsImportRowStates)[number];

type CmsEntityFamily = "market" | "wealth" | "education" | "publishing";

export type OperatorCmsEntityDefinition = {
  code: string;
  label: string;
  family: CmsEntityFamily;
  description: string;
  publicRouteBase: string | null;
  sourceTable: string | null;
  supportsImport: boolean;
  supportsManualCreate: boolean;
  supportsEditorialBlocks: boolean;
  fieldHighlights: string[];
};

export type OperatorCmsEntityStats = {
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  published: number;
  archived: number;
  rejected: number;
  verified: number;
  trustedMatch: number;
  needsReview: number;
  reviewQueue: number;
  publicVisible: number;
};

export type OperatorCmsEntityCard = OperatorCmsEntityDefinition & {
  href: string;
  stats: OperatorCmsEntityStats;
};

export type OperatorCmsImportBatchSummary = {
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
};

export type OperatorCmsRecordRow = {
  id: string;
  title: string;
  canonicalSlug: string;
  canonicalSymbol: string | null;
  workflowState: CmsWorkflowState;
  verificationState: CmsVerificationState;
  publicationVisibility: "private" | "public";
  reviewQueueReason: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type OperatorCmsImportReviewRow = {
  id: string;
  batchId: string;
  rowNumber: number;
  proposedSlug: string | null;
  proposedSymbol: string | null;
  proposedTitle: string | null;
  validationState: CmsImportRowState;
  reviewNotes: string | null;
  updatedAt: string;
  sourceLabel: string;
};

type CmsOverviewData = {
  schemaReady: boolean;
  schemaError: string | null;
  entityCards: OperatorCmsEntityCard[];
  recentImportBatches: OperatorCmsImportBatchSummary[];
  totals: {
    records: number;
    published: number;
    pendingReview: number;
    verified: number;
    reviewQueue: number;
  };
};

type CmsEntityPageData = {
  schemaReady: boolean;
  schemaError: string | null;
  entity: OperatorCmsEntityDefinition | null;
  stats: OperatorCmsEntityStats;
  records: OperatorCmsRecordRow[];
  reviewQueue: OperatorCmsImportReviewRow[];
  activeWorkflow: string;
  activeVerification: string;
  activeQuery: string;
};

const defaultEntityDefinitions: OperatorCmsEntityDefinition[] = [
  {
    code: "stock",
    label: "Stocks / shares",
    family: "market",
    description:
      "Canonical equity pages with symbol validation, editorial blocks, and publish-only public listing.",
    publicRouteBase: "/stocks",
    sourceTable: "instruments",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "symbol", "company name", "exchange"],
  },
  {
    code: "mutual_fund",
    label: "Mutual funds",
    family: "market",
    description:
      "Fund records with verified identifiers, category mapping, and publish-gated public visibility.",
    publicRouteBase: "/mutual-funds",
    sourceTable: "mutual_funds",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "fund name", "category", "AMFI/ISIN"],
  },
  {
    code: "etf",
    label: "ETFs",
    family: "market",
    description:
      "ETF product pages managed through the same structured workflow as funds and stocks.",
    publicRouteBase: "/etfs",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "ticker", "issuer", "ISIN"],
  },
  {
    code: "ipo",
    label: "IPOs",
    family: "market",
    description:
      "IPO lifecycle records that stay searchable internally without becoming public until approved and published.",
    publicRouteBase: "/ipo",
    sourceTable: "ipos",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "company", "issue status", "listing date"],
  },
  {
    code: "sif",
    label: "SIF",
    family: "wealth",
    description:
      "Structured investment fund product records with review-first publishing.",
    publicRouteBase: "/sif",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "scheme name", "manager", "strategy"],
  },
  {
    code: "aif",
    label: "AIF",
    family: "wealth",
    description:
      "Alternative investment product records with verification and archive-safe workflow.",
    publicRouteBase: "/aif",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "scheme name", "manager", "category"],
  },
  {
    code: "pms",
    label: "PMS",
    family: "wealth",
    description:
      "Portfolio management service pages with operator review, archive, and republish control.",
    publicRouteBase: "/pms",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "product name", "manager", "strategy"],
  },
  {
    code: "course",
    label: "Courses",
    family: "education",
    description:
      "Course catalog content with learning metadata and publish workflow.",
    publicRouteBase: "/courses",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "title", "track", "difficulty"],
  },
  {
    code: "webinar",
    label: "Webinars",
    family: "education",
    description:
      "Live and replay webinar records with archive-safe publish controls.",
    publicRouteBase: "/webinars",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "title", "event date", "speaker"],
  },
  {
    code: "newsletter",
    label: "Newsletters",
    family: "publishing",
    description:
      "Newsletter issues and archive content with approval and publish gating.",
    publicRouteBase: "/newsletter",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "issue title", "issue date"],
  },
  {
    code: "research_article",
    label: "Research / articles",
    family: "publishing",
    description:
      "Research notes, articles, and explainers with review-first publishing.",
    publicRouteBase: "/learn",
    sourceTable: "asset_registry_entries",
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "title", "author", "topic"],
  },
  {
    code: "generic_content",
    label: "Future categories",
    family: "publishing",
    description:
      "Reusable fallback type so new content families can be added without rewriting the CMS foundation.",
    publicRouteBase: null,
    sourceTable: null,
    supportsImport: true,
    supportsManualCreate: true,
    supportsEditorialBlocks: true,
    fieldHighlights: ["slug", "title"],
  },
];

function buildEmptyStats(): OperatorCmsEntityStats {
  return {
    total: 0,
    draft: 0,
    pendingReview: 0,
    approved: 0,
    published: 0,
    archived: 0,
    rejected: 0,
    verified: 0,
    trustedMatch: 0,
    needsReview: 0,
    reviewQueue: 0,
    publicVisible: 0,
  };
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeSearchTerm(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
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

function mergeDefinitions(
  rows:
    | Array<{
        code: string;
        label: string;
        family: CmsEntityFamily;
        description: string | null;
        public_route_base: string | null;
        source_table: string | null;
        supports_import: boolean;
        supports_manual_create: boolean;
        supports_editorial_blocks: boolean;
      }>
    | null,
) {
  const rowMap = new Map((rows ?? []).map((row) => [row.code, row]));

  return defaultEntityDefinitions.map((definition) => {
    const row = rowMap.get(definition.code);

    if (!row) {
      return definition;
    }

    return {
      ...definition,
      label: row.label,
      family: row.family,
      description: row.description ?? definition.description,
      publicRouteBase: row.public_route_base,
      sourceTable: row.source_table,
      supportsImport: row.supports_import,
      supportsManualCreate: row.supports_manual_create,
      supportsEditorialBlocks: row.supports_editorial_blocks,
    };
  });
}

async function readCmsFoundation() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    return {
      schemaReady: false,
      schemaError:
        "Local admin CMS proof needs a real SUPABASE_SERVICE_ROLE_KEY. Public publish-safe routes can read published CMS rows through the safe public path, but operator CMS stock and mutual-fund lists require the service-role path for durable record reads.",
      definitions: defaultEntityDefinitions,
      records: [] as Array<{
        entity_type: string;
        workflow_state: CmsWorkflowState;
        verification_state: CmsVerificationState;
        publication_visibility: "private" | "public";
      }>,
      importRows: [] as Array<{
        entity_type: string;
        validation_state: CmsImportRowState;
      }>,
      batches: [] as Array<{
        id: string;
        entity_type: string;
        source_label: string;
        source_reference: string | null;
        uploaded_filename: string | null;
        batch_status: string;
        row_count: number;
        review_summary: Record<string, unknown> | null;
        created_at: string;
      }>,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const [typesResult, recordsResult, importRowsResult, batchesResult] = await Promise.all([
      supabase
        .from("content_entity_types")
        .select(
          "code,label,family,description,public_route_base,source_table,supports_import,supports_manual_create,supports_editorial_blocks",
        )
        .order("sort_order", { ascending: true }),
      supabase
        .from("content_records")
        .select("entity_type,workflow_state,verification_state,publication_visibility"),
      supabase
        .from("content_import_rows")
        .select("entity_type,validation_state"),
      supabase
        .from("content_import_batches")
        .select(
          "id,entity_type,source_label,source_reference,uploaded_filename,batch_status,row_count,review_summary,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(16),
    ]);

    const foundationError =
      typesResult.error ??
      recordsResult.error ??
      importRowsResult.error ??
      batchesResult.error;

    if (foundationError) {
      throw foundationError;
    }

    return {
      schemaReady: true,
      schemaError: null,
      definitions: mergeDefinitions(typesResult.data),
      records: recordsResult.data ?? [],
      importRows: importRowsResult.data ?? [],
      batches: batchesResult.data ?? [],
    };
  } catch (error) {
    return {
      schemaReady: false,
      schemaError: isTableMissingError(error)
        ? "The CMS foundation tables are not available yet. Apply `db/migrations/0014_operator_cms_foundation.sql` and `db/seeds/0010_operator_cms_foundation.sql` to activate the operator CMS backend."
        : error instanceof Error
          ? error.message
          : "The operator CMS backend could not read durable foundation tables.",
      definitions: defaultEntityDefinitions,
      records: [] as Array<{
        entity_type: string;
        workflow_state: CmsWorkflowState;
        verification_state: CmsVerificationState;
        publication_visibility: "private" | "public";
      }>,
      importRows: [] as Array<{
        entity_type: string;
        validation_state: CmsImportRowState;
      }>,
      batches: [] as Array<{
        id: string;
        entity_type: string;
        source_label: string;
        source_reference: string | null;
        uploaded_filename: string | null;
        batch_status: string;
        row_count: number;
        review_summary: Record<string, unknown> | null;
        created_at: string;
      }>,
    };
  }
}

export async function getOperatorCmsOverview(): Promise<CmsOverviewData> {
  const foundation = await readCmsFoundation();
  const statsByEntity = new Map(
    foundation.definitions.map((definition) => [definition.code, buildEmptyStats()]),
  );

  for (const record of foundation.records) {
    const stats = statsByEntity.get(record.entity_type);

    if (!stats) {
      continue;
    }

    stats.total += 1;

    if (record.workflow_state === "draft") stats.draft += 1;
    if (record.workflow_state === "pending_review") stats.pendingReview += 1;
    if (record.workflow_state === "approved") stats.approved += 1;
    if (record.workflow_state === "published") stats.published += 1;
    if (record.workflow_state === "archived") stats.archived += 1;
    if (record.workflow_state === "rejected") stats.rejected += 1;
    if (record.verification_state === "verified") stats.verified += 1;
    if (record.verification_state === "trusted_match") stats.trustedMatch += 1;
    if (record.verification_state === "needs_review") stats.needsReview += 1;
    if (
      record.workflow_state === "published" &&
      record.verification_state === "verified" &&
      record.publication_visibility === "public"
    ) {
      stats.publicVisible += 1;
    }
  }

  for (const row of foundation.importRows) {
    const stats = statsByEntity.get(row.entity_type);

    if (!stats) {
      continue;
    }

    if (
      row.validation_state === "pending_validation" ||
      row.validation_state === "duplicate" ||
      row.validation_state === "unmatched" ||
      row.validation_state === "invalid"
    ) {
      stats.reviewQueue += 1;
    }
  }

  const entityCards = foundation.definitions.map((definition) => ({
    ...definition,
    href: `/admin/cms/${definition.code}`,
    stats: statsByEntity.get(definition.code) ?? buildEmptyStats(),
  }));

  const recentImportBatches = foundation.batches.map((batch) => ({
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
  }));

  return {
    schemaReady: foundation.schemaReady,
    schemaError: foundation.schemaError,
    entityCards,
    recentImportBatches,
    totals: {
      records: entityCards.reduce((sum, card) => sum + card.stats.total, 0),
      published: entityCards.reduce((sum, card) => sum + card.stats.publicVisible, 0),
      pendingReview: entityCards.reduce((sum, card) => sum + card.stats.pendingReview, 0),
      verified: entityCards.reduce((sum, card) => sum + card.stats.verified, 0),
      reviewQueue: entityCards.reduce((sum, card) => sum + card.stats.reviewQueue, 0),
    },
  };
}

export function getOperatorCmsEntityDefinition(entityType: string) {
  return defaultEntityDefinitions.find((definition) => definition.code === entityType) ?? null;
}

export async function getOperatorCmsEntityPageData(input: {
  entityType: string;
  workflow?: string;
  verification?: string;
  query?: string;
}): Promise<CmsEntityPageData> {
  const entity = getOperatorCmsEntityDefinition(input.entityType);

  if (!entity) {
    return {
      schemaReady: true,
      schemaError: null,
      entity: null,
      stats: buildEmptyStats(),
      records: [],
      reviewQueue: [],
      activeWorkflow: "",
      activeVerification: "",
      activeQuery: "",
    };
  }

  const overview = await getOperatorCmsOverview();
  const baseStats = overview.entityCards.find((card) => card.code === entity.code)?.stats ?? buildEmptyStats();
  const activeWorkflow = cmsWorkflowStates.includes(input.workflow as CmsWorkflowState)
    ? (input.workflow as CmsWorkflowState)
    : "";
  const activeVerification = cmsVerificationStates.includes(
    input.verification as CmsVerificationState,
  )
    ? (input.verification as CmsVerificationState)
    : "";
  const activeQuery = input.query?.trim() ?? "";

  if (!overview.schemaReady || !hasRuntimeSupabaseAdminEnv()) {
    return {
      schemaReady: overview.schemaReady,
      schemaError: overview.schemaError,
      entity,
      stats: baseStats,
      records: [],
      reviewQueue: [],
      activeWorkflow,
      activeVerification,
      activeQuery,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    let recordsQuery = supabase
      .from("content_records")
      .select(
        "id,title,canonical_slug,canonical_symbol,workflow_state,verification_state,publication_visibility,review_queue_reason,published_at,updated_at",
      )
      .eq("entity_type", entity.code)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (activeWorkflow) {
      recordsQuery = recordsQuery.eq("workflow_state", activeWorkflow);
    }

    if (activeVerification) {
      recordsQuery = recordsQuery.eq("verification_state", activeVerification);
    }

    if (activeQuery) {
      const searchTerm = normalizeSearchTerm(activeQuery);
      recordsQuery = recordsQuery.or(
        `title.ilike.%${searchTerm}%,canonical_slug.ilike.%${searchTerm}%,canonical_symbol.ilike.%${searchTerm}%`,
      );
    }

    const [recordsResult, reviewResult, batchResult] = await Promise.all([
      recordsQuery,
      supabase
        .from("content_import_rows")
        .select(
          "id,batch_id,row_number,proposed_slug,proposed_symbol,proposed_title,validation_state,review_notes,updated_at",
        )
        .eq("entity_type", entity.code)
        .in("validation_state", [
          "pending_validation",
          "duplicate",
          "unmatched",
          "invalid",
        ])
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("content_import_batches")
        .select("id,source_label")
        .eq("entity_type", entity.code)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const entityError = recordsResult.error ?? reviewResult.error ?? batchResult.error;

    if (entityError) {
      throw entityError;
    }

    const batchLabelMap = new Map((batchResult.data ?? []).map((batch) => [batch.id, batch.source_label]));

    return {
      schemaReady: true,
      schemaError: null,
      entity,
      stats: baseStats,
      records: (recordsResult.data ?? []).map((record) => ({
        id: record.id,
        title: record.title,
        canonicalSlug: record.canonical_slug,
        canonicalSymbol: record.canonical_symbol,
        workflowState: record.workflow_state,
        verificationState: record.verification_state,
        publicationVisibility: record.publication_visibility,
        reviewQueueReason: record.review_queue_reason,
        publishedAt: record.published_at,
        updatedAt: record.updated_at,
      })),
      reviewQueue: (reviewResult.data ?? []).map((row) => ({
        id: row.id,
        batchId: row.batch_id,
        rowNumber: row.row_number,
        proposedSlug: row.proposed_slug,
        proposedSymbol: row.proposed_symbol,
        proposedTitle: row.proposed_title,
        validationState: row.validation_state,
        reviewNotes: row.review_notes,
        updatedAt: row.updated_at,
        sourceLabel: batchLabelMap.get(row.batch_id) ?? "Import batch",
      })),
      activeWorkflow,
      activeVerification,
      activeQuery,
    };
  } catch (error) {
    return {
      schemaReady: false,
      schemaError: isTableMissingError(error)
        ? "The CMS foundation tables are not available yet. Apply the CMS migration and seed before using this operator view."
        : error instanceof Error
          ? error.message
          : "The operator CMS entity view could not load durable records.",
      entity,
      stats: baseStats,
      records: [],
      reviewQueue: [],
      activeWorkflow,
      activeVerification,
      activeQuery,
    };
  }
}
