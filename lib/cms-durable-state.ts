import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import {
  createPublicReadHelper,
  createUserSessionHelper,
  hasAdminServerHelper,
  hasPublicReadHelper,
  hasUserSessionHelper,
} from "@/lib/supabase/access-helpers";
import type {
  AdminGlobalCollectionKey,
  AdminGlobalModule,
  AdminGlobalRevision,
  AdminManagedRecord,
  AdminMembershipTier,
  AdminRecordRevision,
  AdminRefreshJob,
} from "@/lib/admin-operator-store";
import { normalizeAdminPublishState } from "@/lib/admin-operator-store";
import type { LaunchConfigStore } from "@/lib/launch-config-store";
import type {
  CmsPreviewSession,
  CmsRecordVersion,
  MediaAsset,
  ProductUserProfile,
  ProductUserCapability,
  RefreshJobRun,
  SystemSettings,
  UserPortfolioHolding,
  UserWatchlistItem,
} from "@/lib/user-product-store";
import { normalizeMembershipFeatureAccess } from "@/lib/membership-product-features";
import { normalizeProductUserCapabilities } from "@/lib/product-permissions";

type ProductUserProfileRow = {
  id: string;
  user_key: string;
  auth_user_id: string | null;
  username?: string | null;
  email: string;
  name: string;
  website_url?: string | null;
  x_handle?: string | null;
  linkedin_url?: string | null;
  instagram_handle?: string | null;
  youtube_url?: string | null;
  profile_visible: boolean | null;
  membership_tier: string | null;
  role: "admin" | "editor" | "user";
  capabilities?: unknown;
  created_at: string;
  last_active_at: string;
  updated_at: string;
};

type UserWatchlistItemRow = {
  id: string;
  product_user_profile_id: string;
  stock_slug: string;
  stock_symbol: string;
  stock_name: string;
  added_at: string;
};

type UserPortfolioHoldingRow = {
  id: string;
  product_user_profile_id: string;
  stock_slug: string;
  stock_symbol: string;
  stock_name: string;
  quantity: number | string;
  buy_price: number | string;
  added_at: string;
  updated_at: string;
};

type SystemSettingsRow = {
  settings_key: string;
  site_name: string;
  default_meta_title_suffix: string;
  default_meta_description: string;
  default_og_image: string;
  default_canonical_base: string;
  public_head_code: string | null;
  default_no_index: boolean;
  default_membership_tier: string;
  default_locked_cta_label: string;
  support_email: string;
  support_route: string;
  preview_enabled: boolean;
  media_uploads_enabled: boolean;
  watchlist_enabled: boolean;
  portfolio_enabled: boolean;
  updated_at: string;
};

type MediaAssetRow = {
  id: string;
  title: string;
  alt_text: string;
  url: string;
  asset_type: "image" | "document";
  category: string | null;
  source_kind: "upload" | "external_url";
  file_name: string;
  mime_type: string;
  size_bytes: number | null;
  tags: unknown;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string | null;
  status: "draft" | "published";
};

type CmsPreviewSessionRow = {
  token: string;
  family: string;
  slug: string;
  title: string;
  route_target: string | null;
  created_by: string;
  created_at: string;
  expires_at: string;
  payload: unknown;
};

type CmsRecordVersionRow = {
  id: string;
  family: string;
  slug: string;
  title: string;
  saved_at: string;
  saved_by: string;
  status: "draft" | "review" | "ready_for_review" | "needs_fix" | "published" | "archived";
  route_target: string | null;
  changed_fields: unknown;
  snapshot: unknown;
};

type RefreshJobRunRow = {
  id: string;
  job_key: string;
  status: "running" | "healthy" | "failed" | "warning";
  started_at: string;
  finished_at: string | null;
  error: string | null;
  note: string | null;
  requested_by: string | null;
  retried_from_run_id: string | null;
};

type AdminMembershipTierRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "active" | "archived";
  active: boolean;
  display_order: number;
  visibility: "public" | "private";
  cta_label: string;
  cta_href: string;
  included_families: unknown;
  included_records: unknown;
  excluded_records: unknown;
  feature_access: unknown;
  internal_notes: string | null;
  updated_at: string;
};

type AdminManagedRecordRow = {
  id: string;
  family: string;
  slug: string;
  title: string;
  symbol: string | null;
  benchmark_mapping: string | null;
  status: "draft" | "review" | "ready_for_review" | "needs_fix" | "published" | "archived";
  visibility: "public" | "private" | "archived";
  public_href: string | null;
  canonical_route: string | null;
  source_table: string | null;
  source_row_id: string | null;
  source_label: string;
  source_date: string;
  source_url: string;
  source_state: unknown;
  refresh_state: unknown;
  access_control: unknown;
  assigned_to: string | null;
  assigned_by: string | null;
  due_date: string | null;
  sections: unknown;
  documents: unknown;
  imports: unknown;
  scheduled_publish_at: string | null;
  scheduled_unpublish_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminRecordRevisionRow = {
  id: string;
  family: string;
  slug: string;
  title: string;
  editor: string;
  action: string;
  changed_fields: unknown;
  reason: string;
  revision_state: "Published" | "Review ready" | "Rollback staged";
  route_target: string;
  edited_at: string;
};

type AdminGlobalModuleRow = {
  id: string;
  section: AdminGlobalCollectionKey;
  title: string;
  eyebrow: string;
  body: string;
  href: string;
  cta_label: string;
  module_type: string;
  featured: boolean;
  priority: number | string;
  archive_group: string | null;
  visibility_families: unknown;
  assignments: unknown;
  coming_soon: boolean;
  hide_until_ready: boolean;
  enabled: boolean;
  status: "draft" | "published";
  placement: string;
  sort_order: number | string;
  updated_at: string;
};

type AdminGlobalRevisionRow = {
  id: string;
  section: "header" | "footer" | "pageSidebar" | AdminGlobalCollectionKey;
  title: string;
  editor: string;
  action: string;
  status: "draft" | "published" | "reverted";
  changed_count: number | string;
  edited_at: string;
};

type AdminRefreshJobRow = {
  id: string;
  key: string;
  name: string;
  family: string;
  lane: string;
  enabled: boolean;
  cadence: string;
  source_dependency: string;
  last_run_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  latest_status: "healthy" | "running" | "warning" | "failed" | "paused" | "planned";
  latest_error: string | null;
  next_scheduled_run_at: string | null;
  manual_run_supported: boolean;
  affected_records_count: number | string | null;
  last_operator_action_at: string | null;
  last_operator_note: string | null;
};

type LaunchConfigSectionRow = {
  section: keyof Omit<LaunchConfigStore, "updatedAt">;
  data: unknown;
  updated_at: string;
};

type AdminActivityLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_email: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  target_family: string | null;
  target_slug: string | null;
  summary: string;
  metadata: unknown;
  created_at: string;
};

type AdminEditorLockRow = {
  id: string;
  family: string;
  slug: string;
  editor_user_id: string | null;
  editor_email: string;
  started_at: string;
  last_heartbeat_at: string;
  expires_at: string;
};

type AdminPendingApprovalRow = {
  id: string;
  family: string;
  slug: string;
  title: string;
  record_id: string | null;
  submitted_by_user_id: string | null;
  submitted_by_email: string;
  submitted_at: string;
  updated_at: string;
  decision: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  reviewed_by_email: string | null;
  review_note: string | null;
  action_type: string;
  target_status: "draft" | "review" | "ready_for_review" | "needs_fix" | "published" | "archived";
  summary: string;
  changed_fields: unknown;
  snapshot: unknown;
  base_record_updated_at: string | null;
};

type AdminImportBatchRow = {
  id: string;
  family: string;
  actor_user_id: string | null;
  actor_email: string;
  file_name: string;
  import_mode: "create_new_only" | "update_existing_only" | "create_or_update";
  status:
    | "preview_ready"
    | "completed"
    | "completed_with_errors"
    | "queued_for_approval"
    | "failed";
  source_kind: "csv";
  storage_mode: "durable" | "fallback";
  total_rows: number | string;
  valid_rows: number | string;
  warning_rows: number | string;
  failed_rows: number | string;
  created_count: number | string;
  updated_count: number | string;
  queued_count: number | string;
  skipped_count: number | string;
  failed_count: number | string;
  summary: string;
  field_mapping: unknown;
  uploaded_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminImportRowRow = {
  id: string;
  batch_id: string;
  row_number: number | string;
  identifier: string | null;
  title: string | null;
  slug: string | null;
  matched_record_id: string | null;
  matched_slug: string | null;
  operation: "create" | "update" | "skip" | "queue_for_approval";
  status:
    | "valid"
    | "warning"
    | "failed"
    | "created"
    | "updated"
    | "skipped"
    | "queued_for_approval";
  warnings: unknown;
  errors: unknown;
  payload: unknown;
  result_note: string;
  created_at: string;
  updated_at: string;
};

const TABLES = {
  productUserProfiles: "product_user_profiles",
  productUserWatchlistItems: "product_user_watchlist_items",
  productUserPortfolioHoldings: "product_user_portfolio_holdings",
  productSystemSettings: "product_system_settings",
  cmsMediaAssets: "cms_media_assets",
  cmsPreviewSessions: "cms_preview_sessions",
  cmsRecordVersions: "cms_record_versions",
  cmsRefreshJobRuns: "cms_refresh_job_runs",
  cmsMembershipTiers: "cms_membership_tiers",
  cmsAdminRecords: "cms_admin_records",
  cmsAdminRecordRevisions: "cms_admin_record_revisions",
  cmsAdminGlobalModules: "cms_admin_global_modules",
  cmsAdminGlobalRevisions: "cms_admin_global_revisions",
  cmsAdminRefreshJobs: "cms_admin_refresh_jobs",
  cmsLaunchConfigSections: "cms_launch_config_sections",
  cmsAdminActivityLog: "cms_admin_activity_log",
  cmsAdminEditorLocks: "cms_admin_editor_locks",
  cmsAdminPendingApprovals: "cms_admin_pending_approvals",
  cmsAdminImportBatches: "cms_admin_import_batches",
  cmsAdminImportRows: "cms_admin_import_rows",
} as const;

const PRODUCT_USER_PROFILE_SELECT_FULL =
  "id,user_key,auth_user_id,username,email,name,website_url,x_handle,linkedin_url,instagram_handle,youtube_url,profile_visible,membership_tier,role,capabilities,created_at,last_active_at,updated_at";
const PRODUCT_USER_PROFILE_SELECT_LEAN =
  "id,user_key,auth_user_id,username,email,name,profile_visible,membership_tier,role,capabilities,created_at,last_active_at,updated_at";
const PRODUCT_USER_PROFILE_SELECT_LEGACY =
  "id,user_key,auth_user_id,email,name,membership_tier,role,created_at,last_active_at,updated_at";
const PRODUCT_USER_PROFILE_SELECT_ATTEMPTS = [
  PRODUCT_USER_PROFILE_SELECT_FULL,
  PRODUCT_USER_PROFILE_SELECT_LEAN,
  PRODUCT_USER_PROFILE_SELECT_LEGACY,
] as const;

const missingTables = new Set<string>();

function formatDurableError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      code?: string | number;
      message?: string;
      details?: string | null;
      hint?: string | null;
      status?: string | number;
    };

    return {
      code: candidate.code ?? null,
      message: candidate.message ?? null,
      details: candidate.details ?? null,
      hint: candidate.hint ?? null,
      status: candidate.status ?? null,
    };
  }

  return error;
}

function formatDurableErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      code?: string | number;
      message?: string;
      details?: string | null;
      hint?: string | null;
    };
    const parts = [
      candidate.code ? `[${candidate.code}]` : null,
      candidate.message ?? null,
      candidate.details ?? null,
      candidate.hint ? `Hint: ${candidate.hint}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return "Unknown durable profile error.";
}

function logDurableProfileError(
  operation: "get_by_auth_user_id" | "get_by_user_key" | "get_by_email" | "save" | "touch_last_active",
  error: unknown,
  context: Record<string, unknown> = {},
) {
  console.error("[cms-durable-state] product_user_profiles durable operation failed", {
    operation,
    table: TABLES.productUserProfiles,
    ...context,
    error: formatDurableError(error),
  });
}

function logDurableAdminActivityError(
  operation: "list" | "append",
  error: unknown,
  context: Record<string, unknown> = {},
) {
  console.error("[cms-durable-state] cms_admin_activity_log durable operation failed", {
    operation,
    table: TABLES.cmsAdminActivityLog,
    ...context,
    error: formatDurableError(error),
  });
}

function logDurableAdminRecordError(
  operation: "save_record" | "append_record_revision" | "append_record_version",
  error: unknown,
  context: Record<string, unknown> = {},
) {
  console.error("[cms-durable-state] admin record durable operation failed", {
    operation,
    ...context,
    error: formatDurableError(error),
  });
}

function logDurableAdminApprovalError(
  operation: "save_pending_approval",
  error: unknown,
  context: Record<string, unknown> = {},
) {
  console.error("[cms-durable-state] cms_admin_pending_approvals durable operation failed", {
    operation,
    table: TABLES.cmsAdminPendingApprovals,
    ...context,
    error: formatDurableError(error),
  });
}

function logDurableAdminImportError(
  operation: "list_batches" | "list_rows" | "save_batch" | "replace_rows",
  error: unknown,
  context: Record<string, unknown> = {},
) {
  console.error("[cms-durable-state] admin import durable operation failed", {
    operation,
    ...context,
    error: formatDurableError(error),
  });
}

function cleanString(value: string | null | undefined, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(String(item ?? ""))).filter(Boolean)
    : [];
}

function hasAdminDurableTable(table: string) {
  return hasAdminServerHelper() && !missingTables.has(table);
}

function hasSessionDurableTable(table: string) {
  return hasUserSessionHelper() && !missingTables.has(table);
}

function hasPublicDurableTable(table: string) {
  return hasPublicReadHelper() && !missingTables.has(table);
}

function hasDurableTable(table: string) {
  return hasAdminDurableTable(table);
}

function isMissingTableError(error: unknown, table: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  return (
    candidate.code === "PGRST205" ||
    message.includes(`public.${table}`) ||
    message.includes(table)
  );
}

function markTableMissing(table: string, error: unknown) {
  if (isMissingTableError(error, table)) {
    missingTables.add(table);
    return true;
  }

  return false;
}

export function hasDurableCmsStateStore() {
  return hasRuntimeSupabaseAdminEnv();
}

export function hasDurableUserSessionStateStore() {
  return hasUserSessionHelper();
}

export function hasDurablePublicReadStateStore() {
  return hasPublicReadHelper();
}

function mapProfileRow(row: ProductUserProfileRow): ProductUserProfile {
  const email = cleanString(row.email);
  const username =
    cleanString(row.username) ||
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") ||
    cleanString(row.user_key);
  return {
    id: cleanString(row.id),
    userKey: cleanString(row.user_key),
    authUserId: cleanString(row.auth_user_id) || cleanString(row.user_key),
    name: cleanString(row.name),
    email,
    username,
    websiteUrl: cleanString(row.website_url) || null,
    xHandle: cleanString(row.x_handle) || null,
    linkedinUrl: cleanString(row.linkedin_url) || null,
    instagramHandle: cleanString(row.instagram_handle) || null,
    youtubeUrl: cleanString(row.youtube_url) || null,
    profileVisible: row.profile_visible !== false,
    membershipTier: cleanString(row.membership_tier) || null,
    role: row.role,
    capabilities: normalizeProductUserCapabilities(row.capabilities),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
    lastActiveAt: cleanString(row.last_active_at),
  };
}

async function selectDurableUserProfileRow(
  queryRunner: (selectClause: string) => Promise<{ data: unknown; error: unknown }>,
  operation: "get_by_auth_user_id" | "get_by_user_key" | "get_by_email",
  context: Record<string, unknown>,
) {
  const table = TABLES.productUserProfiles;

  for (const selectClause of PRODUCT_USER_PROFILE_SELECT_ATTEMPTS) {
    try {
      const { data, error } = await queryRunner(selectClause);

      if (error) {
        logDurableProfileError(operation, error, {
          ...context,
          selectClause,
        });

        if (isMissingTableError(error, table)) {
          markTableMissing(table, error);
          return null;
        }

        const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code ?? "") : "";
        if (code === "42703" || String((error as { message?: string })?.message ?? "").includes("does not exist")) {
          continue;
        }

        return null;
      }

      return data ? mapProfileRow(data as unknown as ProductUserProfileRow) : null;
    } catch (error) {
      logDurableProfileError(operation, error, {
        ...context,
        selectClause,
      });
    }
  }

  return null;
}

function mapWatchlistRow(row: UserWatchlistItemRow): UserWatchlistItem {
  const slug = cleanString(row.stock_slug);
  const title = cleanString(row.stock_name);
  const symbol = cleanString(row.stock_symbol);
  return {
    id: cleanString(row.id),
    pageType: "stock",
    slug,
    symbol,
    title,
    href: `/stocks/${slug}`,
    stockSlug: slug,
    stockSymbol: symbol,
    stockName: title,
    addedAt: cleanString(row.added_at),
  };
}

function mapPortfolioRow(row: UserPortfolioHoldingRow): UserPortfolioHolding {
  return {
    id: cleanString(row.id),
    stockSlug: cleanString(row.stock_slug),
    stockSymbol: cleanString(row.stock_symbol),
    stockName: cleanString(row.stock_name),
    quantity: Number(row.quantity) || 0,
    buyPrice: Number(row.buy_price) || 0,
    addedAt: cleanString(row.added_at),
    updatedAt: cleanString(row.updated_at),
  };
}

function mapSettingsRow(row: SystemSettingsRow): SystemSettings {
  return {
    siteName: cleanString(row.site_name),
    defaultMetaTitleSuffix: cleanString(row.default_meta_title_suffix),
    defaultMetaDescription: cleanString(row.default_meta_description),
    defaultOgImage: cleanString(row.default_og_image),
    defaultCanonicalBase: cleanString(row.default_canonical_base),
    publicHeadCode: cleanString(row.public_head_code),
    defaultNoIndex: Boolean(row.default_no_index),
    defaultMembershipTier: cleanString(row.default_membership_tier),
    defaultLockedCtaLabel: cleanString(row.default_locked_cta_label),
    supportEmail: cleanString(row.support_email),
    supportRoute: cleanString(row.support_route),
    previewEnabled: Boolean(row.preview_enabled),
    mediaUploadsEnabled: Boolean(row.media_uploads_enabled),
    watchlistEnabled: Boolean(row.watchlist_enabled),
    portfolioEnabled: Boolean(row.portfolio_enabled),
    updatedAt: cleanString(row.updated_at),
  };
}

function mapMediaRow(row: MediaAssetRow): MediaAsset {
  return {
    id: cleanString(row.id),
    title: cleanString(row.title),
    altText: cleanString(row.alt_text),
    url: cleanString(row.url),
    assetType: row.asset_type === "document" ? "document" : "image",
    category: cleanString(row.category) || (row.asset_type === "document" ? "document" : "content"),
    sourceKind: row.source_kind === "upload" ? "upload" : "external_url",
    fileName: cleanString(row.file_name),
    mimeType: cleanString(row.mime_type),
    sizeBytes: typeof row.size_bytes === "number" ? row.size_bytes : null,
    tags: cleanStringList(row.tags),
    uploadedBy: cleanString(row.uploaded_by),
    uploadedAt: cleanString(row.uploaded_at),
    updatedAt: cleanString(row.updated_at) || cleanString(row.uploaded_at),
    status: row.status === "published" ? "published" : "draft",
  };
}

function mapPreviewRow(row: CmsPreviewSessionRow): CmsPreviewSession {
  const payload = {
    family: "",
    slug: "",
    title: "",
    status: "draft",
    sections: {},
    ...(row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {}),
  } as CmsPreviewSession["payload"];
  payload.status = normalizeAdminPublishState(payload.status as string);

  return {
    token: cleanString(row.token),
    family: cleanString(row.family),
    slug: cleanString(row.slug),
    title: cleanString(row.title),
    routeTarget: cleanString(row.route_target) || null,
    createdBy: cleanString(row.created_by),
    createdAt: cleanString(row.created_at),
    expiresAt: cleanString(row.expires_at),
    payload,
  };
}

function mapVersionRow(row: CmsRecordVersionRow): CmsRecordVersion {
  const snapshot = {
    family: "",
    slug: "",
    title: "",
    status: "draft",
    sections: {},
    ...(row.snapshot && typeof row.snapshot === "object" ? (row.snapshot as Record<string, unknown>) : {}),
  } as CmsRecordVersion["snapshot"];
  snapshot.status = normalizeAdminPublishState(snapshot.status as string);

  return {
    id: cleanString(row.id),
    family: cleanString(row.family),
    slug: cleanString(row.slug),
    title: cleanString(row.title),
    savedAt: cleanString(row.saved_at),
    savedBy: cleanString(row.saved_by),
    status: normalizeAdminPublishState(row.status),
    routeTarget: cleanString(row.route_target) || null,
    changedFields: cleanStringList(row.changed_fields),
    snapshot,
  };
}

function mapRefreshRunRow(row: RefreshJobRunRow): RefreshJobRun {
  return {
    id: cleanString(row.id),
    jobKey: cleanString(row.job_key),
    status: row.status,
    startedAt: cleanString(row.started_at),
    finishedAt: cleanString(row.finished_at) || null,
    error: cleanString(row.error) || null,
    note: cleanString(row.note) || null,
    requestedBy: cleanString(row.requested_by) || null,
    retriedFromRunId: cleanString(row.retried_from_run_id) || null,
  };
}

function mapMembershipTierRow(row: AdminMembershipTierRow): AdminMembershipTier {
  return {
    id: cleanString(row.id),
    slug: cleanString(row.slug),
    name: cleanString(row.name),
    description: cleanString(row.description),
    status: row.status === "archived" ? "archived" : "active",
    active: Boolean(row.active),
    displayOrder: Number(row.display_order) || 1,
    visibility: row.visibility === "private" ? "private" : "public",
    ctaLabel: cleanString(row.cta_label),
    ctaHref: cleanString(row.cta_href),
    includedFamilies: cleanStringList(row.included_families),
    includedRecords: cleanStringList(row.included_records),
    excludedRecords: cleanStringList(row.excluded_records),
    featureAccess: normalizeMembershipFeatureAccess(row.feature_access, row.slug),
    internalNotes: cleanString(row.internal_notes) || null,
    updatedAt: cleanString(row.updated_at),
  };
}

function cleanRecordObject<T extends Record<string, unknown>>(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as T)
    : ({} as T);
}

function cleanRecordArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapAdminManagedRecordRow(row: AdminManagedRecordRow): AdminManagedRecord {
  return {
    id: cleanString(row.id),
    family: cleanString(row.family),
    slug: cleanString(row.slug),
    title: cleanString(row.title),
    symbol: cleanString(row.symbol) || null,
    benchmarkMapping: cleanString(row.benchmark_mapping) || null,
    status: normalizeAdminPublishState(row.status),
    visibility: row.visibility,
    publicHref: cleanString(row.public_href) || null,
    canonicalRoute: cleanString(row.canonical_route) || null,
    sourceTable: cleanString(row.source_table) || null,
    sourceRowId: cleanString(row.source_row_id) || null,
    sourceLabel: cleanString(row.source_label),
    sourceDate: cleanString(row.source_date),
    sourceUrl: cleanString(row.source_url),
    sourceState: cleanRecordObject<AdminManagedRecord["sourceState"]>(row.source_state),
    refreshState: cleanRecordObject<AdminManagedRecord["refreshState"]>(row.refresh_state),
    accessControl: cleanRecordObject<AdminManagedRecord["accessControl"]>(row.access_control),
    assignedTo: cleanString(row.assigned_to) || null,
    assignedBy: cleanString(row.assigned_by) || null,
    dueDate: cleanString(row.due_date) || null,
    sections: cleanRecordObject<AdminManagedRecord["sections"]>(row.sections),
    documents: cleanRecordArray<AdminManagedRecord["documents"][number]>(row.documents),
    imports: cleanRecordArray<AdminManagedRecord["imports"][number]>(row.imports),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
    scheduledPublishAt: cleanString(row.scheduled_publish_at) || null,
    scheduledUnpublishAt: cleanString(row.scheduled_unpublish_at) || null,
  };
}

function mapAdminRecordRevisionRow(row: AdminRecordRevisionRow): AdminRecordRevision {
  return {
    id: cleanString(row.id),
    family: cleanString(row.family),
    slug: cleanString(row.slug),
    title: cleanString(row.title),
    editor: cleanString(row.editor),
    action: cleanString(row.action),
    changedFields: cleanStringList(row.changed_fields),
    reason: cleanString(row.reason),
    revisionState: row.revision_state,
    routeTarget: cleanString(row.route_target),
    editedAt: cleanString(row.edited_at),
  };
}

function mapAdminGlobalModuleRow(row: AdminGlobalModuleRow): AdminGlobalModule {
  return {
    id: cleanString(row.id),
    title: cleanString(row.title),
    eyebrow: cleanString(row.eyebrow),
    body: cleanString(row.body),
    href: cleanString(row.href),
    ctaLabel: cleanString(row.cta_label),
    moduleType: cleanString(row.module_type),
    featured: Boolean(row.featured),
    priority: Number(row.priority) || 1,
    archiveGroup: cleanString(row.archive_group) || null,
    visibilityFamilies: cleanStringList(row.visibility_families),
    assignments: cleanStringList(row.assignments),
    comingSoon: Boolean(row.coming_soon),
    hideUntilReady: Boolean(row.hide_until_ready),
    enabled: Boolean(row.enabled),
    status: row.status,
    placement: cleanString(row.placement),
    sortOrder: Number(row.sort_order) || 1,
    updatedAt: cleanString(row.updated_at),
  };
}

function mapAdminGlobalRevisionRow(row: AdminGlobalRevisionRow): AdminGlobalRevision {
  return {
    id: cleanString(row.id),
    section: row.section,
    title: cleanString(row.title),
    editor: cleanString(row.editor),
    action: cleanString(row.action),
    status: row.status,
    changedCount: Number(row.changed_count) || 0,
    editedAt: cleanString(row.edited_at),
  };
}

function mapAdminRefreshJobRow(row: AdminRefreshJobRow): AdminRefreshJob {
  return {
    id: cleanString(row.id),
    key: cleanString(row.key),
    name: cleanString(row.name),
    family: cleanString(row.family),
    lane: cleanString(row.lane),
    enabled: Boolean(row.enabled),
    cadence: cleanString(row.cadence),
    sourceDependency: cleanString(row.source_dependency),
    lastRunAt: cleanString(row.last_run_at) || null,
    lastSuccessAt: cleanString(row.last_success_at) || null,
    lastFailureAt: cleanString(row.last_failure_at) || null,
    latestStatus: row.latest_status,
    latestError: cleanString(row.latest_error) || null,
    nextScheduledRunAt: cleanString(row.next_scheduled_run_at) || null,
    manualRunSupported: Boolean(row.manual_run_supported),
    affectedRecordsCount:
      row.affected_records_count === null ? null : Number(row.affected_records_count) || 0,
    lastOperatorActionAt: cleanString(row.last_operator_action_at) || null,
    lastOperatorNote: cleanString(row.last_operator_note) || null,
  };
}

function mapLaunchConfigSectionRow(row: LaunchConfigSectionRow) {
  return {
    section: row.section,
    data: cleanRecordObject<LaunchConfigStore[typeof row.section]>(row.data),
    updatedAt: cleanString(row.updated_at),
  };
}

function mapAdminActivityLogRow(row: AdminActivityLogRow) {
  return {
    id: cleanString(row.id),
    actorUserId: cleanString(row.actor_user_id) || null,
    actorEmail: cleanString(row.actor_email),
    actionType: cleanString(row.action_type),
    targetType: cleanString(row.target_type),
    targetId: cleanString(row.target_id) || null,
    targetFamily: cleanString(row.target_family) || null,
    targetSlug: cleanString(row.target_slug) || null,
    summary: cleanString(row.summary),
    metadata: cleanRecordObject<Record<string, unknown>>(row.metadata),
    createdAt: cleanString(row.created_at),
  };
}

function mapAdminEditorLockRow(row: AdminEditorLockRow) {
  return {
    id: cleanString(row.id),
    family: cleanString(row.family),
    slug: cleanString(row.slug),
    editorUserId: cleanString(row.editor_user_id) || null,
    editorEmail: cleanString(row.editor_email),
    startedAt: cleanString(row.started_at),
    lastHeartbeatAt: cleanString(row.last_heartbeat_at),
    expiresAt: cleanString(row.expires_at),
  };
}

function mapAdminImportBatchRow(row: AdminImportBatchRow) {
  return {
    id: cleanString(row.id),
    family: cleanString(row.family, 120),
    actorUserId: cleanString(row.actor_user_id) || null,
    actorEmail: cleanString(row.actor_email, 240),
    fileName: cleanString(row.file_name, 240),
    importMode: row.import_mode,
    status: row.status,
    sourceKind: row.source_kind === "csv" ? "csv" : "csv",
    storageMode: row.storage_mode === "durable" ? "durable" : "fallback",
    totalRows: Number(row.total_rows) || 0,
    validRows: Number(row.valid_rows) || 0,
    warningRows: Number(row.warning_rows) || 0,
    failedRows: Number(row.failed_rows) || 0,
    createdCount: Number(row.created_count) || 0,
    updatedCount: Number(row.updated_count) || 0,
    queuedCount: Number(row.queued_count) || 0,
    skippedCount: Number(row.skipped_count) || 0,
    failedCount: Number(row.failed_count) || 0,
    summary: cleanString(row.summary, 4000),
    fieldMapping: cleanRecordObject<Record<string, string>>(row.field_mapping),
    uploadedAt: cleanString(row.uploaded_at),
    completedAt: cleanString(row.completed_at) || null,
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
  };
}

function mapAdminImportRowRow(row: AdminImportRowRow) {
  return {
    id: cleanString(row.id),
    batchId: cleanString(row.batch_id),
    rowNumber: Number(row.row_number) || 0,
    identifier: cleanString(row.identifier, 240) || null,
    title: cleanString(row.title, 240) || null,
    slug: cleanString(row.slug, 160) || null,
    matchedRecordId: cleanString(row.matched_record_id) || null,
    matchedSlug: cleanString(row.matched_slug, 160) || null,
    operation: row.operation,
    status: row.status,
    warnings: cleanStringList(row.warnings),
    errors: cleanStringList(row.errors),
    payload: cleanRecordObject<Record<string, unknown>>(row.payload),
    resultNote: cleanString(row.result_note, 4000),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
  };
}

export async function getDurableUserProfileByUserKey(userKey: string) {
  const table = TABLES.productUserProfiles;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    return await selectDurableUserProfileRow(
      async (selectClause) =>
        await supabase
          .from(table)
          .select(selectClause)
          .eq("user_key", cleanString(userKey))
          .maybeSingle(),
      "get_by_user_key",
      {
        userKey: cleanString(userKey),
      },
    );
  } catch (error) {
    logDurableProfileError("get_by_user_key", error, {
      userKey: cleanString(userKey),
    });
    return null;
  }
}

export async function getDurableUserProfileByAuthUserId(authUserId: string) {
  const table = TABLES.productUserProfiles;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    return await selectDurableUserProfileRow(
      async (selectClause) =>
        await supabase
          .from(table)
          .select(selectClause)
          .eq("auth_user_id", cleanString(authUserId))
          .maybeSingle(),
      "get_by_auth_user_id",
      {
        authUserId: cleanString(authUserId),
      },
    );
  } catch (error) {
    logDurableProfileError("get_by_auth_user_id", error, {
      authUserId: cleanString(authUserId),
    });
    return null;
  }
}

export async function getSessionDurableUserProfileByAuthUserId(authUserId: string) {
  const table = TABLES.productUserProfiles;
  const normalizedAuthUserId = cleanString(authUserId);
  if (!hasSessionDurableTable(table) || !normalizedAuthUserId) {
    return null;
  }

  try {
    const supabase = await createUserSessionHelper();
    return await selectDurableUserProfileRow(
      async (selectClause) =>
        await supabase
          .from(table)
          .select(selectClause)
          .eq("auth_user_id", normalizedAuthUserId)
          .maybeSingle(),
      "get_by_auth_user_id",
      {
        authUserId: normalizedAuthUserId,
        accessBoundary: "user_session",
      },
    );
  } catch (error) {
    logDurableProfileError("get_by_auth_user_id", error, {
      authUserId: normalizedAuthUserId,
      accessBoundary: "user_session",
    });
    return null;
  }
}

export async function getDurableUserProfileByEmail(email: string) {
  const table = TABLES.productUserProfiles;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    return await selectDurableUserProfileRow(
      async (selectClause) =>
        await supabase
          .from(table)
          .select(selectClause)
          .eq("email", cleanString(email))
          .maybeSingle(),
      "get_by_email",
      {
        email: cleanString(email),
      },
    );
  } catch (error) {
    logDurableProfileError("get_by_email", error, {
      email: cleanString(email),
    });
    return null;
  }
}

export async function listDurableUserProfiles() {
  const table = TABLES.productUserProfiles;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select(PRODUCT_USER_PROFILE_SELECT_LEAN)
      .order("last_active_at", { ascending: false });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as ProductUserProfileRow[] | null)?.map(mapProfileRow) ?? [];
  } catch {
    return null;
  }
}

export async function listDurableUserProfileUsernameCandidates(prefix: string) {
  const table = TABLES.productUserProfiles;
  const normalizedPrefix = cleanString(prefix).toLowerCase();
  if (!hasDurableTable(table) || !normalizedPrefix) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("user_key,username")
      .ilike("username", `${normalizedPrefix}%`)
      .limit(250);

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return ((data as { user_key?: string | null; username?: string | null }[] | null) ?? [])
      .map((row) => ({
        userKey: cleanString(row.user_key),
        username: cleanString(row.username),
      }))
      .filter((row) => row.userKey && row.username);
  } catch {
    return null;
  }
}

export async function saveDurableUserProfile(profile: ProductUserProfile) {
  const table = TABLES.productUserProfiles;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const normalizedId =
      cleanString(profile.id) && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanString(profile.id))
        ? cleanString(profile.id)
        : undefined;
    const payload = {
      id: normalizedId,
      user_key: cleanString(profile.userKey),
      auth_user_id: cleanString(profile.authUserId) || null,
      username: cleanString(profile.username) || null,
      email: cleanString(profile.email),
      name: cleanString(profile.name),
      website_url: cleanString(profile.websiteUrl) || null,
      x_handle: cleanString(profile.xHandle) || null,
      linkedin_url: cleanString(profile.linkedinUrl) || null,
      instagram_handle: cleanString(profile.instagramHandle) || null,
      youtube_url: cleanString(profile.youtubeUrl) || null,
      profile_visible: profile.profileVisible,
      membership_tier: cleanString(profile.membershipTier) || null,
      role: profile.role,
      capabilities: (profile.capabilities ?? []) as ProductUserCapability[],
      created_at: cleanString(profile.createdAt),
      last_active_at: cleanString(profile.lastActiveAt),
      updated_at: cleanString(profile.updatedAt) || new Date().toISOString(),
    };
    const payloadAttempts = [
      {
        payload,
        selectClause: PRODUCT_USER_PROFILE_SELECT_FULL,
      },
      {
        payload: {
          id: payload.id,
          user_key: payload.user_key,
          auth_user_id: payload.auth_user_id,
          username: payload.username,
          email: payload.email,
          name: payload.name,
          profile_visible: payload.profile_visible,
          membership_tier: payload.membership_tier,
          role: payload.role,
          capabilities: payload.capabilities,
          created_at: payload.created_at,
          last_active_at: payload.last_active_at,
          updated_at: payload.updated_at,
        },
        selectClause: PRODUCT_USER_PROFILE_SELECT_LEAN,
      },
      {
        payload: {
          id: payload.id,
          user_key: payload.user_key,
          auth_user_id: payload.auth_user_id,
          email: payload.email,
          name: payload.name,
          membership_tier: payload.membership_tier,
          role: payload.role,
          created_at: payload.created_at,
          last_active_at: payload.last_active_at,
          updated_at: payload.updated_at,
        },
        selectClause: PRODUCT_USER_PROFILE_SELECT_LEGACY,
      },
    ] as const;
    let lastError: unknown = null;

    for (const attempt of payloadAttempts) {
      const { data, error } = await supabase
        .from(table)
        .upsert(attempt.payload, { onConflict: "user_key" })
        .select(attempt.selectClause)
        .single();

      if (!error) {
        return mapProfileRow(data as unknown as ProductUserProfileRow);
      }

      lastError = error;

      logDurableProfileError("save", error, {
        userKey: cleanString(profile.userKey),
        email: cleanString(profile.email),
        authUserId: cleanString(profile.authUserId),
        selectClause: attempt.selectClause,
      });

      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
        return null;
      }

      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: string }).code ?? "")
          : "";
      if (code === "42703" || String((error as { message?: string })?.message ?? "").includes("does not exist")) {
        continue;
      }

      throw new Error(formatDurableErrorMessage(error));
    }

    if (lastError) {
      throw new Error(formatDurableErrorMessage(lastError));
    }
  } catch (error) {
    logDurableProfileError("save", error, {
      userKey: cleanString(profile.userKey),
      email: cleanString(profile.email),
      authUserId: cleanString(profile.authUserId),
    });
    throw error;
  }
}

export async function saveSessionDurableUserProfile(profile: ProductUserProfile) {
  const table = TABLES.productUserProfiles;
  if (!hasSessionDurableTable(table)) {
    return null;
  }

  try {
    const supabase = await createUserSessionHelper();
    const normalizedId =
      cleanString(profile.id) && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanString(profile.id))
        ? cleanString(profile.id)
        : undefined;
    const payload = {
      id: normalizedId,
      user_key: cleanString(profile.userKey),
      auth_user_id: cleanString(profile.authUserId) || null,
      username: cleanString(profile.username) || null,
      email: cleanString(profile.email),
      name: cleanString(profile.name),
      website_url: cleanString(profile.websiteUrl) || null,
      x_handle: cleanString(profile.xHandle) || null,
      linkedin_url: cleanString(profile.linkedinUrl) || null,
      instagram_handle: cleanString(profile.instagramHandle) || null,
      youtube_url: cleanString(profile.youtubeUrl) || null,
      profile_visible: profile.profileVisible,
      membership_tier: cleanString(profile.membershipTier) || null,
      role: profile.role,
      capabilities: (profile.capabilities ?? []) as ProductUserCapability[],
      created_at: cleanString(profile.createdAt),
      last_active_at: cleanString(profile.lastActiveAt),
      updated_at: cleanString(profile.updatedAt) || new Date().toISOString(),
    };
    const payloadAttempts = [
      {
        payload,
        selectClause: PRODUCT_USER_PROFILE_SELECT_FULL,
      },
      {
        payload: {
          id: payload.id,
          user_key: payload.user_key,
          auth_user_id: payload.auth_user_id,
          username: payload.username,
          email: payload.email,
          name: payload.name,
          profile_visible: payload.profile_visible,
          membership_tier: payload.membership_tier,
          role: payload.role,
          capabilities: payload.capabilities,
          created_at: payload.created_at,
          last_active_at: payload.last_active_at,
          updated_at: payload.updated_at,
        },
        selectClause: PRODUCT_USER_PROFILE_SELECT_LEAN,
      },
      {
        payload: {
          id: payload.id,
          user_key: payload.user_key,
          auth_user_id: payload.auth_user_id,
          email: payload.email,
          name: payload.name,
          membership_tier: payload.membership_tier,
          role: payload.role,
          created_at: payload.created_at,
          last_active_at: payload.last_active_at,
          updated_at: payload.updated_at,
        },
        selectClause: PRODUCT_USER_PROFILE_SELECT_LEGACY,
      },
    ] as const;
    let lastError: unknown = null;

    for (const attempt of payloadAttempts) {
      const { data, error } = await supabase
        .from(table)
        .upsert(attempt.payload, { onConflict: "user_key" })
        .select(attempt.selectClause)
        .single();

      if (!error) {
        return mapProfileRow(data as unknown as ProductUserProfileRow);
      }

      lastError = error;

      logDurableProfileError("save", error, {
        userKey: cleanString(profile.userKey),
        email: cleanString(profile.email),
        authUserId: cleanString(profile.authUserId),
        selectClause: attempt.selectClause,
        accessBoundary: "user_session",
      });

      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
        return null;
      }

      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: string }).code ?? "")
          : "";
      if (code === "42703" || String((error as { message?: string })?.message ?? "").includes("does not exist")) {
        continue;
      }

      throw new Error(formatDurableErrorMessage(error));
    }

    if (lastError) {
      throw new Error(formatDurableErrorMessage(lastError));
    }
  } catch (error) {
    logDurableProfileError("save", error, {
      userKey: cleanString(profile.userKey),
      email: cleanString(profile.email),
      authUserId: cleanString(profile.authUserId),
      accessBoundary: "user_session",
    });
    throw error;
  }
}

export async function touchDurableUserProfileLastActive(input: {
  userKey: string;
  lastActiveAt: string;
  updatedAt?: string;
}) {
  const table = TABLES.productUserProfiles;
  if (!hasDurableTable(table)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const lastActiveAt = cleanString(input.lastActiveAt) || new Date().toISOString();
    const { error } = await supabase
      .from(table)
      .update({
        last_active_at: lastActiveAt,
        updated_at: cleanString(input.updatedAt) || lastActiveAt,
      })
      .eq("user_key", cleanString(input.userKey));

    if (error) {
      logDurableProfileError("touch_last_active", error, {
        userKey: cleanString(input.userKey),
        lastActiveAt,
      });

      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
        return false;
      }

      throw new Error(formatDurableErrorMessage(error));
    }

    return true;
  } catch (error) {
    logDurableProfileError("touch_last_active", error, {
      userKey: cleanString(input.userKey),
      lastActiveAt: cleanString(input.lastActiveAt),
    });
    return false;
  }
}

export async function touchSessionDurableUserProfileLastActive(input: {
  authUserId: string;
  lastActiveAt: string;
  updatedAt?: string;
}) {
  const table = TABLES.productUserProfiles;
  const normalizedAuthUserId = cleanString(input.authUserId);
  if (!hasSessionDurableTable(table) || !normalizedAuthUserId) {
    return false;
  }

  try {
    const supabase = await createUserSessionHelper();
    const lastActiveAt = cleanString(input.lastActiveAt) || new Date().toISOString();
    const { error } = await supabase
      .from(table)
      .update({
        last_active_at: lastActiveAt,
        updated_at: cleanString(input.updatedAt) || lastActiveAt,
      })
      .eq("auth_user_id", normalizedAuthUserId);

    if (error) {
      logDurableProfileError("touch_last_active", error, {
        authUserId: normalizedAuthUserId,
        lastActiveAt,
        accessBoundary: "user_session",
      });

      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
        return false;
      }

      throw new Error(formatDurableErrorMessage(error));
    }

    return true;
  } catch (error) {
    logDurableProfileError("touch_last_active", error, {
      authUserId: normalizedAuthUserId,
      lastActiveAt: cleanString(input.lastActiveAt),
      accessBoundary: "user_session",
    });
    return false;
  }
}

export async function deleteDurableUserProfile(profile: Pick<ProductUserProfile, "id" | "userKey" | "email">) {
  const profileTable = TABLES.productUserProfiles;
  if (!hasDurableTable(profileTable)) {
    return false;
  }

  async function deleteRelatedRows(table: string) {
    if (!hasDurableTable(table) || !cleanString(profile.id)) {
      return true;
    }

    try {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("product_user_profile_id", cleanString(profile.id));

      if (error) {
        markTableMissing(table, error);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  const watchlistDeleted = await deleteRelatedRows(TABLES.productUserWatchlistItems);
  const portfolioDeleted = await deleteRelatedRows(TABLES.productUserPortfolioHoldings);
  if (!watchlistDeleted || !portfolioDeleted) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from(profileTable).delete();

    if (cleanString(profile.id)) {
      query = query.eq("id", cleanString(profile.id));
    } else if (cleanString(profile.userKey)) {
      query = query.eq("user_key", cleanString(profile.userKey));
    } else {
      query = query.eq("email", cleanString(profile.email));
    }

    const { error } = await query;
    if (error) {
      markTableMissing(profileTable, error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function listDurableWatchlistItems(profileId: string) {
  const table = TABLES.productUserWatchlistItems;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,added_at")
      .eq("product_user_profile_id", cleanString(profileId))
      .order("added_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
      }
      return null;
    }

    return (data as UserWatchlistItemRow[] | null)?.map(mapWatchlistRow) ?? [];
  } catch {
    return null;
  }
}

export async function listSessionDurableWatchlistItems(profileId: string) {
  const table = TABLES.productUserWatchlistItems;
  if (!hasSessionDurableTable(table)) {
    return null;
  }

  try {
    const supabase = await createUserSessionHelper();
    const { data, error } = await supabase
      .from(table)
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,added_at")
      .eq("product_user_profile_id", cleanString(profileId))
      .order("added_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
      }
      return null;
    }

    return (data as UserWatchlistItemRow[] | null)?.map(mapWatchlistRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurableWatchlistItem(
  profileId: string,
  item: UserWatchlistItem,
) {
  const table = TABLES.productUserWatchlistItems;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(item.id) || undefined,
          product_user_profile_id: cleanString(profileId),
          stock_slug: cleanString(item.stockSlug),
          stock_symbol: cleanString(item.stockSymbol),
          stock_name: cleanString(item.stockName),
          added_at: cleanString(item.addedAt),
        },
        { onConflict: "product_user_profile_id,stock_slug" },
      )
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,added_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapWatchlistRow(data as UserWatchlistItemRow);
  } catch {
    return null;
  }
}

export async function saveSessionDurableWatchlistItem(
  profileId: string,
  item: UserWatchlistItem,
) {
  const table = TABLES.productUserWatchlistItems;
  if (!hasSessionDurableTable(table)) {
    return null;
  }

  try {
    const supabase = await createUserSessionHelper();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(item.id) || undefined,
          product_user_profile_id: cleanString(profileId),
          stock_slug: cleanString(item.stockSlug),
          stock_symbol: cleanString(item.stockSymbol),
          stock_name: cleanString(item.stockName),
          added_at: cleanString(item.addedAt),
        },
        { onConflict: "product_user_profile_id,stock_slug" },
      )
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,added_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapWatchlistRow(data as UserWatchlistItemRow);
  } catch {
    return null;
  }
}

export async function deleteDurableWatchlistItem(profileId: string, stockSlug: string) {
  const table = TABLES.productUserWatchlistItems;
  if (!hasDurableTable(table)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("product_user_profile_id", cleanString(profileId))
      .eq("stock_slug", cleanString(stockSlug));

    if (error) {
      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
      }
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function deleteSessionDurableWatchlistItem(profileId: string, stockSlug: string) {
  const table = TABLES.productUserWatchlistItems;
  if (!hasSessionDurableTable(table)) {
    return false;
  }

  try {
    const supabase = await createUserSessionHelper();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("product_user_profile_id", cleanString(profileId))
      .eq("stock_slug", cleanString(stockSlug));

    if (error) {
      markTableMissing(table, error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function listDurablePortfolioHoldings(profileId: string) {
  const table = TABLES.productUserPortfolioHoldings;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,quantity,buy_price,added_at,updated_at")
      .eq("product_user_profile_id", cleanString(profileId))
      .order("updated_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
      }
      return null;
    }

    return (data as UserPortfolioHoldingRow[] | null)?.map(mapPortfolioRow) ?? [];
  } catch {
    return null;
  }
}

export async function listSessionDurablePortfolioHoldings(profileId: string) {
  const table = TABLES.productUserPortfolioHoldings;
  if (!hasSessionDurableTable(table)) {
    return null;
  }

  try {
    const supabase = await createUserSessionHelper();
    const { data, error } = await supabase
      .from(table)
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,quantity,buy_price,added_at,updated_at")
      .eq("product_user_profile_id", cleanString(profileId))
      .order("updated_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
      }
      return null;
    }

    return (data as UserPortfolioHoldingRow[] | null)?.map(mapPortfolioRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurablePortfolioHolding(
  profileId: string,
  holding: UserPortfolioHolding,
) {
  const table = TABLES.productUserPortfolioHoldings;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(holding.id) || undefined,
          product_user_profile_id: cleanString(profileId),
          stock_slug: cleanString(holding.stockSlug),
          stock_symbol: cleanString(holding.stockSymbol),
          stock_name: cleanString(holding.stockName),
          quantity: holding.quantity,
          buy_price: holding.buyPrice,
          added_at: cleanString(holding.addedAt),
          updated_at: cleanString(holding.updatedAt),
        },
        { onConflict: "product_user_profile_id,stock_slug" },
      )
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,quantity,buy_price,added_at,updated_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapPortfolioRow(data as UserPortfolioHoldingRow);
  } catch {
    return null;
  }
}

export async function saveSessionDurablePortfolioHolding(
  profileId: string,
  holding: UserPortfolioHolding,
) {
  const table = TABLES.productUserPortfolioHoldings;
  if (!hasSessionDurableTable(table)) {
    return null;
  }

  try {
    const supabase = await createUserSessionHelper();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(holding.id) || undefined,
          product_user_profile_id: cleanString(profileId),
          stock_slug: cleanString(holding.stockSlug),
          stock_symbol: cleanString(holding.stockSymbol),
          stock_name: cleanString(holding.stockName),
          quantity: holding.quantity,
          buy_price: holding.buyPrice,
          added_at: cleanString(holding.addedAt),
          updated_at: cleanString(holding.updatedAt),
        },
        { onConflict: "product_user_profile_id,stock_slug" },
      )
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,quantity,buy_price,added_at,updated_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapPortfolioRow(data as UserPortfolioHoldingRow);
  } catch {
    return null;
  }
}

export async function deleteDurablePortfolioHolding(profileId: string, stockSlug: string) {
  const table = TABLES.productUserPortfolioHoldings;
  if (!hasDurableTable(table)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("product_user_profile_id", cleanString(profileId))
      .eq("stock_slug", cleanString(stockSlug));

    if (error) {
      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
      }
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function deleteSessionDurablePortfolioHolding(profileId: string, stockSlug: string) {
  const table = TABLES.productUserPortfolioHoldings;
  if (!hasSessionDurableTable(table)) {
    return false;
  }

  try {
    const supabase = await createUserSessionHelper();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("product_user_profile_id", cleanString(profileId))
      .eq("stock_slug", cleanString(stockSlug));

    if (error) {
      markTableMissing(table, error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getDurableSystemSettings() {
  const table = TABLES.productSystemSettings;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("settings_key,site_name,default_meta_title_suffix,default_meta_description,default_og_image,default_canonical_base,public_head_code,default_no_index,default_membership_tier,default_locked_cta_label,support_email,support_route,preview_enabled,media_uploads_enabled,watchlist_enabled,portfolio_enabled,updated_at")
      .eq("settings_key", "default")
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error, table)) {
        markTableMissing(table, error);
      }
      return null;
    }

    return data ? mapSettingsRow(data as SystemSettingsRow) : null;
  } catch {
    return null;
  }
}

export async function getPublicDurableSystemSettings() {
  const table = TABLES.productSystemSettings;
  if (!hasPublicDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createPublicReadHelper();
    const { data, error } = await supabase
      .from(table)
      .select("settings_key,site_name,default_meta_title_suffix,default_meta_description,default_og_image,default_canonical_base,public_head_code,default_no_index,default_membership_tier,default_locked_cta_label,support_email,support_route,preview_enabled,media_uploads_enabled,watchlist_enabled,portfolio_enabled,updated_at")
      .eq("settings_key", "default")
      .maybeSingle();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return data ? mapSettingsRow(data as SystemSettingsRow) : null;
  } catch {
    return null;
  }
}

export async function saveDurableSystemSettings(settings: SystemSettings) {
  const table = TABLES.productSystemSettings;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          settings_key: "default",
          site_name: cleanString(settings.siteName),
          default_meta_title_suffix: cleanString(settings.defaultMetaTitleSuffix),
          default_meta_description: cleanString(settings.defaultMetaDescription),
          default_og_image: cleanString(settings.defaultOgImage),
          default_canonical_base: cleanString(settings.defaultCanonicalBase),
          public_head_code: cleanString(settings.publicHeadCode),
          default_no_index: settings.defaultNoIndex,
          default_membership_tier: cleanString(settings.defaultMembershipTier),
          default_locked_cta_label: cleanString(settings.defaultLockedCtaLabel),
          support_email: cleanString(settings.supportEmail),
          support_route: cleanString(settings.supportRoute),
          preview_enabled: settings.previewEnabled,
          media_uploads_enabled: settings.mediaUploadsEnabled,
          watchlist_enabled: settings.watchlistEnabled,
          portfolio_enabled: settings.portfolioEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "settings_key" },
      )
      .select("settings_key,site_name,default_meta_title_suffix,default_meta_description,default_og_image,default_canonical_base,public_head_code,default_no_index,default_membership_tier,default_locked_cta_label,support_email,support_route,preview_enabled,media_uploads_enabled,watchlist_enabled,portfolio_enabled,updated_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapSettingsRow(data as SystemSettingsRow);
  } catch {
    return null;
  }
}

export async function listDurableMediaAssets() {
  const table = TABLES.cmsMediaAssets;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,title,alt_text,url,asset_type,category,source_kind,file_name,mime_type,size_bytes,tags,uploaded_by,uploaded_at,updated_at,status")
      .order("updated_at", { ascending: false });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as MediaAssetRow[] | null)?.map(mapMediaRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurableMediaAsset(asset: MediaAsset) {
  const table = TABLES.cmsMediaAssets;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(asset.id) || undefined,
          title: cleanString(asset.title),
          alt_text: cleanString(asset.altText),
          url: cleanString(asset.url),
          asset_type: asset.assetType,
          category: cleanString(asset.category) || null,
          source_kind: asset.sourceKind,
          file_name: cleanString(asset.fileName),
          mime_type: cleanString(asset.mimeType),
          size_bytes: typeof asset.sizeBytes === "number" ? asset.sizeBytes : null,
          tags: asset.tags,
          uploaded_by: cleanString(asset.uploadedBy),
          uploaded_at: cleanString(asset.uploadedAt),
          updated_at: cleanString(asset.updatedAt) || cleanString(asset.uploadedAt),
          status: asset.status,
        },
        { onConflict: "id" },
      )
      .select("id,title,alt_text,url,asset_type,category,source_kind,file_name,mime_type,size_bytes,tags,uploaded_by,uploaded_at,updated_at,status")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapMediaRow(data as MediaAssetRow);
  } catch {
    return null;
  }
}

export async function createDurableCmsPreviewSession(preview: CmsPreviewSession) {
  const table = TABLES.cmsPreviewSessions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .insert({
        token: cleanString(preview.token),
        family: cleanString(preview.family),
        slug: cleanString(preview.slug),
        title: cleanString(preview.title),
        route_target: cleanString(preview.routeTarget) || null,
        created_by: cleanString(preview.createdBy),
        created_at: cleanString(preview.createdAt),
        expires_at: cleanString(preview.expiresAt),
        payload: preview.payload,
      })
      .select("token,family,slug,title,route_target,created_by,created_at,expires_at,payload")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapPreviewRow(data as CmsPreviewSessionRow);
  } catch {
    return null;
  }
}

export async function expireDurableCmsPreviewSessionsForRecord(family: string, slug: string) {
  const table = TABLES.cmsPreviewSessions;
  if (!hasDurableTable(table)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from(table)
      .update({ expires_at: new Date().toISOString() })
      .eq("family", cleanString(family))
      .eq("slug", cleanString(slug))
      .gt("expires_at", new Date().toISOString());

    if (error) {
      markTableMissing(table, error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getDurableCmsPreviewSession(token: string) {
  const table = TABLES.cmsPreviewSessions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("token,family,slug,title,route_target,created_by,created_at,expires_at,payload")
      .eq("token", cleanString(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return data ? mapPreviewRow(data as CmsPreviewSessionRow) : null;
  } catch {
    return null;
  }
}

export async function getLatestDurableCmsPreviewSessionForRecord(family: string, slug: string) {
  const table = TABLES.cmsPreviewSessions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("token,family,slug,title,route_target,created_by,created_at,expires_at,payload")
      .eq("family", cleanString(family))
      .eq("slug", cleanString(slug))
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return data ? mapPreviewRow(data as CmsPreviewSessionRow) : null;
  } catch {
    return null;
  }
}

export async function appendDurableCmsRecordVersion(version: CmsRecordVersion) {
  const table = TABLES.cmsRecordVersions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .insert({
        id: cleanString(version.id) || undefined,
        family: cleanString(version.family),
        slug: cleanString(version.slug),
        title: cleanString(version.title),
        saved_at: cleanString(version.savedAt),
        saved_by: cleanString(version.savedBy),
        status: version.status,
        route_target: cleanString(version.routeTarget) || null,
        changed_fields: version.changedFields,
        snapshot: version.snapshot,
      })
      .select("id,family,slug,title,saved_at,saved_by,status,route_target,changed_fields,snapshot")
      .single();

    if (error) {
      logDurableAdminRecordError("append_record_version", error, {
        table,
        status,
        id: cleanString(version.id),
        family: cleanString(version.family),
        slug: cleanString(version.slug),
      });
      markTableMissing(table, error);
      return null;
    }

    console.info("[cms-durable-state] cms_record_versions durable write succeeded", {
      table,
      status,
      id: cleanString(version.id),
      family: cleanString(version.family),
      slug: cleanString(version.slug),
    });
    return mapVersionRow(data as CmsRecordVersionRow);
  } catch (error) {
    logDurableAdminRecordError("append_record_version", error, {
      table,
      id: cleanString(version.id),
      family: cleanString(version.family),
      slug: cleanString(version.slug),
    });
    return null;
  }
}

export async function listDurableCmsRecordVersions(family: string, slug: string, limit = 10) {
  const table = TABLES.cmsRecordVersions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,family,slug,title,saved_at,saved_by,status,route_target,changed_fields,snapshot")
      .eq("family", cleanString(family))
      .eq("slug", cleanString(slug))
      .order("saved_at", { ascending: false })
      .limit(limit);

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as CmsRecordVersionRow[] | null)?.map(mapVersionRow) ?? [];
  } catch {
    return null;
  }
}

export async function appendDurableRefreshJobRun(run: RefreshJobRun) {
  const table = TABLES.cmsRefreshJobRuns;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .insert({
        id: cleanString(run.id) || undefined,
        job_key: cleanString(run.jobKey),
        status: run.status,
        started_at: cleanString(run.startedAt),
        finished_at: cleanString(run.finishedAt) || null,
        error: cleanString(run.error) || null,
        note: cleanString(run.note) || null,
        requested_by: cleanString(run.requestedBy) || null,
        retried_from_run_id: cleanString(run.retriedFromRunId) || null,
      })
      .select("id,job_key,status,started_at,finished_at,error,note,requested_by,retried_from_run_id")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapRefreshRunRow(data as RefreshJobRunRow);
  } catch {
    return null;
  }
}

export async function listDurableRefreshJobRuns(jobKey: string, limit = 10) {
  const table = TABLES.cmsRefreshJobRuns;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,job_key,status,started_at,finished_at,error,note,requested_by,retried_from_run_id")
      .eq("job_key", cleanString(jobKey))
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as RefreshJobRunRow[] | null)?.map(mapRefreshRunRow) ?? [];
  } catch {
    return null;
  }
}

export async function listDurableAdminMembershipTiers() {
  const table = TABLES.cmsMembershipTiers;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,slug,name,description,status,active,display_order,visibility,cta_label,cta_href,included_families,included_records,excluded_records,feature_access,internal_notes,updated_at")
      .order("display_order", { ascending: true });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminMembershipTierRow[] | null)?.map(mapMembershipTierRow) ?? [];
  } catch {
    return null;
  }
}

export async function getDurableAdminMembershipTier(slug: string) {
  const table = TABLES.cmsMembershipTiers;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,slug,name,description,status,active,display_order,visibility,cta_label,cta_href,included_families,included_records,excluded_records,feature_access,internal_notes,updated_at")
      .eq("slug", cleanString(slug))
      .maybeSingle();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return data ? mapMembershipTierRow(data as AdminMembershipTierRow) : null;
  } catch {
    return null;
  }
}

export async function saveDurableAdminMembershipTier(tier: AdminMembershipTier) {
  const table = TABLES.cmsMembershipTiers;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(tier.id) || undefined,
          slug: cleanString(tier.slug),
          name: cleanString(tier.name),
          description: cleanString(tier.description),
          status: tier.status,
          active: tier.active,
          display_order: tier.displayOrder,
          visibility: tier.visibility,
          cta_label: cleanString(tier.ctaLabel),
          cta_href: cleanString(tier.ctaHref),
          included_families: tier.includedFamilies,
          included_records: tier.includedRecords,
          excluded_records: tier.excludedRecords,
          feature_access: tier.featureAccess,
          internal_notes: cleanString(tier.internalNotes) || null,
          updated_at: cleanString(tier.updatedAt) || new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id,slug,name,description,status,active,display_order,visibility,cta_label,cta_href,included_families,included_records,excluded_records,feature_access,internal_notes,updated_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapMembershipTierRow(data as AdminMembershipTierRow);
  } catch {
    return null;
  }
}

export async function listDurableAdminManagedRecords() {
  const table = TABLES.cmsAdminRecords;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,family,slug,title,symbol,benchmark_mapping,status,visibility,public_href,canonical_route,source_table,source_row_id,source_label,source_date,source_url,source_state,refresh_state,access_control,assigned_to,assigned_by,due_date,sections,documents,imports,scheduled_publish_at,scheduled_unpublish_at,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminManagedRecordRow[] | null)?.map(mapAdminManagedRecordRow) ?? [];
  } catch {
    return null;
  }
}

export async function getDurableAdminManagedRecord(family: string, slug: string) {
  const table = TABLES.cmsAdminRecords;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,family,slug,title,symbol,benchmark_mapping,status,visibility,public_href,canonical_route,source_table,source_row_id,source_label,source_date,source_url,source_state,refresh_state,access_control,assigned_to,assigned_by,due_date,sections,documents,imports,scheduled_publish_at,scheduled_unpublish_at,created_at,updated_at")
      .eq("family", cleanString(family))
      .eq("slug", cleanString(slug))
      .maybeSingle();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return data ? mapAdminManagedRecordRow(data as AdminManagedRecordRow) : null;
  } catch {
    return null;
  }
}

export async function saveDurableAdminManagedRecord(record: AdminManagedRecord) {
  const table = TABLES.cmsAdminRecords;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(record.id),
          family: cleanString(record.family),
          slug: cleanString(record.slug),
          title: cleanString(record.title),
          symbol: cleanString(record.symbol) || null,
          benchmark_mapping: cleanString(record.benchmarkMapping) || null,
          status: record.status,
          visibility: record.visibility,
          public_href: cleanString(record.publicHref) || null,
          canonical_route: cleanString(record.canonicalRoute) || null,
          source_table: cleanString(record.sourceTable) || null,
          source_row_id: cleanString(record.sourceRowId) || null,
          source_label: cleanString(record.sourceLabel),
          source_date: cleanString(record.sourceDate),
          source_url: cleanString(record.sourceUrl),
          source_state: record.sourceState,
          refresh_state: record.refreshState,
          access_control: record.accessControl,
          assigned_to: cleanString(record.assignedTo) || null,
          assigned_by: cleanString(record.assignedBy) || null,
          due_date: cleanString(record.dueDate) || null,
          sections: record.sections,
          documents: record.documents,
          imports: record.imports,
          scheduled_publish_at: cleanString(record.scheduledPublishAt) || null,
          scheduled_unpublish_at: cleanString(record.scheduledUnpublishAt) || null,
          created_at: cleanString(record.createdAt),
          updated_at: cleanString(record.updatedAt) || new Date().toISOString(),
        },
        { onConflict: "family,slug" },
      )
      .select("id,family,slug,title,symbol,benchmark_mapping,status,visibility,public_href,canonical_route,source_table,source_row_id,source_label,source_date,source_url,source_state,refresh_state,access_control,assigned_to,assigned_by,due_date,sections,documents,imports,scheduled_publish_at,scheduled_unpublish_at,created_at,updated_at")
      .single();

    if (error) {
      logDurableAdminRecordError("save_record", error, {
        table,
        status,
        id: cleanString(record.id),
        family: cleanString(record.family),
        slug: cleanString(record.slug),
      });
      markTableMissing(table, error);
      return null;
    }

    console.info("[cms-durable-state] cms_admin_records durable write succeeded", {
      table,
      status,
      id: cleanString(record.id),
      family: cleanString(record.family),
      slug: cleanString(record.slug),
    });
    return mapAdminManagedRecordRow(data as AdminManagedRecordRow);
  } catch (error) {
    logDurableAdminRecordError("save_record", error, {
      table,
      id: cleanString(record.id),
      family: cleanString(record.family),
      slug: cleanString(record.slug),
    });
    return null;
  }
}

export async function deleteDurableAdminManagedRecord(input: {
  id?: string | null;
  family: string;
  slug: string;
}) {
  const table = TABLES.cmsAdminRecords;
  if (!hasDurableTable(table)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from(table).delete();
    const cleanedId = cleanString(input.id);

    if (cleanedId) {
      query = query.eq("id", cleanedId);
    } else {
      query = query
        .eq("family", cleanString(input.family, 120))
        .eq("slug", cleanString(input.slug, 160));
    }

    const { error } = await query;

    if (error) {
      markTableMissing(table, error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function listDurableAdminRecordRevisions(
  family?: string,
  slug?: string,
  limit = 100,
) {
  const table = TABLES.cmsAdminRecordRevisions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from(table)
      .select("id,family,slug,title,editor,action,changed_fields,reason,revision_state,route_target,edited_at")
      .order("edited_at", { ascending: false })
      .limit(limit);

    if (cleanString(family)) {
      query = query.eq("family", cleanString(family));
    }

    if (cleanString(slug)) {
      query = query.eq("slug", cleanString(slug));
    }

    const { data, error } = await query;

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminRecordRevisionRow[] | null)?.map(mapAdminRecordRevisionRow) ?? [];
  } catch {
    return null;
  }
}

export async function appendDurableAdminRecordRevision(revision: AdminRecordRevision) {
  const table = TABLES.cmsAdminRecordRevisions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .insert({
        id: cleanString(revision.id),
        family: cleanString(revision.family),
        slug: cleanString(revision.slug),
        title: cleanString(revision.title),
        editor: cleanString(revision.editor),
        action: cleanString(revision.action),
        changed_fields: revision.changedFields,
        reason: cleanString(revision.reason),
        revision_state: revision.revisionState,
        route_target: cleanString(revision.routeTarget),
        edited_at: cleanString(revision.editedAt) || new Date().toISOString(),
      })
      .select("id,family,slug,title,editor,action,changed_fields,reason,revision_state,route_target,edited_at")
      .single();

    if (error) {
      logDurableAdminRecordError("append_record_revision", error, {
        table,
        status,
        id: cleanString(revision.id),
        family: cleanString(revision.family),
        slug: cleanString(revision.slug),
      });
      markTableMissing(table, error);
      return null;
    }

    console.info("[cms-durable-state] cms_admin_record_revisions durable write succeeded", {
      table,
      status,
      id: cleanString(revision.id),
      family: cleanString(revision.family),
      slug: cleanString(revision.slug),
    });
    return mapAdminRecordRevisionRow(data as AdminRecordRevisionRow);
  } catch (error) {
    logDurableAdminRecordError("append_record_revision", error, {
      table,
      id: cleanString(revision.id),
      family: cleanString(revision.family),
      slug: cleanString(revision.slug),
    });
    return null;
  }
}

export async function listDurableAdminGlobalModules(section?: AdminGlobalCollectionKey) {
  const table = TABLES.cmsAdminGlobalModules;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from(table)
      .select("id,section,title,eyebrow,body,href,cta_label,module_type,featured,priority,archive_group,visibility_families,assignments,coming_soon,hide_until_ready,enabled,status,placement,sort_order,updated_at")
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (section) {
      query = query.eq("section", section);
    }

    const { data, error } = await query;

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminGlobalModuleRow[] | null)?.map(mapAdminGlobalModuleRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurableAdminGlobalCollection(
  section: AdminGlobalCollectionKey,
  items: AdminGlobalModule[],
) {
  const table = TABLES.cmsAdminGlobalModules;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await listDurableAdminGlobalModules(section);

    if (!existing) {
      return null;
    }

    const existingIds = new Set(existing.map((item) => item.id));
    const incomingIds = new Set(items.map((item) => cleanString(item.id)));
    const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    if (idsToDelete.length) {
      const { error: deleteError } = await supabase.from(table).delete().in("id", idsToDelete);
      if (deleteError) {
        markTableMissing(table, deleteError);
        return null;
      }
    }

    if (items.length) {
      const { error } = await supabase.from(table).upsert(
        items.map((item) => ({
          id: cleanString(item.id),
          section,
          title: cleanString(item.title),
          eyebrow: cleanString(item.eyebrow),
          body: cleanString(item.body),
          href: cleanString(item.href),
          cta_label: cleanString(item.ctaLabel),
          module_type: cleanString(item.moduleType),
          featured: item.featured,
          priority: item.priority,
          archive_group: cleanString(item.archiveGroup) || null,
          visibility_families: item.visibilityFamilies,
          assignments: item.assignments,
          coming_soon: item.comingSoon,
          hide_until_ready: item.hideUntilReady,
          enabled: item.enabled,
          status: item.status,
          placement: cleanString(item.placement),
          sort_order: item.sortOrder,
          updated_at: cleanString(item.updatedAt) || new Date().toISOString(),
        })),
        { onConflict: "id" },
      );

      if (error) {
        markTableMissing(table, error);
        return null;
      }
    }

    return await listDurableAdminGlobalModules(section);
  } catch {
    return null;
  }
}

export async function listDurableAdminGlobalRevisions(
  section?: "header" | "footer" | "pageSidebar" | AdminGlobalCollectionKey,
  limit = 100,
) {
  const table = TABLES.cmsAdminGlobalRevisions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from(table)
      .select("id,section,title,editor,action,status,changed_count,edited_at")
      .order("edited_at", { ascending: false })
      .limit(limit);

    if (section) {
      query = query.eq("section", section);
    }

    const { data, error } = await query;

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminGlobalRevisionRow[] | null)?.map(mapAdminGlobalRevisionRow) ?? [];
  } catch {
    return null;
  }
}

export async function appendDurableAdminGlobalRevision(revision: AdminGlobalRevision) {
  const table = TABLES.cmsAdminGlobalRevisions;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .insert({
        id: cleanString(revision.id),
        section: revision.section,
        title: cleanString(revision.title),
        editor: cleanString(revision.editor),
        action: cleanString(revision.action),
        status: revision.status,
        changed_count: revision.changedCount,
        edited_at: cleanString(revision.editedAt) || new Date().toISOString(),
      })
      .select("id,section,title,editor,action,status,changed_count,edited_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapAdminGlobalRevisionRow(data as AdminGlobalRevisionRow);
  } catch {
    return null;
  }
}

export async function listDurableAdminRefreshJobs() {
  const table = TABLES.cmsAdminRefreshJobs;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,key,name,family,lane,enabled,cadence,source_dependency,last_run_at,last_success_at,last_failure_at,latest_status,latest_error,next_scheduled_run_at,manual_run_supported,affected_records_count,last_operator_action_at,last_operator_note")
      .order("family", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminRefreshJobRow[] | null)?.map(mapAdminRefreshJobRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurableAdminRefreshJob(job: AdminRefreshJob) {
  const table = TABLES.cmsAdminRefreshJobs;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(job.id),
          key: cleanString(job.key),
          name: cleanString(job.name),
          family: cleanString(job.family),
          lane: cleanString(job.lane),
          enabled: job.enabled,
          cadence: cleanString(job.cadence),
          source_dependency: cleanString(job.sourceDependency),
          last_run_at: cleanString(job.lastRunAt) || null,
          last_success_at: cleanString(job.lastSuccessAt) || null,
          last_failure_at: cleanString(job.lastFailureAt) || null,
          latest_status: job.latestStatus,
          latest_error: cleanString(job.latestError) || null,
          next_scheduled_run_at: cleanString(job.nextScheduledRunAt) || null,
          manual_run_supported: job.manualRunSupported,
          affected_records_count:
            typeof job.affectedRecordsCount === "number" ? job.affectedRecordsCount : null,
          last_operator_action_at: cleanString(job.lastOperatorActionAt) || null,
          last_operator_note: cleanString(job.lastOperatorNote) || null,
        },
        { onConflict: "key" },
      )
      .select("id,key,name,family,lane,enabled,cadence,source_dependency,last_run_at,last_success_at,last_failure_at,latest_status,latest_error,next_scheduled_run_at,manual_run_supported,affected_records_count,last_operator_action_at,last_operator_note")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapAdminRefreshJobRow(data as AdminRefreshJobRow);
  } catch {
    return null;
  }
}

export async function listDurableLaunchConfigSections() {
  const table = TABLES.cmsLaunchConfigSections;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("section,data,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as LaunchConfigSectionRow[] | null)?.map(mapLaunchConfigSectionRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurableLaunchConfigSection<
  TSection extends keyof Omit<LaunchConfigStore, "updatedAt">,
>(section: TSection, data: LaunchConfigStore[TSection]) {
  const table = TABLES.cmsLaunchConfigSections;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: saved, error } = await supabase
      .from(table)
      .upsert(
        {
          section,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "section" },
      )
      .select("section,data,updated_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapLaunchConfigSectionRow(saved as LaunchConfigSectionRow);
  } catch {
    return null;
  }
}

export async function listDurableAdminActivityLog(limit = 100) {
  const table = TABLES.cmsAdminActivityLog;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .select("id,actor_user_id,actor_email,action_type,target_type,target_id,target_family,target_slug,summary,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logDurableAdminActivityError("list", error, {
        limit,
        status,
      });
      markTableMissing(table, error);
      return null;
    }

    console.info("[cms-durable-state] cms_admin_activity_log durable read succeeded", {
      table,
      status,
      limit,
      count: (data as AdminActivityLogRow[] | null)?.length ?? 0,
      newestCreatedAt: (data as AdminActivityLogRow[] | null)?.[0]?.created_at ?? null,
      newestActionType: (data as AdminActivityLogRow[] | null)?.[0]?.action_type ?? null,
    });

    return (data as AdminActivityLogRow[] | null)?.map(mapAdminActivityLogRow) ?? [];
  } catch (error) {
    logDurableAdminActivityError("list", error, {
      limit,
    });
    return null;
  }
}

export async function appendDurableAdminActivityLog(entry: {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  targetFamily: string | null;
  targetSlug: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}) {
  const table = TABLES.cmsAdminActivityLog;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .insert({
        id: cleanString(entry.id),
        actor_user_id: cleanString(entry.actorUserId) || null,
        actor_email: cleanString(entry.actorEmail),
        action_type: cleanString(entry.actionType),
        target_type: cleanString(entry.targetType),
        target_id: cleanString(entry.targetId) || null,
        target_family: cleanString(entry.targetFamily) || null,
        target_slug: cleanString(entry.targetSlug) || null,
        summary: cleanString(entry.summary, 2000),
        metadata: entry.metadata ?? {},
        created_at: cleanString(entry.createdAt) || new Date().toISOString(),
      })
      .select("id,actor_user_id,actor_email,action_type,target_type,target_id,target_family,target_slug,summary,metadata,created_at")
      .single();

    if (error) {
      logDurableAdminActivityError("append", error, {
        id: cleanString(entry.id),
        actionType: cleanString(entry.actionType),
        targetType: cleanString(entry.targetType),
        targetId: cleanString(entry.targetId) || null,
        actorEmail: cleanString(entry.actorEmail),
        status,
      });
      markTableMissing(table, error);
      return null;
    }

    console.info("[cms-durable-state] cms_admin_activity_log durable write succeeded", {
      table,
      status,
      id: cleanString(entry.id),
      actionType: cleanString(entry.actionType),
      targetType: cleanString(entry.targetType),
      targetId: cleanString(entry.targetId) || null,
      actorEmail: cleanString(entry.actorEmail),
    });

    return mapAdminActivityLogRow(data as AdminActivityLogRow);
  } catch (error) {
    logDurableAdminActivityError("append", error, {
      id: cleanString(entry.id),
      actionType: cleanString(entry.actionType),
      targetType: cleanString(entry.targetType),
      targetId: cleanString(entry.targetId) || null,
      actorEmail: cleanString(entry.actorEmail),
    });
    return null;
  }
}

export async function listDurableAdminEditorLocks(family: string, slug: string) {
  const table = TABLES.cmsAdminEditorLocks;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(table)
      .select("id,family,slug,editor_user_id,editor_email,started_at,last_heartbeat_at,expires_at")
      .eq("family", cleanString(family, 120))
      .eq("slug", cleanString(slug, 160))
      .gt("expires_at", now)
      .order("last_heartbeat_at", { ascending: false });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminEditorLockRow[] | null)?.map(mapAdminEditorLockRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurableAdminEditorLock(lock: {
  id: string;
  family: string;
  slug: string;
  editorUserId: string | null;
  editorEmail: string;
  startedAt: string;
  lastHeartbeatAt: string;
  expiresAt: string;
}) {
  const table = TABLES.cmsAdminEditorLocks;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(lock.id),
          family: cleanString(lock.family, 120),
          slug: cleanString(lock.slug, 160),
          editor_user_id: cleanString(lock.editorUserId) || null,
          editor_email: cleanString(lock.editorEmail, 240),
          started_at: cleanString(lock.startedAt) || new Date().toISOString(),
          last_heartbeat_at: cleanString(lock.lastHeartbeatAt) || new Date().toISOString(),
          expires_at: cleanString(lock.expiresAt) || new Date(Date.now() + 120_000).toISOString(),
        },
        { onConflict: "family,slug,editor_email" },
      )
      .select("id,family,slug,editor_user_id,editor_email,started_at,last_heartbeat_at,expires_at")
      .single();

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return mapAdminEditorLockRow(data as AdminEditorLockRow);
  } catch {
    return null;
  }
}

export async function deleteDurableAdminEditorLock(
  family: string,
  slug: string,
  editorEmail: string,
) {
  const table = TABLES.cmsAdminEditorLocks;
  if (!hasDurableTable(table)) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("family", cleanString(family, 120))
      .eq("slug", cleanString(slug, 160))
      .eq("editor_email", cleanString(editorEmail, 240));

    if (error) {
      markTableMissing(table, error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function mapAdminPendingApprovalRow(row: AdminPendingApprovalRow) {
  return {
    id: cleanString(row.id),
    family: cleanString(row.family, 120),
    slug: cleanString(row.slug, 160),
    title: cleanString(row.title, 240),
    recordId: cleanString(row.record_id) || null,
    submittedByUserId: cleanString(row.submitted_by_user_id) || null,
    submittedByEmail: cleanString(row.submitted_by_email, 240),
    submittedAt: cleanString(row.submitted_at) || new Date().toISOString(),
    updatedAt: cleanString(row.updated_at) || cleanString(row.submitted_at) || new Date().toISOString(),
    decision:
      row.decision === "approved" || row.decision === "rejected" ? row.decision : "pending",
    reviewedAt: cleanString(row.reviewed_at) || null,
    reviewedByUserId: cleanString(row.reviewed_by_user_id) || null,
    reviewedByEmail: cleanString(row.reviewed_by_email, 240) || null,
    reviewNote: cleanString(row.review_note, 2000) || null,
    actionType: cleanString(row.action_type, 120),
    targetStatus: normalizeAdminPublishState(row.target_status),
    summary: cleanString(row.summary, 2000),
    changedFields: cleanStringList(row.changed_fields),
    snapshot:
      typeof row.snapshot === "object" && row.snapshot !== null
        ? (row.snapshot as Record<string, unknown>)
        : {},
    baseRecordUpdatedAt: cleanString(row.base_record_updated_at) || null,
  };
}

export async function listDurableAdminPendingApprovals() {
  const table = TABLES.cmsAdminPendingApprovals;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("id,family,slug,title,record_id,submitted_by_user_id,submitted_by_email,submitted_at,updated_at,decision,reviewed_at,reviewed_by_user_id,reviewed_by_email,review_note,action_type,target_status,summary,changed_fields,snapshot,base_record_updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminPendingApprovalRow[] | null)?.map(mapAdminPendingApprovalRow) ?? [];
  } catch {
    return null;
  }
}

export async function saveDurableAdminPendingApproval(approval: {
  id: string;
  family: string;
  slug: string;
  title: string;
  recordId: string | null;
  submittedByUserId: string | null;
  submittedByEmail: string;
  submittedAt: string;
  updatedAt: string;
  decision: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewedByEmail: string | null;
  reviewNote: string | null;
  actionType: string;
  targetStatus: "draft" | "ready_for_review" | "needs_fix" | "published" | "archived";
  summary: string;
  changedFields: string[];
  snapshot: Record<string, unknown>;
  baseRecordUpdatedAt: string | null;
}) {
  const table = TABLES.cmsAdminPendingApprovals;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(approval.id),
          family: cleanString(approval.family, 120),
          slug: cleanString(approval.slug, 160),
          title: cleanString(approval.title, 240),
          record_id: cleanString(approval.recordId) || null,
          submitted_by_user_id: cleanString(approval.submittedByUserId) || null,
          submitted_by_email: cleanString(approval.submittedByEmail, 240),
          submitted_at: cleanString(approval.submittedAt) || new Date().toISOString(),
          updated_at: cleanString(approval.updatedAt) || new Date().toISOString(),
          decision: approval.decision,
          reviewed_at: cleanString(approval.reviewedAt) || null,
          reviewed_by_user_id: cleanString(approval.reviewedByUserId) || null,
          reviewed_by_email: cleanString(approval.reviewedByEmail, 240) || null,
          review_note: cleanString(approval.reviewNote, 2000) || null,
          action_type: cleanString(approval.actionType, 120),
          target_status: approval.targetStatus,
          summary: cleanString(approval.summary, 2000),
          changed_fields: approval.changedFields,
          snapshot: approval.snapshot,
          base_record_updated_at: cleanString(approval.baseRecordUpdatedAt) || null,
        },
        { onConflict: "id" },
      )
      .select("id,family,slug,title,record_id,submitted_by_user_id,submitted_by_email,submitted_at,updated_at,decision,reviewed_at,reviewed_by_user_id,reviewed_by_email,review_note,action_type,target_status,summary,changed_fields,snapshot,base_record_updated_at")
      .single();

    if (error) {
      logDurableAdminApprovalError("save_pending_approval", error, {
        status,
        id: cleanString(approval.id),
        family: cleanString(approval.family),
        slug: cleanString(approval.slug),
        decision: approval.decision,
      });
      markTableMissing(table, error);
      return null;
    }

    console.info("[cms-durable-state] cms_admin_pending_approvals durable write succeeded", {
      table,
      status,
      id: cleanString(approval.id),
      family: cleanString(approval.family),
      slug: cleanString(approval.slug),
      decision: approval.decision,
    });
    return mapAdminPendingApprovalRow(data as AdminPendingApprovalRow);
  } catch (error) {
    logDurableAdminApprovalError("save_pending_approval", error, {
      id: cleanString(approval.id),
      family: cleanString(approval.family),
      slug: cleanString(approval.slug),
      decision: approval.decision,
    });
    return null;
  }
}

export async function listDurableAdminImportBatches(family?: string | null) {
  const table = TABLES.cmsAdminImportBatches;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from(table)
      .select(
        "id,family,actor_user_id,actor_email,file_name,import_mode,status,source_kind,storage_mode,total_rows,valid_rows,warning_rows,failed_rows,created_count,updated_count,queued_count,skipped_count,failed_count,summary,field_mapping,uploaded_at,completed_at,created_at,updated_at",
      )
      .order("updated_at", { ascending: false });

    if (cleanString(family, 120)) {
      query = query.eq("family", cleanString(family, 120));
    }

    const { data, error, status } = await query;

    if (error) {
      logDurableAdminImportError("list_batches", error, {
        table,
        status,
        family: cleanString(family, 120) || null,
      });
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminImportBatchRow[] | null)?.map(mapAdminImportBatchRow) ?? [];
  } catch (error) {
    logDurableAdminImportError("list_batches", error, {
      table,
      family: cleanString(family, 120) || null,
    });
    return null;
  }
}

export async function listDurableAdminImportRows(batchId: string) {
  const table = TABLES.cmsAdminImportRows;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .select(
        "id,batch_id,row_number,identifier,title,slug,matched_record_id,matched_slug,operation,status,warnings,errors,payload,result_note,created_at,updated_at",
      )
      .eq("batch_id", cleanString(batchId))
      .order("row_number", { ascending: true });

    if (error) {
      logDurableAdminImportError("list_rows", error, {
        table,
        status,
        batchId: cleanString(batchId),
      });
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminImportRowRow[] | null)?.map(mapAdminImportRowRow) ?? [];
  } catch (error) {
    logDurableAdminImportError("list_rows", error, {
      table,
      batchId: cleanString(batchId),
    });
    return null;
  }
}

export async function saveDurableAdminImportBatch(batch: {
  id: string;
  family: string;
  actorUserId: string | null;
  actorEmail: string;
  fileName: string;
  importMode: "create_new_only" | "update_existing_only" | "create_or_update";
  status:
    | "preview_ready"
    | "completed"
    | "completed_with_errors"
    | "queued_for_approval"
    | "failed";
  sourceKind: "csv";
  storageMode: "durable" | "fallback";
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  createdCount: number;
  updatedCount: number;
  queuedCount: number;
  skippedCount: number;
  failedCount: number;
  summary: string;
  fieldMapping: Record<string, string>;
  uploadedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  const table = TABLES.cmsAdminImportBatches;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error, status } = await supabase
      .from(table)
      .upsert(
        {
          id: cleanString(batch.id),
          family: cleanString(batch.family, 120),
          actor_user_id: cleanString(batch.actorUserId) || null,
          actor_email: cleanString(batch.actorEmail, 240),
          file_name: cleanString(batch.fileName, 240),
          import_mode: batch.importMode,
          status: batch.status,
          source_kind: batch.sourceKind,
          storage_mode: batch.storageMode,
          total_rows: batch.totalRows,
          valid_rows: batch.validRows,
          warning_rows: batch.warningRows,
          failed_rows: batch.failedRows,
          created_count: batch.createdCount,
          updated_count: batch.updatedCount,
          queued_count: batch.queuedCount,
          skipped_count: batch.skippedCount,
          failed_count: batch.failedCount,
          summary: cleanString(batch.summary, 4000),
          field_mapping: batch.fieldMapping,
          uploaded_at: cleanString(batch.uploadedAt),
          completed_at: cleanString(batch.completedAt) || null,
          created_at: cleanString(batch.createdAt),
          updated_at: cleanString(batch.updatedAt) || new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select(
        "id,family,actor_user_id,actor_email,file_name,import_mode,status,source_kind,storage_mode,total_rows,valid_rows,warning_rows,failed_rows,created_count,updated_count,queued_count,skipped_count,failed_count,summary,field_mapping,uploaded_at,completed_at,created_at,updated_at",
      )
      .single();

    if (error) {
      logDurableAdminImportError("save_batch", error, {
        table,
        status,
        id: cleanString(batch.id),
        family: cleanString(batch.family, 120),
        fileName: cleanString(batch.fileName, 240),
      });
      markTableMissing(table, error);
      return null;
    }

    return mapAdminImportBatchRow(data as AdminImportBatchRow);
  } catch (error) {
    logDurableAdminImportError("save_batch", error, {
      table,
      id: cleanString(batch.id),
      family: cleanString(batch.family, 120),
      fileName: cleanString(batch.fileName, 240),
    });
    return null;
  }
}

export async function replaceDurableAdminImportRows(
  batchId: string,
  rows: Array<{
    id: string;
    batchId: string;
    rowNumber: number;
    identifier: string | null;
    title: string | null;
    slug: string | null;
    matchedRecordId: string | null;
    matchedSlug: string | null;
    operation: "create" | "update" | "skip" | "queue_for_approval";
    status:
      | "valid"
      | "warning"
      | "failed"
      | "created"
      | "updated"
      | "skipped"
      | "queued_for_approval";
    warnings: string[];
    errors: string[];
    payload: Record<string, unknown>;
    resultNote: string;
    createdAt: string;
    updatedAt: string;
  }>,
) {
  const table = TABLES.cmsAdminImportRows;
  if (!hasDurableTable(table)) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const cleanedBatchId = cleanString(batchId);
    const { error: deleteError, status: deleteStatus } = await supabase
      .from(table)
      .delete()
      .eq("batch_id", cleanedBatchId);

    if (deleteError) {
      logDurableAdminImportError("replace_rows", deleteError, {
        table,
        status: deleteStatus,
        batchId: cleanedBatchId,
        phase: "delete_existing",
      });
      markTableMissing(table, deleteError);
      return null;
    }

    if (!rows.length) {
      return [];
    }

    const { data, error, status } = await supabase
      .from(table)
      .insert(
        rows.map((row) => ({
          id: cleanString(row.id),
          batch_id: cleanedBatchId,
          row_number: row.rowNumber,
          identifier: cleanString(row.identifier, 240) || null,
          title: cleanString(row.title, 240) || null,
          slug: cleanString(row.slug, 160) || null,
          matched_record_id: cleanString(row.matchedRecordId) || null,
          matched_slug: cleanString(row.matchedSlug, 160) || null,
          operation: row.operation,
          status: row.status,
          warnings: row.warnings,
          errors: row.errors,
          payload: row.payload,
          result_note: cleanString(row.resultNote, 4000),
          created_at: cleanString(row.createdAt),
          updated_at: cleanString(row.updatedAt),
        })),
      )
      .select(
        "id,batch_id,row_number,identifier,title,slug,matched_record_id,matched_slug,operation,status,warnings,errors,payload,result_note,created_at,updated_at",
      )
      .order("row_number", { ascending: true });

    if (error) {
      logDurableAdminImportError("replace_rows", error, {
        table,
        status,
        batchId: cleanedBatchId,
        rowCount: rows.length,
        phase: "insert_rows",
      });
      markTableMissing(table, error);
      return null;
    }

    return (data as AdminImportRowRow[] | null)?.map(mapAdminImportRowRow) ?? [];
  } catch (error) {
    logDurableAdminImportError("replace_rows", error, {
      table,
      batchId: cleanString(batchId),
      rowCount: rows.length,
    });
    return null;
  }
}
