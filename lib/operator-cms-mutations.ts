import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import {
  cmsVerificationStates,
  cmsWorkflowStates,
  getOperatorCmsEntityDefinition,
} from "@/lib/operator-cms";

type CmsWorkflowState = (typeof cmsWorkflowStates)[number];
type CmsVerificationState = (typeof cmsVerificationStates)[number];

type OperatorCmsSupportedEntityType =
  | "stock"
  | "mutual_fund"
  | "course"
  | "webinar"
  | "etf"
  | "ipo"
  | "sif"
  | "aif"
  | "pms"
  | "newsletter"
  | "research_article"
  | "generic_content";

export type OperatorCmsEditorConfig = {
  entityType: OperatorCmsSupportedEntityType;
  requiresSymbol: boolean;
  requiredFieldLabels: string[];
  titleLabel: string;
  symbolLabel: string;
  sourcePayloadHint: string;
  editorialPayloadHint: string;
  metadataHint: string;
};

type ContentRecordRow = {
  id: string;
  entity_type: string;
  canonical_slug: string;
  canonical_symbol: string | null;
  title: string;
  source_table: string | null;
  source_row_id: string | null;
  workflow_state: CmsWorkflowState;
  verification_state: CmsVerificationState;
  publication_visibility: "private" | "public";
  review_queue_reason: string | null;
  source_payload: Record<string, unknown> | null;
  editorial_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  approved_at: string | null;
  reviewed_at: string | null;
  verified_at: string | null;
};

export type OperatorCmsEditorRecord = {
  id: string;
  entityType: string;
  canonicalSlug: string;
  canonicalSymbol: string;
  title: string;
  workflowState: CmsWorkflowState;
  verificationState: CmsVerificationState;
  publicationVisibility: "private" | "public";
  reviewQueueReason: string;
  sourcePayloadText: string;
  editorialPayloadText: string;
  metadataText: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type OperatorCmsRevisionRow = {
  id: string;
  revisionNumber: number;
  changeSummary: string;
  createdAt: string;
  changedBy: string | null;
};

export type OperatorCmsEditorPageData = {
  schemaReady: boolean;
  schemaError: string | null;
  entity: ReturnType<typeof getOperatorCmsEntityDefinition>;
  config: OperatorCmsEditorConfig | null;
  record: OperatorCmsEditorRecord | null;
  revisions: OperatorCmsRevisionRow[];
};

export type SaveOperatorCmsRecordInput = {
  entityType: string;
  recordId?: string | null;
  title: string;
  canonicalSlug: string;
  canonicalSymbol?: string | null;
  sourceTable?: string | null;
  sourceRowId?: string | null;
  verificationState: string;
  publicationVisibility: string;
  reviewQueueReason?: string | null;
  sourcePayloadText?: string;
  editorialPayloadText?: string;
  metadataText?: string;
  intent?: "save" | "save_draft" | "save_and_review";
  actorId?: string | null;
};

export type OperatorCmsWorkflowAction =
  | "send_for_review"
  | "approve"
  | "publish"
  | "unpublish"
  | "archive"
  | "reject";

export type OperatorCmsWorkflowActionDescriptor = {
  action: OperatorCmsWorkflowAction;
  label: string;
  tone: "primary" | "secondary" | "danger";
  confirmMessage?: string;
};

const editorConfigs: Record<OperatorCmsSupportedEntityType, OperatorCmsEditorConfig> = {
  stock: {
    entityType: "stock",
    requiresSymbol: true,
    requiredFieldLabels: ["title", "slug", "symbol"],
    titleLabel: "Stock name",
    symbolLabel: "Ticker / symbol",
    sourcePayloadHint: '{\n  "exchange": "NSE",\n  "instrument_type": "stock"\n}',
    editorialPayloadHint: '{\n  "hero_summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "sector": "",\n  "notes": ""\n}',
  },
  mutual_fund: {
    entityType: "mutual_fund",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "Fund name",
    symbolLabel: "Scheme code / ISIN",
    sourcePayloadHint: '{\n  "category": "",\n  "amc_name": ""\n}',
    editorialPayloadHint: '{\n  "hero_summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "benchmark": "",\n  "plan_type": ""\n}',
  },
  course: {
    entityType: "course",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "Course title",
    symbolLabel: "Internal course code",
    sourcePayloadHint: '{\n  "level": "",\n  "track": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "duration": "",\n  "instructor": ""\n}',
  },
  webinar: {
    entityType: "webinar",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "Webinar title",
    symbolLabel: "Internal webinar code",
    sourcePayloadHint: '{\n  "event_date": "",\n  "speaker": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "registration_state": "planned",\n  "replay_state": "pending"\n}',
  },
  etf: {
    entityType: "etf",
    requiresSymbol: true,
    requiredFieldLabels: ["title", "slug", "symbol"],
    titleLabel: "ETF name",
    symbolLabel: "Ticker / symbol",
    sourcePayloadHint: '{\n  "issuer": "",\n  "isin": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "category": ""\n}',
  },
  ipo: {
    entityType: "ipo",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "IPO title",
    symbolLabel: "Issue code",
    sourcePayloadHint: '{\n  "status": "",\n  "listing_date": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "ipo_type": ""\n}',
  },
  sif: {
    entityType: "sif",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "SIF product name",
    symbolLabel: "Scheme code",
    sourcePayloadHint: '{\n  "manager_name": "",\n  "strategy": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "category": ""\n}',
  },
  aif: {
    entityType: "aif",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "AIF product name",
    symbolLabel: "Scheme code",
    sourcePayloadHint: '{\n  "manager_name": "",\n  "strategy": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "category": ""\n}',
  },
  pms: {
    entityType: "pms",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "PMS product name",
    symbolLabel: "Internal code",
    sourcePayloadHint: '{\n  "manager_name": "",\n  "strategy": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "category": ""\n}',
  },
  newsletter: {
    entityType: "newsletter",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "Issue title",
    symbolLabel: "Issue code",
    sourcePayloadHint: '{\n  "issue_date": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "channel": "email"\n}',
  },
  research_article: {
    entityType: "research_article",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "Article title",
    symbolLabel: "Internal article code",
    sourcePayloadHint: '{\n  "author": "",\n  "topic": ""\n}',
    editorialPayloadHint: '{\n  "summary": "",\n  "seo_title": "",\n  "seo_description": ""\n}',
    metadataHint: '{\n  "reading_time": ""\n}',
  },
  generic_content: {
    entityType: "generic_content",
    requiresSymbol: false,
    requiredFieldLabels: ["title", "slug"],
    titleLabel: "Content title",
    symbolLabel: "Internal code",
    sourcePayloadHint: "{}",
    editorialPayloadHint: '{\n  "summary": ""\n}',
    metadataHint: "{}",
  },
};

const allowedWorkflowTransitions: Record<CmsWorkflowState, CmsWorkflowState[]> = {
  draft: ["draft", "pending_review", "approved", "archived", "rejected"],
  pending_review: ["draft", "pending_review", "approved", "archived", "rejected"],
  approved: ["draft", "pending_review", "approved", "published", "archived", "rejected"],
  published: ["approved", "archived"],
  archived: ["draft", "pending_review", "approved", "archived"],
  rejected: ["draft", "pending_review", "archived"],
};

function assertCmsAdminReady() {
  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are missing for operator CMS actions.");
  }
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalSymbol(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized ? normalized : null;
}

function parseJsonObjectInput(value: string | undefined, label: string) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function prettyJson(value: Record<string, unknown> | null | undefined) {
  return JSON.stringify(value ?? {}, null, 2);
}

function normalizeWorkflowState(value: string | undefined, fallback: CmsWorkflowState) {
  return cmsWorkflowStates.includes(value as CmsWorkflowState)
    ? (value as CmsWorkflowState)
    : fallback;
}

function normalizeVerificationState(value: string | undefined, fallback: CmsVerificationState) {
  return cmsVerificationStates.includes(value as CmsVerificationState)
    ? (value as CmsVerificationState)
    : fallback;
}

function normalizePublicationVisibility(value: string | undefined, fallback: "private" | "public") {
  return value === "public" || value === "private" ? value : fallback;
}

function isLocalBypassActorId(actorId: string | null | undefined) {
  return !actorId || actorId === "local-admin-bypass";
}

async function readContentRecordOrThrow(recordId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_records")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load CMS record: ${error.message}`);
  }

  if (!data) {
    throw new Error("CMS record not found.");
  }

  return data as ContentRecordRow;
}

async function assertUniqueContentIdentity(input: {
  entityType: string;
  canonicalSlug: string;
  canonicalSymbol: string | null;
  excludeRecordId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: slugRow, error: slugError } = await supabase
    .from("content_records")
    .select("id,title")
    .eq("entity_type", input.entityType)
    .eq("canonical_slug", input.canonicalSlug)
    .maybeSingle();

  if (slugError) {
    throw new Error(`Unable to verify slug uniqueness: ${slugError.message}`);
  }

  if (slugRow && slugRow.id !== input.excludeRecordId) {
    throw new Error("A record with this slug already exists for the selected content type.");
  }

  if (!input.canonicalSymbol) {
    return;
  }

  const { data: symbolRow, error: symbolError } = await supabase
    .from("content_records")
    .select("id,title")
    .eq("entity_type", input.entityType)
    .eq("canonical_symbol", input.canonicalSymbol)
    .maybeSingle();

  if (symbolError) {
    throw new Error(`Unable to verify symbol uniqueness: ${symbolError.message}`);
  }

  if (symbolRow && symbolRow.id !== input.excludeRecordId) {
    throw new Error("A record with this symbol already exists for the selected content type.");
  }
}

async function getNextRevisionNumber(contentRecordId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_record_revisions")
    .select("revision_number")
    .eq("content_record_id", contentRecordId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load CMS revision history: ${error.message}`);
  }

  return (data?.revision_number ?? 0) + 1;
}

async function createRevisionSnapshot(input: {
  contentRecordId: string;
  record: ContentRecordRow;
  changedBy?: string | null;
  changeSummary: string;
}) {
  const supabase = createSupabaseAdminClient();
  const revisionNumber = await getNextRevisionNumber(input.contentRecordId);
  const { error } = await supabase.from("content_record_revisions").insert({
    content_record_id: input.contentRecordId,
    revision_number: revisionNumber,
    snapshot: {
      contentRecord: {
        entity_type: input.record.entity_type,
        canonical_slug: input.record.canonical_slug,
        canonical_symbol: input.record.canonical_symbol,
        title: input.record.title,
        source_table: input.record.source_table,
        source_row_id: input.record.source_row_id,
        workflow_state: input.record.workflow_state,
        verification_state: input.record.verification_state,
        publication_visibility: input.record.publication_visibility,
        review_queue_reason: input.record.review_queue_reason,
        source_payload: input.record.source_payload ?? {},
        editorial_payload: input.record.editorial_payload ?? {},
        metadata: input.record.metadata ?? {},
        verified_at: input.record.verified_at,
        reviewed_at: input.record.reviewed_at,
        approved_at: input.record.approved_at,
        published_at: input.record.published_at,
        archived_at: input.record.archived_at,
      },
    },
    change_summary: input.changeSummary,
    changed_by: isLocalBypassActorId(input.changedBy) ? null : input.changedBy,
  });

  if (error) {
    throw new Error(`Unable to create CMS revision snapshot: ${error.message}`);
  }
}

async function createWorkflowEvent(input: {
  contentRecordId: string;
  eventType: string;
  fromState?: string | null;
  toState?: string | null;
  actorId?: string | null;
  notes?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("content_workflow_events").insert({
    content_record_id: input.contentRecordId,
    event_type: input.eventType,
    from_state: input.fromState ?? null,
    to_state: input.toState ?? null,
    actor_id: isLocalBypassActorId(input.actorId) ? null : input.actorId,
    notes: input.notes ?? null,
    payload: input.payload ?? {},
  });

  if (error) {
    throw new Error(`Unable to create CMS workflow event: ${error.message}`);
  }
}

function getEditorConfigOrThrow(entityType: string) {
  const config = editorConfigs[entityType as OperatorCmsSupportedEntityType];

  if (!config) {
    throw new Error(`Unsupported CMS entity type "${entityType}".`);
  }

  return config;
}

function ensureRequiredFields(input: {
  config: OperatorCmsEditorConfig;
  title: string;
  canonicalSlug: string;
  canonicalSymbol: string | null;
}) {
  if (!input.title.trim()) {
    throw new Error(`${input.config.titleLabel} is required.`);
  }

  if (!input.canonicalSlug.trim()) {
    throw new Error("Slug is required.");
  }

  if (input.config.requiresSymbol && !input.canonicalSymbol) {
    throw new Error(`${input.config.symbolLabel} is required.`);
  }
}

function ensureWorkflowTransitionAllowed(fromState: CmsWorkflowState, toState: CmsWorkflowState) {
  if (!allowedWorkflowTransitions[fromState].includes(toState)) {
    throw new Error(`Cannot move a CMS record from ${fromState} to ${toState}.`);
  }
}

function requiresSourceBacking(entityType: string) {
  return entityType === "stock" || entityType === "mutual_fund" || entityType === "ipo";
}

function ensurePublishableSourceBacking(input: {
  entityType: string;
  workflowState: CmsWorkflowState;
  sourceRowId: string | null;
}) {
  if (input.workflowState !== "published") {
    return;
  }

  if (requiresSourceBacking(input.entityType) && !input.sourceRowId) {
    throw new Error(
      `Published ${input.entityType.replaceAll("_", " ")} records must stay attached to a real source row.`,
    );
  }
}

function computeRecordChangeSummary(previous: ContentRecordRow | null, next: ContentRecordRow) {
  if (!previous) {
    return "Created CMS record.";
  }

  const changedFields: string[] = [];

  if (previous.title !== next.title) changedFields.push("title");
  if (previous.canonical_slug !== next.canonical_slug) changedFields.push("slug");
  if ((previous.canonical_symbol ?? "") !== (next.canonical_symbol ?? "")) changedFields.push("symbol");
  if (previous.workflow_state !== next.workflow_state) changedFields.push("workflow");
  if (previous.verification_state !== next.verification_state) changedFields.push("verification");
  if (previous.publication_visibility !== next.publication_visibility) changedFields.push("visibility");
  if ((previous.review_queue_reason ?? "") !== (next.review_queue_reason ?? "")) changedFields.push("review reason");
  if (JSON.stringify(previous.source_payload ?? {}) !== JSON.stringify(next.source_payload ?? {})) {
    changedFields.push("source payload");
  }
  if (JSON.stringify(previous.editorial_payload ?? {}) !== JSON.stringify(next.editorial_payload ?? {})) {
    changedFields.push("editorial payload");
  }
  if (JSON.stringify(previous.metadata ?? {}) !== JSON.stringify(next.metadata ?? {})) {
    changedFields.push("metadata");
  }

  if (!changedFields.length) {
    return "No meaningful record changes.";
  }

  return `Updated ${changedFields.join(", ")}.`;
}

function mapRecordToEditorRecord(row: ContentRecordRow): OperatorCmsEditorRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    canonicalSlug: row.canonical_slug,
    canonicalSymbol: row.canonical_symbol ?? "",
    title: row.title,
    workflowState: row.workflow_state,
    verificationState: row.verification_state,
    publicationVisibility: row.publication_visibility,
    reviewQueueReason: row.review_queue_reason ?? "",
    sourcePayloadText: prettyJson(row.source_payload),
    editorialPayloadText: prettyJson(row.editorial_payload),
    metadataText: prettyJson(row.metadata),
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export function getOperatorCmsEditorConfig(entityType: string) {
  return editorConfigs[entityType as OperatorCmsSupportedEntityType] ?? null;
}

export function getOperatorCmsWorkflowActionDescriptors(input: {
  workflowState: string;
  verificationState: string;
}): OperatorCmsWorkflowActionDescriptor[] {
  const state = normalizeWorkflowState(input.workflowState, "draft");
  const verificationState = normalizeVerificationState(
    input.verificationState,
    "unverified",
  );

  switch (state) {
    case "draft":
      return [
        {
          action: "send_for_review",
          label: "Send to review",
          tone: "primary",
        },
        {
          action: "approve",
          label: "Approve",
          tone: "secondary",
        },
        {
          action: "reject",
          label: "Reject",
          tone: "danger",
          confirmMessage:
            "Reject this CMS record? It will stay internal and move to the rejected state.",
        },
        {
          action: "archive",
          label: "Archive",
          tone: "secondary",
          confirmMessage:
            "Archive this CMS record? This is a soft archive and can be reopened later.",
        },
      ] satisfies OperatorCmsWorkflowActionDescriptor[];
    case "pending_review":
      return [
        {
          action: "approve",
          label: "Approve",
          tone: "primary",
        },
        {
          action: "reject",
          label: "Reject",
          tone: "danger",
          confirmMessage:
            "Reject this CMS record? It will remain internal and be marked rejected.",
        },
        {
          action: "archive",
          label: "Archive",
          tone: "secondary",
          confirmMessage:
            "Archive this CMS record? This is a soft archive and can be reopened later.",
        },
      ] satisfies OperatorCmsWorkflowActionDescriptor[];
    case "approved":
      return [
        ...(verificationState === "verified"
          ? ([
              {
                action: "publish",
                label: "Publish",
                tone: "primary",
                confirmMessage:
                  "Publish this CMS record? Only approved and verified content should be published.",
              },
            ] satisfies OperatorCmsWorkflowActionDescriptor[])
          : []),
        {
          action: "reject",
          label: "Reject",
          tone: "danger",
          confirmMessage:
            "Reject this CMS record? This will pull it out of the approved lane.",
        },
        {
          action: "archive",
          label: "Archive",
          tone: "secondary",
          confirmMessage:
            "Archive this CMS record? This is a soft archive and can be reopened later.",
        },
      ];
    case "published":
      return [
        {
          action: "unpublish",
          label: "Unpublish",
          tone: "secondary",
          confirmMessage:
            "Unpublish this CMS record? It will remain internal and leave the published state.",
        },
        {
          action: "archive",
          label: "Archive",
          tone: "danger",
          confirmMessage:
            "Archive this CMS record? This is a soft archive and will remove it from the active lane.",
        },
      ] satisfies OperatorCmsWorkflowActionDescriptor[];
    case "archived":
      return [
        {
          action: "send_for_review",
          label: "Reopen for review",
          tone: "primary",
        },
        {
          action: "approve",
          label: "Approve",
          tone: "secondary",
        },
      ] satisfies OperatorCmsWorkflowActionDescriptor[];
    case "rejected":
      return [
        {
          action: "send_for_review",
          label: "Return to review",
          tone: "primary",
        },
        {
          action: "archive",
          label: "Archive",
          tone: "secondary",
          confirmMessage:
            "Archive this rejected CMS record? This is a soft archive and can be reopened later.",
        },
      ] satisfies OperatorCmsWorkflowActionDescriptor[];
    default:
      return [] satisfies OperatorCmsWorkflowActionDescriptor[];
  }
}

export async function getOperatorCmsRecordEditorData(input: {
  entityType: string;
  recordId?: string | null;
}): Promise<OperatorCmsEditorPageData> {
  const entity = getOperatorCmsEntityDefinition(input.entityType);
  const config = getOperatorCmsEditorConfig(input.entityType);

  if (!entity || !config) {
    return {
      schemaReady: true,
      schemaError: null,
      entity: null,
      config: null,
      record: null,
      revisions: [],
    };
  }

  if (!hasRuntimeSupabaseAdminEnv()) {
    return {
      schemaReady: false,
      schemaError:
        "Supabase admin environment variables are missing, so the CMS editor cannot read durable records yet.",
      entity,
      config,
      record: null,
      revisions: [],
    };
  }

  if (!input.recordId) {
    return {
      schemaReady: true,
      schemaError: null,
      entity,
      config,
      record: null,
      revisions: [],
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const [recordResult, revisionResult] = await Promise.all([
      supabase
        .from("content_records")
        .select("*")
        .eq("id", input.recordId)
        .eq("entity_type", entity.code)
        .maybeSingle(),
      supabase
        .from("content_record_revisions")
        .select("id,revision_number,change_summary,created_at,changed_by")
        .eq("content_record_id", input.recordId)
        .order("revision_number", { ascending: false })
        .limit(30),
    ]);

    const error = recordResult.error ?? revisionResult.error;

    if (error) {
      throw new Error(error.message);
    }

    if (!recordResult.data) {
      throw new Error("CMS record not found.");
    }

    return {
      schemaReady: true,
      schemaError: null,
      entity,
      config,
      record: mapRecordToEditorRecord(recordResult.data as ContentRecordRow),
      revisions: (revisionResult.data ?? []).map((row) => ({
        id: row.id,
        revisionNumber: row.revision_number,
        changeSummary: row.change_summary ?? "Revision snapshot",
        createdAt: row.created_at,
        changedBy: row.changed_by,
      })),
    };
  } catch (error) {
    return {
      schemaReady: false,
      schemaError: error instanceof Error ? error.message : "Unable to load CMS editor data.",
      entity,
      config,
      record: null,
      revisions: [],
    };
  }
}

export async function saveOperatorCmsRecord(input: SaveOperatorCmsRecordInput) {
  assertCmsAdminReady();
  const entity = getOperatorCmsEntityDefinition(input.entityType);
  const config = getEditorConfigOrThrow(input.entityType);

  if (!entity) {
    throw new Error(`CMS entity type "${input.entityType}" is not registered.`);
  }

  const normalizedTitle = input.title.trim();
  const normalizedSlug = normalizeSlug(input.canonicalSlug);
  const normalizedSymbol = normalizeOptionalSymbol(input.canonicalSymbol);
  ensureRequiredFields({
    config,
    title: normalizedTitle,
    canonicalSlug: normalizedSlug,
    canonicalSymbol: normalizedSymbol,
  });

  const sourcePayload = parseJsonObjectInput(input.sourcePayloadText, "Source payload");
  const editorialPayload = parseJsonObjectInput(input.editorialPayloadText, "Editorial payload");
  const metadata = parseJsonObjectInput(input.metadataText, "Metadata");

  const supabase = createSupabaseAdminClient();
  const actorId = isLocalBypassActorId(input.actorId) ? null : input.actorId;
  const existingRecord = input.recordId ? await readContentRecordOrThrow(input.recordId) : null;

  if (existingRecord && existingRecord.entity_type !== entity.code) {
    throw new Error("Cannot move a CMS record into a different content type.");
  }

  const nextWorkflowState = normalizeWorkflowState(
    input.intent === "save_draft"
      ? "draft"
      : input.intent === "save_and_review"
        ? "pending_review"
        : existingRecord?.workflow_state ?? "draft",
    existingRecord?.workflow_state ?? "draft",
  );
  const nextVerificationState = normalizeVerificationState(
    input.verificationState,
    existingRecord?.verification_state ?? "unverified",
  );
  const nextPublicationVisibility = normalizePublicationVisibility(
    input.publicationVisibility,
    existingRecord?.publication_visibility ?? "private",
  );
  const nextSourceTable =
    input.sourceTable?.trim() ||
    existingRecord?.source_table ||
    entity.sourceTable ||
    null;
  const nextSourceRowId =
    typeof input.sourceRowId === "string"
      ? input.sourceRowId.trim() || null
      : existingRecord?.source_row_id ?? null;

  if (existingRecord) {
    ensureWorkflowTransitionAllowed(existingRecord.workflow_state, nextWorkflowState);
  }

  if (nextWorkflowState === "published" && nextVerificationState !== "verified") {
    throw new Error("Only verified CMS records can be published.");
  }

  ensurePublishableSourceBacking({
    entityType: entity.code,
    workflowState: nextWorkflowState,
    sourceRowId: nextSourceRowId,
  });

  await assertUniqueContentIdentity({
    entityType: entity.code,
    canonicalSlug: normalizedSlug,
    canonicalSymbol: normalizedSymbol,
    excludeRecordId: existingRecord?.id ?? null,
  });

  const nowIso = new Date().toISOString();
  const payload = {
    entity_type: entity.code,
    canonical_slug: normalizedSlug,
    canonical_symbol: normalizedSymbol,
    title: normalizedTitle,
    source_table: nextSourceTable,
    source_row_id: nextSourceRowId,
    workflow_state: nextWorkflowState,
    verification_state: nextVerificationState,
    publication_visibility: nextPublicationVisibility,
    review_queue_reason: input.reviewQueueReason?.trim() || null,
    source_payload: sourcePayload,
    editorial_payload: editorialPayload,
    metadata,
    updated_by: actorId,
    reviewed_at: nextWorkflowState === "pending_review" ? nowIso : existingRecord?.reviewed_at ?? null,
    approved_at:
      nextWorkflowState === "approved"
        ? nowIso
        : nextWorkflowState === "published"
          ? existingRecord?.approved_at ?? nowIso
          : nextWorkflowState === "draft" || nextWorkflowState === "rejected"
            ? null
            : existingRecord?.approved_at ?? null,
    published_at:
      nextWorkflowState === "published"
        ? existingRecord?.published_at ?? nowIso
        : nextWorkflowState === "approved" || nextWorkflowState === "draft" || nextWorkflowState === "rejected"
          ? null
          : existingRecord?.published_at ?? null,
    archived_at: nextWorkflowState === "archived" ? nowIso : nextWorkflowState === "draft" ? null : existingRecord?.archived_at ?? null,
    verified_at: nextVerificationState === "verified" ? existingRecord?.verified_at ?? nowIso : nextVerificationState === "rejected" ? null : existingRecord?.verified_at ?? null,
  };

  if (!existingRecord) {
    const { data, error } = await supabase
      .from("content_records")
      .insert({
        ...payload,
        created_by: actorId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Unable to create CMS record: ${error.message}`);
    }

    const createdRecord = data as ContentRecordRow;
    await createWorkflowEvent({
      contentRecordId: createdRecord.id,
      eventType: "created",
      fromState: null,
      toState: createdRecord.workflow_state,
      actorId,
      notes: "CMS record created from operator editor.",
    });
    await createRevisionSnapshot({
      contentRecordId: createdRecord.id,
      record: createdRecord,
      changedBy: actorId,
      changeSummary: "Created CMS record.",
    });

    return {
      recordId: createdRecord.id,
      entityType: entity.code,
      message: "CMS record created.",
    };
  }

  const { data, error } = await supabase
    .from("content_records")
    .update(payload)
    .eq("id", existingRecord.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update CMS record: ${error.message}`);
  }

  const updatedRecord = data as ContentRecordRow;
  const changeSummary = computeRecordChangeSummary(existingRecord, updatedRecord);

  if (changeSummary !== "No meaningful record changes.") {
    await createRevisionSnapshot({
      contentRecordId: updatedRecord.id,
      record: updatedRecord,
      changedBy: actorId,
      changeSummary,
    });

    if (existingRecord.workflow_state !== updatedRecord.workflow_state) {
      await createWorkflowEvent({
        contentRecordId: updatedRecord.id,
        eventType: "record_saved",
        fromState: existingRecord.workflow_state,
        toState: updatedRecord.workflow_state,
        actorId,
        notes: changeSummary,
      });
    }
  }

  return {
    recordId: updatedRecord.id,
    entityType: entity.code,
    message:
      changeSummary === "No meaningful record changes."
        ? "No meaningful changes were detected."
        : "CMS record saved.",
  };
}

export async function transitionOperatorCmsRecord(input: {
  recordId: string;
  action: OperatorCmsWorkflowAction;
  actorId?: string | null;
  notes?: string | null;
}) {
  assertCmsAdminReady();
  const currentRecord = await readContentRecordOrThrow(input.recordId);
  const actorId = isLocalBypassActorId(input.actorId) ? null : input.actorId;
  let nextState: CmsWorkflowState;
  let reviewNote = input.notes ?? null;

  switch (input.action) {
    case "send_for_review":
      nextState = "pending_review";
      break;
    case "approve":
      nextState = "approved";
      break;
    case "publish":
      if (currentRecord.verification_state !== "verified") {
        throw new Error("Only verified CMS records can be published.");
      }
      ensurePublishableSourceBacking({
        entityType: currentRecord.entity_type,
        workflowState: "published",
        sourceRowId: currentRecord.source_row_id,
      });
      nextState = "published";
      break;
    case "unpublish":
      nextState = currentRecord.verification_state === "verified" ? "approved" : "pending_review";
      break;
    case "archive":
      nextState = "archived";
      break;
    case "reject":
      nextState = "rejected";
      break;
    default:
      throw new Error("Unsupported CMS workflow action.");
  }

  ensureWorkflowTransitionAllowed(currentRecord.workflow_state, nextState);

  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_records")
    .update({
      workflow_state: nextState,
      updated_by: actorId,
      updated_at: nowIso,
      reviewed_at: nextState === "pending_review" ? nowIso : currentRecord.reviewed_at,
      approved_at:
        nextState === "approved"
          ? nowIso
          : nextState === "published"
            ? currentRecord.approved_at ?? nowIso
            : nextState === "rejected"
              ? null
              : currentRecord.approved_at,
      published_at:
        nextState === "published"
          ? currentRecord.published_at ?? nowIso
          : nextState === "approved" || nextState === "pending_review" || nextState === "rejected"
            ? null
            : currentRecord.published_at,
      archived_at: nextState === "archived" ? nowIso : currentRecord.archived_at,
    })
    .eq("id", currentRecord.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to change CMS workflow state: ${error.message}`);
  }

  const updatedRecord = data as ContentRecordRow;
  await createWorkflowEvent({
    contentRecordId: updatedRecord.id,
    eventType: input.action,
    fromState: currentRecord.workflow_state,
    toState: updatedRecord.workflow_state,
    actorId,
    notes: reviewNote,
  });
  await createRevisionSnapshot({
    contentRecordId: updatedRecord.id,
    record: updatedRecord,
    changedBy: actorId,
    changeSummary: `Workflow changed from ${currentRecord.workflow_state} to ${updatedRecord.workflow_state}.`,
  });

  return {
    entityType: updatedRecord.entity_type,
    recordId: updatedRecord.id,
    message: `CMS record moved to ${updatedRecord.workflow_state.replaceAll("_", " ")}.`,
  };
}

export async function rollbackOperatorCmsRecord(input: {
  recordId: string;
  revisionId: string;
  actorId?: string | null;
}) {
  assertCmsAdminReady();
  const currentRecord = await readContentRecordOrThrow(input.recordId);
  const supabase = createSupabaseAdminClient();
  const actorId = isLocalBypassActorId(input.actorId) ? null : input.actorId;

  const { data: revisionRow, error: revisionError } = await supabase
    .from("content_record_revisions")
    .select("id,revision_number,snapshot")
    .eq("id", input.revisionId)
    .eq("content_record_id", input.recordId)
    .maybeSingle();

  if (revisionError) {
    throw new Error(`Unable to load CMS revision for rollback: ${revisionError.message}`);
  }

  if (!revisionRow) {
    throw new Error("Requested CMS revision was not found.");
  }

  const snapshot = revisionRow.snapshot as {
    contentRecord?: Partial<ContentRecordRow>;
  } | null;
  const contentRecord = snapshot?.contentRecord;

  if (!contentRecord) {
    throw new Error("CMS revision snapshot is incomplete and cannot be rolled back.");
  }

  const restoredSlug = normalizeSlug(contentRecord.canonical_slug ?? currentRecord.canonical_slug);
  const restoredSymbol = normalizeOptionalSymbol(contentRecord.canonical_symbol ?? currentRecord.canonical_symbol);

  await assertUniqueContentIdentity({
    entityType: currentRecord.entity_type,
    canonicalSlug: restoredSlug,
    canonicalSymbol: restoredSymbol,
    excludeRecordId: currentRecord.id,
  });

  const restoredWorkflow = normalizeWorkflowState(
    contentRecord.workflow_state,
    currentRecord.workflow_state,
  );

  if (
    restoredWorkflow === "published" &&
    normalizeVerificationState(contentRecord.verification_state, currentRecord.verification_state) !==
      "verified"
  ) {
    throw new Error("Cannot roll back to a published state unless the revision is verified.");
  }

  ensurePublishableSourceBacking({
    entityType: currentRecord.entity_type,
    workflowState: restoredWorkflow,
    sourceRowId:
      typeof contentRecord.source_row_id === "string"
        ? contentRecord.source_row_id
        : currentRecord.source_row_id,
  });

  const { data, error } = await supabase
    .from("content_records")
    .update({
      canonical_slug: restoredSlug,
      canonical_symbol: restoredSymbol,
      title: String(contentRecord.title ?? currentRecord.title),
      workflow_state: restoredWorkflow,
      verification_state: normalizeVerificationState(
        contentRecord.verification_state,
        currentRecord.verification_state,
      ),
      publication_visibility: normalizePublicationVisibility(
        contentRecord.publication_visibility,
        currentRecord.publication_visibility,
      ),
      review_queue_reason:
        typeof contentRecord.review_queue_reason === "string"
          ? contentRecord.review_queue_reason
          : currentRecord.review_queue_reason,
      source_payload:
        contentRecord.source_payload && typeof contentRecord.source_payload === "object"
          ? contentRecord.source_payload
          : currentRecord.source_payload,
      editorial_payload:
        contentRecord.editorial_payload && typeof contentRecord.editorial_payload === "object"
          ? contentRecord.editorial_payload
          : currentRecord.editorial_payload,
      metadata:
        contentRecord.metadata && typeof contentRecord.metadata === "object"
          ? contentRecord.metadata
          : currentRecord.metadata,
      verified_at: contentRecord.verified_at ?? currentRecord.verified_at,
      reviewed_at: contentRecord.reviewed_at ?? currentRecord.reviewed_at,
      approved_at: contentRecord.approved_at ?? currentRecord.approved_at,
      published_at: contentRecord.published_at ?? null,
      archived_at: contentRecord.archived_at ?? null,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentRecord.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to roll back CMS record: ${error.message}`);
  }

  const restoredRecord = data as ContentRecordRow;
  await createWorkflowEvent({
    contentRecordId: restoredRecord.id,
    eventType: "rollback",
    fromState: currentRecord.workflow_state,
    toState: restoredRecord.workflow_state,
    actorId,
    notes: `Rolled back to revision #${revisionRow.revision_number}.`,
    payload: {
      revisionId: revisionRow.id,
      revisionNumber: revisionRow.revision_number,
    },
  });
  await createRevisionSnapshot({
    contentRecordId: restoredRecord.id,
    record: restoredRecord,
    changedBy: actorId,
    changeSummary: `Rolled back to revision #${revisionRow.revision_number}.`,
  });

  return {
    entityType: restoredRecord.entity_type,
    recordId: restoredRecord.id,
    message: `Rolled back to revision #${revisionRow.revision_number}.`,
  };
}
