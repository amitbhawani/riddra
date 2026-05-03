import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import {
  appendDurableAdminGlobalRevision as appendDurableAdminGlobalRevisionRow,
  appendDurableAdminRecordRevision as appendDurableAdminRecordRevisionRow,
  getDurableAdminMembershipTier,
  hasDurableCmsStateStore,
  listDurableAdminGlobalModules,
  listDurableAdminGlobalRevisions,
  listDurableAdminManagedRecords,
  listDurableAdminMembershipTiers,
  listDurableAdminRecordRevisions,
  listDurableAdminRefreshJobs,
  deleteDurableAdminManagedRecord as deleteDurableAdminManagedRecordRow,
  saveDurableAdminGlobalCollection as saveDurableAdminGlobalCollectionRows,
  saveDurableAdminMembershipTier,
  saveDurableAdminManagedRecord as saveDurableAdminManagedRecordRow,
  saveDurableAdminRefreshJob as saveDurableAdminRefreshJobRow,
} from "@/lib/cms-durable-state";
import {
  getDefaultMembershipFeatureAccess,
  normalizeMembershipFeatureAccess,
  type MembershipFeatureAccess,
} from "@/lib/membership-product-features";
import {
  canUseFileFallback,
  getFileFallbackDisabledMessage,
} from "@/lib/durable-data-runtime";

export type AdminPublishState =
  | "draft"
  | "ready_for_review"
  | "needs_fix"
  | "published"
  | "archived";
export type AdminOverrideMode =
  | "auto_source"
  | "manual_override"
  | "manual_until_next_refresh"
  | "manual_permanent_lock";

export type AdminImportState =
  | "pending_review"
  | "applied"
  | "rejected"
  | "failed"
  | "duplicate"
  | "unmatched"
  | "conflict"
  | "blocked_by_lock"
  | "source_failed"
  | "partial_update";

export type AdminSourceFreshnessState =
  | "fresh"
  | "stale"
  | "overdue"
  | "manual_only"
  | "unknown";

export type AdminSourceStatus =
  | "ok"
  | "partial"
  | "failed"
  | "manual_only"
  | "unknown";

export type AdminRefreshJobStatus =
  | "healthy"
  | "running"
  | "warning"
  | "failed"
  | "paused"
  | "planned";

export type AdminAccessMode =
  | "public_free"
  | "logged_in_free_member"
  | "membership_tiers"
  | "hidden_internal"
  | "coming_soon_registration_required"
  | "purchased_enrolled";

export type AdminRecordSectionStore = {
  mode: AdminOverrideMode;
  values: Record<string, string>;
  note: string;
  lastManualEditAt: string | null;
  expiresAt: string | null;
};

export type AdminRecordAccessControl = {
  mode: AdminAccessMode;
  allowedMembershipTiers: string[];
  requireLogin: boolean;
  showTeaserPublicly: boolean;
  showLockedPreview: boolean;
  ctaLabel: string | null;
  ctaHref: string | null;
  internalNotes: string | null;
};

export type AdminManagedDocument = {
  id: string;
  label: string;
  href: string;
  sourceLabel: string;
  sourceDate: string;
  enabled: boolean;
};

export type AdminManagedImportItem = {
  id: string;
  batchLabel: string;
  status: AdminImportState;
  sourceLabel: string;
  sourceUrl: string;
  sourceDate: string;
  ranAt: string;
  note: string;
  duplicateCandidate: string;
  changedFields: string[];
  sourceChangedAt: string | null;
  liveValueState:
    | "auto_source_live"
    | "manual_live"
    | "temporary_override_live"
    | "permanent_lock_live"
    | "source_newer_than_live_value"
    | "source_read_failed"
    | "refresh_overdue"
    | "import_conflict_needs_review";
};

export type AdminRecordSourceState = {
  sourceLabel: string;
  sourceUrl: string;
  sourceDate: string;
  lastRefreshAt: string | null;
  lastSuccessfulRefreshAt: string | null;
  nextScheduledRefreshAt: string | null;
  freshnessState: AdminSourceFreshnessState;
  sourceStatus: AdminSourceStatus;
  importStatus:
    | "source_current"
    | "source_newer_than_manual"
    | "manual_overriding_source"
    | "temporary_override_pending_expiry"
    | "locked_manual_value"
    | "import_conflict_needs_review"
    | "not_connected";
  readFailure: string | null;
  latestError: string | null;
};

export type AdminRecordRefreshState = {
  laneKey: string;
  laneLabel: string;
  refreshEnabled: boolean;
  cadence: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  latestStatus: AdminRefreshJobStatus;
  latestError: string | null;
  nextScheduledRunAt: string | null;
  manualRunSupported: boolean;
  sourceDependency: string;
};

export type AdminManagedRecord = {
  id: string;
  family: string;
  slug: string;
  title: string;
  symbol: string | null;
  benchmarkMapping: string | null;
  status: AdminPublishState;
  visibility: "public" | "private" | "archived";
  publicHref: string | null;
  canonicalRoute: string | null;
  sourceTable: string | null;
  sourceRowId: string | null;
  sourceLabel: string;
  sourceDate: string;
  sourceUrl: string;
  sourceState: AdminRecordSourceState;
  refreshState: AdminRecordRefreshState;
  accessControl: AdminRecordAccessControl;
  assignedTo: string | null;
  assignedBy: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledPublishAt: string | null;
  scheduledUnpublishAt: string | null;
  sections: Record<string, AdminRecordSectionStore>;
  documents: AdminManagedDocument[];
  imports: AdminManagedImportItem[];
};

export type AdminRecordRevision = {
  id: string;
  family: string;
  slug: string;
  title: string;
  editor: string;
  action: string;
  changedFields: string[];
  reason: string;
  revisionState: "Published" | "Review ready" | "Needs fix" | "Rollback staged";
  routeTarget: string;
  editedAt: string;
};

export type AdminGlobalModule = {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  href: string;
  ctaLabel: string;
  moduleType: string;
  featured: boolean;
  priority: number;
  archiveGroup: string | null;
  visibilityFamilies: string[];
  assignments: string[];
  comingSoon: boolean;
  hideUntilReady: boolean;
  enabled: boolean;
  status: "draft" | "published";
  placement: string;
  sortOrder: number;
  updatedAt: string;
};

export type AdminMembershipTier = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "archived";
  active: boolean;
  displayOrder: number;
  visibility: "public" | "private";
  ctaLabel: string;
  ctaHref: string;
  includedFamilies: string[];
  includedRecords: string[];
  excludedRecords: string[];
  featureAccess: MembershipFeatureAccess;
  internalNotes: string | null;
  updatedAt: string;
};

export type AdminGlobalCollectionKey =
  | "sharedBlocks"
  | "banners"
  | "routeStrips"
  | "marketModules";

export type AdminGlobalRevision = {
  id: string;
  section: "header" | "footer" | "pageSidebar" | AdminGlobalCollectionKey;
  title: string;
  editor: string;
  action: string;
  status: "draft" | "published" | "reverted";
  changedCount: number;
  editedAt: string;
};

export type AdminRefreshJob = {
  id: string;
  key: string;
  name: string;
  family: string;
  lane: string;
  enabled: boolean;
  cadence: string;
  sourceDependency: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  latestStatus: AdminRefreshJobStatus;
  latestError: string | null;
  nextScheduledRunAt: string | null;
  manualRunSupported: boolean;
  affectedRecordsCount: number | null;
  lastOperatorActionAt: string | null;
  lastOperatorNote: string | null;
};

export type AdminOperatorStore = {
  version: number;
  records: AdminManagedRecord[];
  revisions: AdminRecordRevision[];
  globalSite: Record<AdminGlobalCollectionKey, AdminGlobalModule[]>;
  globalRevisions: AdminGlobalRevision[];
  refreshJobs: AdminRefreshJob[];
  membershipTiers: AdminMembershipTier[];
  updatedAt: string | null;
};

export type SaveAdminRecordInput = {
  recordId?: string | null;
  originalSlug?: string | null;
  lastKnownUpdatedAt?: string | null;
  family: string;
  slug: string;
  title: string;
  symbol?: string | null;
  benchmarkMapping?: string | null;
  status: AdminPublishState;
  visibility?: "public" | "private" | "archived";
  publicHref?: string | null;
  canonicalRoute?: string | null;
  sourceTable?: string | null;
  sourceRowId?: string | null;
  sourceLabel?: string | null;
  sourceDate?: string | null;
  sourceUrl?: string | null;
  sourceState?: Partial<AdminRecordSourceState>;
  refreshState?: Partial<AdminRecordRefreshState>;
  accessControl?: Partial<AdminRecordAccessControl>;
  assignedTo?: string | null;
  assignedBy?: string | null;
  dueDate?: string | null;
  scheduledPublishAt?: string | null;
  scheduledUnpublishAt?: string | null;
  sections: Record<string, AdminRecordSectionStore>;
  documents?: AdminManagedDocument[];
  imports?: AdminManagedImportItem[];
};

export type SaveAdminGlobalCollectionInput = {
  section: AdminGlobalCollectionKey;
  items: AdminGlobalModule[];
};

export type AppendAdminRecordRevisionInput = Omit<
  AdminRecordRevision,
  "id" | "editedAt"
>;

export type AppendAdminGlobalRevisionInput = Omit<
  AdminGlobalRevision,
  "id" | "editedAt"
>;

export type UpdateAdminImportItemInput = {
  family: string;
  slug: string;
  importId: string;
  status: AdminImportState;
  note?: string | null;
};

export type SaveAdminRefreshJobInput = {
  key: string;
  enabled?: boolean;
  cadence?: string;
  latestStatus?: AdminRefreshJobStatus;
  latestError?: string | null;
  nextScheduledRunAt?: string | null;
  lastOperatorNote?: string | null;
};

export type RunAdminRefreshJobInput = {
  key: string;
  outcome?: "running" | "healthy" | "failed" | "warning";
  note?: string | null;
};

export type SaveAdminMembershipTierInput = {
  slug: string;
  name: string;
  description?: string | null;
  status?: "active" | "archived";
  active?: boolean;
  displayOrder?: number;
  visibility?: "public" | "private";
  ctaLabel?: string | null;
  ctaHref?: string | null;
  includedFamilies?: string[];
  includedRecords?: string[];
  excludedRecords?: string[];
  featureAccess?: Partial<MembershipFeatureAccess> | null;
  internalNotes?: string | null;
};

export const coreMembershipTierSlugs = ["free", "pro", "pro-max"] as const;

const STORE_PATH = path.join(process.cwd(), "data", "admin-operator-console.json");
const STORE_VERSION = 5;
const ADMIN_OPERATOR_FILE_FALLBACK_SCOPE = "Admin operator data";
let storeCache:
  | {
      mtimeMs: number;
      store: AdminOperatorStore;
    }
  | null = null;

function cleanString(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function normalizeAdminPublishState(value: string | null | undefined): AdminPublishState {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "published") {
    return "published";
  }

  if (normalized === "archived") {
    return "archived";
  }

  if (normalized === "needs_fix") {
    return "needs_fix";
  }

  if (normalized === "ready_for_review" || normalized === "review") {
    return "ready_for_review";
  }

  return "draft";
}

function normalizeSlug(value: string) {
  return cleanString(value).toLowerCase();
}

function toIsoOrNull(value: string | null | undefined) {
  const nextValue = cleanString(value);
  return nextValue || null;
}

function applyLifecycleSchedule(
  status: AdminPublishState,
  scheduledPublishAt: string | null,
  scheduledUnpublishAt: string | null,
) {
  const now = Date.now();
  const publishAt = scheduledPublishAt ? Date.parse(scheduledPublishAt) : Number.NaN;
  const unpublishAt = scheduledUnpublishAt ? Date.parse(scheduledUnpublishAt) : Number.NaN;

  let nextStatus = status;

  if (
    (status === "draft" || status === "ready_for_review" || status === "needs_fix") &&
    Number.isFinite(publishAt) &&
    publishAt <= now
  ) {
    nextStatus = "published";
  }

  if (nextStatus === "published" && Number.isFinite(unpublishAt) && unpublishAt <= now) {
    nextStatus = "archived";
  }

  return nextStatus;
}

function stringList(value: string[] | null | undefined) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item)).filter(Boolean)
    : [];
}

function daysBetween(date: string) {
  if (!date) {
    return null;
  }

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
}

function deriveFreshnessState(
  sourceDate: string,
  sourceLabel: string,
): AdminSourceFreshnessState {
  if (!sourceDate && !sourceLabel) {
    return "manual_only";
  }

  if (!sourceDate) {
    return "unknown";
  }

  const ageInDays = daysBetween(sourceDate);
  if (ageInDays === null) {
    return "unknown";
  }

  if (ageInDays <= 7) {
    return "fresh";
  }

  if (ageInDays <= 31) {
    return "stale";
  }

  return "overdue";
}

function defaultRefreshJobSeed(): AdminRefreshJob[] {
  return [
    {
      id: "refresh_stock_quote_session",
      key: "stock_quote_session",
      name: "Stock quote / session refresh",
      family: "stocks",
      lane: "stock_quote_session",
      enabled: true,
      cadence: "Every 15 minutes during market hours",
      sourceDependency: "Market data provider",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "warning",
      latestError: "Provider-backed intraday verification is still pending.",
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_benchmark_history",
      key: "benchmark_history",
      name: "Benchmark history refresh",
      family: "indices",
      lane: "benchmark_history",
      enabled: true,
      cadence: "Daily after market close",
      sourceDependency: "Benchmark history durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_stock_fundamentals",
      key: "stock_fundamentals",
      name: "Stock fundamentals refresh",
      family: "stocks",
      lane: "stock_fundamentals",
      enabled: true,
      cadence: "Weekly or on filing availability",
      sourceDependency: "Fundamentals durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_stock_shareholding",
      key: "stock_shareholding",
      name: "Stock shareholding refresh",
      family: "stocks",
      lane: "stock_shareholding",
      enabled: true,
      cadence: "Quarterly",
      sourceDependency: "Shareholding durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_mutual_fund_nav_history",
      key: "mutual_fund_nav_history",
      name: "Mutual-fund NAV history refresh",
      family: "mutual-funds",
      lane: "mutual_fund_nav_history",
      enabled: true,
      cadence: "Daily end of day",
      sourceDependency: "NAV history durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_fund_factsheets",
      key: "fund_factsheets",
      name: "Fund factsheet refresh",
      family: "mutual-funds",
      lane: "fund_factsheets",
      enabled: true,
      cadence: "Monthly",
      sourceDependency: "Fund factsheet snapshot lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_fund_holdings",
      key: "fund_holdings",
      name: "Fund holdings refresh",
      family: "mutual-funds",
      lane: "fund_holdings",
      enabled: true,
      cadence: "Monthly",
      sourceDependency: "Fund holdings durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_fund_sector_allocation",
      key: "fund_sector_allocation",
      name: "Fund sector allocation refresh",
      family: "mutual-funds",
      lane: "fund_sector_allocation",
      enabled: true,
      cadence: "Monthly",
      sourceDependency: "Fund sector allocation durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_sector_performance",
      key: "sector_performance",
      name: "Sector performance refresh",
      family: "indices",
      lane: "sector_performance",
      enabled: true,
      cadence: "Daily after market close",
      sourceDependency: "Sector performance durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_index_composition",
      key: "index_composition",
      name: "Index composition refresh",
      family: "indices",
      lane: "index_composition",
      enabled: true,
      cadence: "Weekly",
      sourceDependency: "Index composition durable lane",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: true,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
    {
      id: "refresh_editorial_catalog",
      key: "editorial_catalog",
      name: "Editorial catalog refresh",
      family: "editorial",
      lane: "editorial_catalog",
      enabled: false,
      cadence: "Manual / CMS driven",
      sourceDependency: "Editorial CMS",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "paused",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: false,
      affectedRecordsCount: null,
      lastOperatorActionAt: null,
      lastOperatorNote: null,
    },
  ];
}

function defaultRecordRefreshState(
  family: string,
  sourceDate: string,
): AdminRecordRefreshState {
  const jobKeyByFamily: Record<string, string> = {
    stocks: "stock_quote_session",
    "mutual-funds": "mutual_fund_nav_history",
    indices: "index_composition",
    etfs: "editorial_catalog",
    ipos: "editorial_catalog",
    pms: "editorial_catalog",
    aif: "editorial_catalog",
    sif: "editorial_catalog",
    courses: "editorial_catalog",
    webinars: "editorial_catalog",
    learn: "editorial_catalog",
    newsletter: "editorial_catalog",
    "research-articles": "editorial_catalog",
  };
  const seed = defaultRefreshJobSeed().find((item) => item.key === (jobKeyByFamily[family] ?? "editorial_catalog"));

  return {
    laneKey: seed?.key ?? "editorial_catalog",
    laneLabel: seed?.name ?? "Editorial catalog refresh",
    refreshEnabled: Boolean(seed?.enabled),
    cadence: seed?.cadence ?? "Manual",
    lastRunAt: toIsoOrNull(sourceDate),
    lastSuccessAt: toIsoOrNull(sourceDate),
    lastFailureAt: null,
    latestStatus: sourceDate ? "healthy" : seed?.latestStatus ?? "planned",
    latestError: null,
    nextScheduledRunAt: seed?.nextScheduledRunAt ?? null,
    manualRunSupported: Boolean(seed?.manualRunSupported),
    sourceDependency: seed?.sourceDependency ?? "Operator managed",
  };
}

function defaultRecordSourceState({
  sourceLabel,
  sourceUrl,
  sourceDate,
}: {
  sourceLabel: string;
  sourceUrl: string;
  sourceDate: string;
}): AdminRecordSourceState {
  const freshnessState = deriveFreshnessState(sourceDate, sourceLabel);

  return {
    sourceLabel,
    sourceUrl,
    sourceDate,
    lastRefreshAt: toIsoOrNull(sourceDate),
    lastSuccessfulRefreshAt: toIsoOrNull(sourceDate),
    nextScheduledRefreshAt: null,
    freshnessState,
    sourceStatus:
      freshnessState === "manual_only"
        ? "manual_only"
        : freshnessState === "unknown"
          ? "unknown"
          : "ok",
    importStatus:
      freshnessState === "manual_only" ? "not_connected" : "source_current",
    readFailure: null,
    latestError: null,
  };
}

function defaultAccessControl(): AdminRecordAccessControl {
  return {
    mode: "public_free",
    allowedMembershipTiers: [],
    requireLogin: false,
    showTeaserPublicly: true,
    showLockedPreview: false,
    ctaLabel: null,
    ctaHref: null,
    internalNotes: null,
  };
}

function normalizeAccessControl(
  value: Partial<AdminRecordAccessControl> | undefined,
): AdminRecordAccessControl {
  const fallback = defaultAccessControl();

  return {
    mode: value?.mode ?? fallback.mode,
    allowedMembershipTiers: stringList(value?.allowedMembershipTiers),
    requireLogin:
      typeof value?.requireLogin === "boolean" ? value.requireLogin : fallback.requireLogin,
    showTeaserPublicly:
      typeof value?.showTeaserPublicly === "boolean"
        ? value.showTeaserPublicly
        : fallback.showTeaserPublicly,
    showLockedPreview:
      typeof value?.showLockedPreview === "boolean"
        ? value.showLockedPreview
        : fallback.showLockedPreview,
    ctaLabel: cleanString(value?.ctaLabel) || null,
    ctaHref: cleanString(value?.ctaHref) || null,
    internalNotes: cleanString(value?.internalNotes) || null,
  };
}

function normalizeDocument(
  document: Partial<AdminManagedDocument>,
  index: number,
): AdminManagedDocument {
  return {
    id: cleanString(document.id) || `admin_document_${index + 1}_${randomUUID()}`,
    label: cleanString(document.label),
    href: cleanString(document.href),
    sourceLabel: cleanString(document.sourceLabel),
    sourceDate: cleanString(document.sourceDate),
    enabled: document.enabled !== false,
  };
}

function normalizeImportItem(
  item: Partial<AdminManagedImportItem>,
  index: number,
): AdminManagedImportItem {
  return {
    id: cleanString(item.id) || `admin_import_${index + 1}_${randomUUID()}`,
    batchLabel: cleanString(item.batchLabel) || "Manual operator batch",
    status: (item.status as AdminImportState) || "pending_review",
    sourceLabel: cleanString(item.sourceLabel),
    sourceUrl: cleanString(item.sourceUrl),
    sourceDate: cleanString(item.sourceDate),
    ranAt: cleanString(item.ranAt) || new Date().toISOString(),
    note: cleanString(item.note),
    duplicateCandidate: cleanString(item.duplicateCandidate),
    changedFields: Array.isArray(item.changedFields)
      ? item.changedFields.map((field) => cleanString(field)).filter(Boolean)
      : [],
    sourceChangedAt: toIsoOrNull(item.sourceChangedAt),
    liveValueState:
      item.liveValueState || (item.status === "blocked_by_lock" ? "permanent_lock_live" : "auto_source_live"),
  };
}

function normalizeSections(
  sections: Record<string, AdminRecordSectionStore> | undefined,
) {
  return Object.fromEntries(
    Object.entries(sections ?? {}).map(([key, value]) => [
      key,
      {
        mode: value.mode ?? "auto_source",
        values: Object.fromEntries(
          Object.entries(value.values ?? {}).map(([fieldKey, fieldValue]) => [
            fieldKey,
            cleanString(fieldValue),
          ]),
        ),
        note: cleanString(value.note),
        lastManualEditAt: toIsoOrNull(value.lastManualEditAt),
        expiresAt: toIsoOrNull(value.expiresAt),
      },
    ]),
  );
}

function normalizeRecord(
  record: Partial<AdminManagedRecord>,
  index: number,
): AdminManagedRecord {
  const family = cleanString(record.family);
  const slug = normalizeSlug(record.slug ?? "");
  const sourceLabel = cleanString(record.sourceLabel);
  const sourceDate = cleanString(record.sourceDate);
  const sourceUrl = cleanString(record.sourceUrl);
  const scheduledPublishAt = toIsoOrNull(record.scheduledPublishAt);
  const scheduledUnpublishAt = toIsoOrNull(record.scheduledUnpublishAt);
  const effectiveStatus = applyLifecycleSchedule(
    normalizeAdminPublishState(record.status as string),
    scheduledPublishAt,
    scheduledUnpublishAt,
  );
  const sourceState = {
    ...defaultRecordSourceState({
      sourceLabel,
      sourceUrl,
      sourceDate,
    }),
    ...(record.sourceState ?? {}),
    sourceLabel: cleanString(record.sourceState?.sourceLabel ?? sourceLabel),
    sourceUrl: cleanString(record.sourceState?.sourceUrl ?? sourceUrl),
    sourceDate: cleanString(record.sourceState?.sourceDate ?? sourceDate),
    lastRefreshAt: toIsoOrNull(record.sourceState?.lastRefreshAt ?? sourceDate),
    lastSuccessfulRefreshAt: toIsoOrNull(
      record.sourceState?.lastSuccessfulRefreshAt ?? sourceDate,
    ),
    nextScheduledRefreshAt: toIsoOrNull(record.sourceState?.nextScheduledRefreshAt),
    freshnessState:
      record.sourceState?.freshnessState ??
      deriveFreshnessState(
        cleanString(record.sourceState?.sourceDate ?? sourceDate),
        cleanString(record.sourceState?.sourceLabel ?? sourceLabel),
      ),
    sourceStatus:
      record.sourceState?.sourceStatus ??
      defaultRecordSourceState({ sourceLabel, sourceUrl, sourceDate }).sourceStatus,
    importStatus:
      record.sourceState?.importStatus ??
      defaultRecordSourceState({ sourceLabel, sourceUrl, sourceDate }).importStatus,
    readFailure: cleanString(record.sourceState?.readFailure) || null,
    latestError: cleanString(record.sourceState?.latestError) || null,
  } satisfies AdminRecordSourceState;

  return {
    id: cleanString(record.id) || `admin_record_${index + 1}_${randomUUID()}`,
    family,
    slug,
    title: cleanString(record.title),
    symbol: cleanString(record.symbol) || null,
    benchmarkMapping: cleanString(record.benchmarkMapping) || null,
    status: effectiveStatus,
    visibility:
      record.visibility === "public" || record.visibility === "archived"
        ? record.visibility
        : effectiveStatus === "published"
          ? "public"
          : "private",
    publicHref: cleanString(record.publicHref) || null,
    canonicalRoute:
      cleanString(record.canonicalRoute) || cleanString(record.publicHref) || null,
    sourceTable: cleanString(record.sourceTable) || null,
    sourceRowId: cleanString(record.sourceRowId) || null,
    sourceLabel,
    sourceDate,
    sourceUrl,
    sourceState,
    refreshState: {
      ...defaultRecordRefreshState(family, sourceDate),
      ...(record.refreshState ?? {}),
      laneKey:
        cleanString(record.refreshState?.laneKey) ||
        defaultRecordRefreshState(family, sourceDate).laneKey,
      laneLabel:
        cleanString(record.refreshState?.laneLabel) ||
        defaultRecordRefreshState(family, sourceDate).laneLabel,
      refreshEnabled:
        typeof record.refreshState?.refreshEnabled === "boolean"
          ? record.refreshState.refreshEnabled
          : defaultRecordRefreshState(family, sourceDate).refreshEnabled,
      cadence:
        cleanString(record.refreshState?.cadence) ||
        defaultRecordRefreshState(family, sourceDate).cadence,
      lastRunAt: toIsoOrNull(record.refreshState?.lastRunAt ?? sourceDate),
      lastSuccessAt: toIsoOrNull(record.refreshState?.lastSuccessAt ?? sourceDate),
      lastFailureAt: toIsoOrNull(record.refreshState?.lastFailureAt),
      latestStatus:
        record.refreshState?.latestStatus ??
        defaultRecordRefreshState(family, sourceDate).latestStatus,
      latestError: cleanString(record.refreshState?.latestError) || null,
      nextScheduledRunAt: toIsoOrNull(record.refreshState?.nextScheduledRunAt),
      manualRunSupported:
        typeof record.refreshState?.manualRunSupported === "boolean"
          ? record.refreshState.manualRunSupported
          : defaultRecordRefreshState(family, sourceDate).manualRunSupported,
      sourceDependency:
        cleanString(record.refreshState?.sourceDependency) ||
        defaultRecordRefreshState(family, sourceDate).sourceDependency,
    },
    accessControl: normalizeAccessControl(record.accessControl),
    assignedTo: cleanString(record.assignedTo) || null,
    assignedBy: cleanString(record.assignedBy) || null,
    dueDate: toIsoOrNull(record.dueDate),
    createdAt: cleanString(record.createdAt) || new Date().toISOString(),
    updatedAt: cleanString(record.updatedAt) || new Date().toISOString(),
    scheduledPublishAt,
    scheduledUnpublishAt,
    sections: normalizeSections(record.sections),
    documents: Array.isArray(record.documents)
      ? record.documents.map((document, documentIndex) =>
          normalizeDocument(document, documentIndex),
        )
      : [],
    imports: Array.isArray(record.imports)
      ? record.imports.map((item, itemIndex) => normalizeImportItem(item, itemIndex))
      : [],
  };
}

function normalizeGlobalModule(
  item: Partial<AdminGlobalModule>,
  index: number,
): AdminGlobalModule {
  return {
    id: cleanString(item.id) || `admin_global_${index + 1}_${randomUUID()}`,
    title: cleanString(item.title),
    eyebrow: cleanString(item.eyebrow),
    body: cleanString(item.body),
    href: cleanString(item.href),
    ctaLabel: cleanString(item.ctaLabel),
    moduleType: cleanString(item.moduleType) || "shared_module",
    featured: item.featured === true,
    priority:
      Number.isFinite(Number(item.priority)) && Number(item.priority) > 0
        ? Number(item.priority)
        : index + 1,
    archiveGroup: cleanString(item.archiveGroup) || null,
    visibilityFamilies: stringList(item.visibilityFamilies),
    assignments: stringList(item.assignments),
    comingSoon: item.comingSoon === true,
    hideUntilReady: item.hideUntilReady === true,
    enabled: item.enabled !== false,
    status: item.status === "published" ? "published" : "draft",
    placement: cleanString(item.placement),
    sortOrder:
      Number.isFinite(Number(item.sortOrder)) && Number(item.sortOrder) > 0
        ? Number(item.sortOrder)
        : index + 1,
    updatedAt: cleanString(item.updatedAt) || new Date().toISOString(),
  };
}

function normalizeMembershipTier(
  tier: Partial<AdminMembershipTier>,
  index: number,
): AdminMembershipTier {
  const slug = normalizeSlug(tier.slug ?? tier.name ?? `tier-${index + 1}`);
  return {
    id: cleanString(tier.id) || `admin_membership_${index + 1}_${randomUUID()}`,
    name: cleanString(tier.name),
    slug,
    description: cleanString(tier.description),
    status: tier.status === "archived" ? "archived" : "active",
    active: tier.active !== false && tier.status !== "archived",
    displayOrder:
      Number.isFinite(Number(tier.displayOrder)) && Number(tier.displayOrder) > 0
        ? Number(tier.displayOrder)
        : index + 1,
    visibility: tier.visibility === "private" ? "private" : "public",
    ctaLabel: cleanString(tier.ctaLabel),
    ctaHref: cleanString(tier.ctaHref),
    includedFamilies: stringList(tier.includedFamilies),
    includedRecords: stringList(tier.includedRecords),
    excludedRecords: stringList(tier.excludedRecords),
    featureAccess: normalizeMembershipFeatureAccess(tier.featureAccess, slug),
    internalNotes: cleanString(tier.internalNotes) || null,
    updatedAt: cleanString(tier.updatedAt) || new Date().toISOString(),
  };
}

function getDefaultMembershipTierSeeds(): AdminMembershipTier[] {
  return [
    normalizeMembershipTier(
      {
        id: "admin_membership_default_free",
        name: "Free",
        slug: "free",
        description: "Basic market pages, account tools, and editorial learning surfaces.",
        status: "active",
        active: true,
        displayOrder: 1,
        visibility: "public",
        ctaLabel: "Upgrade to Pro",
        ctaHref: "/pricing",
        featureAccess: getDefaultMembershipFeatureAccess("free"),
      },
      0,
    ),
    normalizeMembershipTier(
      {
        id: "admin_membership_default_pro",
        name: "Pro",
        slug: "pro",
        description: "Forecast-style guidance, premium learning, and stronger product access.",
        status: "active",
        active: true,
        displayOrder: 2,
        visibility: "public",
        ctaLabel: "Upgrade to Pro Max",
        ctaHref: "/pricing",
        featureAccess: getDefaultMembershipFeatureAccess("pro"),
      },
      1,
    ),
    normalizeMembershipTier(
      {
        id: "admin_membership_default_pro_max",
        name: "Pro Max",
        slug: "pro-max",
        description: "Full premium analytics and the broadest member product access.",
        status: "active",
        active: true,
        displayOrder: 3,
        visibility: "public",
        ctaLabel: "Current top tier",
        ctaHref: "/pricing",
        featureAccess: getDefaultMembershipFeatureAccess("pro-max"),
      },
      2,
    ),
  ];
}

function mergeWithDefaultMembershipTiers(tiers: AdminMembershipTier[]) {
  const merged = new Map<string, AdminMembershipTier>();
  const allowed = new Set<string>(coreMembershipTierSlugs);

  for (const tier of getDefaultMembershipTierSeeds()) {
    merged.set(tier.slug, tier);
  }

  for (const tier of tiers) {
    if (!allowed.has(tier.slug)) {
      continue;
    }
    merged.set(tier.slug, normalizeMembershipTier(tier, tier.displayOrder - 1));
  }

  return Array.from(merged.values()).sort((left, right) => left.displayOrder - right.displayOrder);
}

function normalizeRefreshJob(
  job: Partial<AdminRefreshJob>,
  index: number,
): AdminRefreshJob {
  const fallback = defaultRefreshJobSeed()[index] ?? defaultRefreshJobSeed()[0];

  return {
    id: cleanString(job.id) || fallback.id || `admin_refresh_${index + 1}_${randomUUID()}`,
    key: cleanString(job.key) || fallback.key,
    name: cleanString(job.name) || fallback.name,
    family: cleanString(job.family) || fallback.family,
    lane: cleanString(job.lane) || fallback.lane,
    enabled: typeof job.enabled === "boolean" ? job.enabled : fallback.enabled,
    cadence: cleanString(job.cadence) || fallback.cadence,
    sourceDependency: cleanString(job.sourceDependency) || fallback.sourceDependency,
    lastRunAt: toIsoOrNull(job.lastRunAt),
    lastSuccessAt: toIsoOrNull(job.lastSuccessAt),
    lastFailureAt: toIsoOrNull(job.lastFailureAt),
    latestStatus: job.latestStatus ?? fallback.latestStatus,
    latestError: cleanString(job.latestError) || fallback.latestError || null,
    nextScheduledRunAt: toIsoOrNull(job.nextScheduledRunAt),
    manualRunSupported:
      typeof job.manualRunSupported === "boolean"
        ? job.manualRunSupported
        : fallback.manualRunSupported,
    affectedRecordsCount:
      Number.isFinite(Number(job.affectedRecordsCount))
        ? Number(job.affectedRecordsCount)
        : fallback.affectedRecordsCount,
    lastOperatorActionAt: toIsoOrNull(job.lastOperatorActionAt),
    lastOperatorNote: cleanString(job.lastOperatorNote) || null,
  };
}

function normalizeStore(parsed: Partial<AdminOperatorStore>): AdminOperatorStore {
  return {
    version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
    records: Array.isArray(parsed.records)
      ? parsed.records.map((record, index) => normalizeRecord(record, index))
      : [],
    revisions: Array.isArray(parsed.revisions)
      ? (parsed.revisions as AdminRecordRevision[])
      : [],
    globalSite: {
      sharedBlocks: Array.isArray(parsed.globalSite?.sharedBlocks)
        ? parsed.globalSite.sharedBlocks.map((item, index) =>
            normalizeGlobalModule(item, index),
          )
        : [],
      banners: Array.isArray(parsed.globalSite?.banners)
        ? parsed.globalSite.banners.map((item, index) =>
            normalizeGlobalModule(item, index),
          )
        : [],
      routeStrips: Array.isArray(parsed.globalSite?.routeStrips)
        ? parsed.globalSite.routeStrips.map((item, index) =>
            normalizeGlobalModule(item, index),
          )
        : [],
      marketModules: Array.isArray(parsed.globalSite?.marketModules)
        ? parsed.globalSite.marketModules.map((item, index) =>
            normalizeGlobalModule(item, index),
          )
        : [],
    },
    globalRevisions: Array.isArray(parsed.globalRevisions)
      ? (parsed.globalRevisions as AdminGlobalRevision[])
      : [],
    refreshJobs: Array.isArray(parsed.refreshJobs) && parsed.refreshJobs.length
      ? parsed.refreshJobs.map((job, index) => normalizeRefreshJob(job, index))
      : defaultRefreshJobSeed(),
    membershipTiers: Array.isArray(parsed.membershipTiers)
      ? parsed.membershipTiers.map((tier, index) => normalizeMembershipTier(tier, index))
      : [],
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
  };
}

const EMPTY_STORE: AdminOperatorStore = normalizeStore({
  version: STORE_VERSION,
  records: [],
  revisions: [],
  globalSite: {
    sharedBlocks: [],
    banners: [],
    routeStrips: [],
    marketModules: [],
  },
  globalRevisions: [],
  refreshJobs: defaultRefreshJobSeed(),
  membershipTiers: [],
  updatedAt: null,
});

async function readFallbackStore(): Promise<AdminOperatorStore> {
  if (!canUseFileFallback()) {
    return EMPTY_STORE;
  }

  try {
    const fileStats = await stat(STORE_PATH);

    if (storeCache && storeCache.mtimeMs === fileStats.mtimeMs) {
      return storeCache.store;
    }

    const content = await readFile(STORE_PATH, "utf8");
    const normalized = normalizeStore(JSON.parse(content) as Partial<AdminOperatorStore>);
    storeCache = {
      mtimeMs: fileStats.mtimeMs,
      store: normalized,
    };
    return normalized;
  } catch {
    return EMPTY_STORE;
  }
}

async function writeFallbackStore(
  store: AdminOperatorStore,
  options?: { skipWhenDisabled?: boolean },
) {
  if (!canUseFileFallback()) {
    if (options?.skipWhenDisabled) {
      return;
    }

    throw new Error(getFileFallbackDisabledMessage(ADMIN_OPERATOR_FILE_FALLBACK_SCOPE));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  try {
    const fileStats = await stat(STORE_PATH);
    storeCache = {
      mtimeMs: fileStats.mtimeMs,
      store,
    };
  } catch {
    storeCache = {
      mtimeMs: Date.now(),
      store,
    };
  }
}

function hasGlobalModules(store: AdminOperatorStore) {
  return (
    store.globalSite.sharedBlocks.length > 0 ||
    store.globalSite.banners.length > 0 ||
    store.globalSite.routeStrips.length > 0 ||
    store.globalSite.marketModules.length > 0
  );
}

function shouldSeedDurableStore(
  durableStore: AdminOperatorStore,
  fallbackStore: AdminOperatorStore,
) {
  return (
    (durableStore.records.length === 0 && fallbackStore.records.length > 0) ||
    (durableStore.revisions.length === 0 && fallbackStore.revisions.length > 0) ||
    (!hasGlobalModules(durableStore) && hasGlobalModules(fallbackStore)) ||
    (durableStore.globalRevisions.length === 0 && fallbackStore.globalRevisions.length > 0) ||
    (durableStore.refreshJobs.length === 0 && fallbackStore.refreshJobs.length > 0) ||
    (durableStore.membershipTiers.length === 0 && fallbackStore.membershipTiers.length > 0)
  );
}

async function readDurableStore(): Promise<AdminOperatorStore | null> {
  if (!hasDurableCmsStateStore()) {
    return null;
  }

  const [
    records,
    revisions,
    sharedBlocks,
    banners,
    routeStrips,
    marketModules,
    globalRevisions,
    refreshJobs,
    membershipTiers,
  ] = await Promise.all([
    listDurableAdminManagedRecords(),
    listDurableAdminRecordRevisions(undefined, undefined, 500),
    listDurableAdminGlobalModules("sharedBlocks"),
    listDurableAdminGlobalModules("banners"),
    listDurableAdminGlobalModules("routeStrips"),
    listDurableAdminGlobalModules("marketModules"),
    listDurableAdminGlobalRevisions(undefined, 500),
    listDurableAdminRefreshJobs(),
    listDurableAdminMembershipTiers(),
  ]);

  if (
    !records ||
    !revisions ||
    !sharedBlocks ||
    !banners ||
    !routeStrips ||
    !marketModules ||
    !globalRevisions ||
    !refreshJobs ||
    !membershipTiers
  ) {
    return null;
  }

  return normalizeStore({
    version: STORE_VERSION,
    records,
    revisions,
    globalSite: {
      sharedBlocks,
      banners,
      routeStrips,
      marketModules,
    },
    globalRevisions,
    refreshJobs,
    membershipTiers,
    updatedAt: [
      ...records.map((record) => record.updatedAt),
      ...revisions.map((revision) => revision.editedAt),
      ...sharedBlocks.map((item) => item.updatedAt),
      ...banners.map((item) => item.updatedAt),
      ...routeStrips.map((item) => item.updatedAt),
      ...marketModules.map((item) => item.updatedAt),
      ...globalRevisions.map((revision) => revision.editedAt),
      ...refreshJobs
        .map((job) => job.lastOperatorActionAt || job.lastRunAt || job.lastSuccessAt || job.lastFailureAt)
        .filter(Boolean) as string[],
      ...membershipTiers.map((tier) => tier.updatedAt),
    ]
      .filter(Boolean)
      .sort()
      .at(-1) ?? null,
  });
}

async function seedDurableStoreFromFallback(store: AdminOperatorStore) {
  await Promise.all(store.refreshJobs.map((job) => saveDurableAdminRefreshJobRow(job)));
  await Promise.all(store.membershipTiers.map((tier) => saveDurableAdminMembershipTier(tier)));
  await Promise.all(store.records.map((record) => saveDurableAdminManagedRecordRow(record)));
  await Promise.all(store.revisions.map((revision) => appendDurableAdminRecordRevisionRow(revision)));
  await Promise.all(store.globalRevisions.map((revision) => appendDurableAdminGlobalRevisionRow(revision)));
  await Promise.all([
    saveDurableAdminGlobalCollectionRows("sharedBlocks", store.globalSite.sharedBlocks),
    saveDurableAdminGlobalCollectionRows("banners", store.globalSite.banners),
    saveDurableAdminGlobalCollectionRows("routeStrips", store.globalSite.routeStrips),
    saveDurableAdminGlobalCollectionRows("marketModules", store.globalSite.marketModules),
  ]);
}

async function readStore(): Promise<AdminOperatorStore> {
  const fallbackStore = await readFallbackStore();

  if (!hasDurableCmsStateStore()) {
    return fallbackStore;
  }

  const durableStore = await readDurableStore();
  if (!durableStore) {
    return fallbackStore;
  }

  if (canUseFileFallback() && shouldSeedDurableStore(durableStore, fallbackStore)) {
    await seedDurableStoreFromFallback(fallbackStore);
    const seeded = await readDurableStore();
    return seeded ?? fallbackStore;
  }

  return durableStore;
}

async function writeStore(
  store: AdminOperatorStore,
  options?: { skipWhenDisabled?: boolean },
) {
  await writeFallbackStore(store, options);
}

function withDerivedRefreshCounts(store: AdminOperatorStore) {
  const recordCountsByFamily = store.records.reduce<Record<string, number>>((acc, record) => {
    acc[record.family] = (acc[record.family] ?? 0) + 1;
    return acc;
  }, {});

  return {
    ...store,
    refreshJobs: store.refreshJobs.map((job) => ({
      ...job,
      affectedRecordsCount:
        typeof job.affectedRecordsCount === "number"
          ? job.affectedRecordsCount
          : recordCountsByFamily[job.family] ?? null,
    })),
  };
}

export async function getAdminOperatorStore() {
  return withDerivedRefreshCounts(await readStore());
}

export async function getAdminManagedRecord(
  family: string,
  slug: string,
  recordId?: string | null,
) {
  if (hasDurableCmsStateStore()) {
    const durableRecords = await listDurableAdminManagedRecords();
    const durableRecord =
      durableRecords?.find((record) => {
        if (recordId && record.id === cleanString(recordId)) {
          return true;
        }

        return (
          record.family === cleanString(family) &&
          record.slug === normalizeSlug(slug)
        );
      }) ?? null;
    if (durableRecord) {
      return normalizeRecord(durableRecord, 0);
    }
  }

  const store = await readStore();
  return (
    store.records.find(
      (record) =>
        record.family === cleanString(family) && record.slug === normalizeSlug(slug),
    ) ?? null
  );
}

export async function getAdminRefreshJobs() {
  if (hasDurableCmsStateStore()) {
    const jobs = await listDurableAdminRefreshJobs();
    if (jobs) {
      return withDerivedRefreshCounts({
        ...EMPTY_STORE,
        refreshJobs: jobs,
        records: await listDurableAdminManagedRecords() ?? [],
      }).refreshJobs;
    }
  }

  const store = await getAdminOperatorStore();
  return store.refreshJobs;
}

export async function getAdminMembershipTiers() {
  if (hasDurableCmsStateStore()) {
    const tiers = await listDurableAdminMembershipTiers();
    if (tiers) {
      return mergeWithDefaultMembershipTiers(tiers);
    }
  }

  const store = await getAdminOperatorStore();
  return mergeWithDefaultMembershipTiers(store.membershipTiers);
}

export async function getAdminMembershipTier(slug: string) {
  if (hasDurableCmsStateStore()) {
    const tier = await getDurableAdminMembershipTier(normalizeSlug(slug));
    if (tier) {
      return tier;
    }
  }

  const store = await readStore();
  return (
    mergeWithDefaultMembershipTiers(store.membershipTiers).find(
      (tier) => tier.slug === normalizeSlug(slug),
    ) ?? null
  );
}

export async function getAdminGlobalRevisions(
  section?: "header" | "footer" | "pageSidebar" | AdminGlobalCollectionKey,
) {
  if (hasDurableCmsStateStore()) {
    const revisions = await listDurableAdminGlobalRevisions(section, 200);
    if (revisions) {
      return revisions;
    }
  }

  const store = await readStore();
  return section
    ? store.globalRevisions.filter((revision) => revision.section === section)
    : store.globalRevisions;
}

export async function saveAdminManagedRecord(input: SaveAdminRecordInput) {
  const store = await readStore();
  const family = cleanString(input.family);
  const slug = normalizeSlug(input.slug);
  const originalSlug = normalizeSlug(input.originalSlug ?? input.slug);
  const recordId = cleanString(input.recordId);
  const now = new Date().toISOString();
  const existingIndex = store.records.findIndex(
    (record) =>
      (recordId && record.id === recordId) ||
      (record.family === family && record.slug === originalSlug),
  );
  const existing = existingIndex >= 0 ? store.records[existingIndex] : null;
  const sourceLabel = cleanString(input.sourceLabel) || existing?.sourceLabel || "";
  const sourceDate = cleanString(input.sourceDate) || existing?.sourceDate || "";
  const sourceUrl = cleanString(input.sourceUrl) || existing?.sourceUrl || "";

  const nextRecord = normalizeRecord(
    {
      id: existing?.id,
      family,
      slug,
      title: cleanString(input.title),
      symbol: cleanString(input.symbol) || null,
      benchmarkMapping: cleanString(input.benchmarkMapping) || existing?.benchmarkMapping,
      status: input.status,
      visibility:
        input.visibility ??
        (input.status === "published"
          ? "public"
          : input.status === "archived"
            ? "archived"
            : "private"),
      publicHref: cleanString(input.publicHref) || existing?.publicHref,
      canonicalRoute:
        cleanString(input.canonicalRoute) ||
        cleanString(input.publicHref) ||
        existing?.canonicalRoute ||
        existing?.publicHref,
      sourceTable: cleanString(input.sourceTable) || existing?.sourceTable,
      sourceRowId: cleanString(input.sourceRowId) || existing?.sourceRowId,
      sourceLabel,
      sourceDate,
      sourceUrl,
      sourceState: {
        sourceLabel: sourceLabel || existing?.sourceState.sourceLabel || "",
        sourceDate: sourceDate || existing?.sourceState.sourceDate || "",
        sourceUrl: sourceUrl || existing?.sourceState.sourceUrl || "",
        freshnessState: deriveFreshnessState(sourceDate, sourceLabel),
        lastRefreshAt: toIsoOrNull(
          existing?.sourceState.lastRefreshAt ?? sourceDate,
        ),
        lastSuccessfulRefreshAt: toIsoOrNull(
          existing?.sourceState.lastSuccessfulRefreshAt ?? sourceDate,
        ),
        nextScheduledRefreshAt: toIsoOrNull(existing?.sourceState.nextScheduledRefreshAt),
        sourceStatus:
          existing?.sourceState.sourceStatus ??
          defaultRecordSourceState({ sourceLabel, sourceUrl, sourceDate }).sourceStatus,
        importStatus:
          existing?.sourceState.importStatus ??
          defaultRecordSourceState({ sourceLabel, sourceUrl, sourceDate }).importStatus,
        readFailure:
          cleanString(existing?.sourceState.readFailure) ||
          null,
        latestError:
          cleanString(existing?.sourceState.latestError) ||
          null,
      },
      refreshState: {
        ...defaultRecordRefreshState(family, sourceDate),
        ...existing?.refreshState,
      },
      accessControl: normalizeAccessControl({
        ...existing?.accessControl,
        ...input.accessControl,
      }),
      assignedTo: cleanString(input.assignedTo) || existing?.assignedTo || null,
      assignedBy: cleanString(input.assignedBy) || existing?.assignedBy || null,
      dueDate: toIsoOrNull(input.dueDate ?? existing?.dueDate),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      scheduledPublishAt: toIsoOrNull(input.scheduledPublishAt ?? existing?.scheduledPublishAt),
      scheduledUnpublishAt: toIsoOrNull(
        input.scheduledUnpublishAt ?? existing?.scheduledUnpublishAt,
      ),
      sections: normalizeSections(input.sections),
      documents: (input.documents ?? existing?.documents ?? []).map((document, index) =>
        normalizeDocument(document, index),
      ),
      imports: (input.imports ?? existing?.imports ?? []).map((item, index) =>
        normalizeImportItem(item, index),
      ),
    },
    existingIndex >= 0 ? existingIndex : store.records.length,
  );

  const records =
    existingIndex >= 0
      ? store.records.map((record, index) => (index === existingIndex ? nextRecord : record))
      : [nextRecord, ...store.records];

  const nextStore: AdminOperatorStore = {
    ...store,
    records,
    updatedAt: now,
  };

  if (hasDurableCmsStateStore()) {
    const durableSaved = await saveDurableAdminManagedRecordRow(nextRecord);
    if (durableSaved) {
      const normalizedSaved = normalizeRecord(durableSaved, existingIndex >= 0 ? existingIndex : 0);
      await writeStore(
        {
          ...nextStore,
          records:
            existingIndex >= 0
              ? nextStore.records.map((record, index) =>
                  index === existingIndex ? normalizedSaved : record,
                )
              : [normalizedSaved, ...nextStore.records.filter((record) => record.id !== normalizedSaved.id)],
        },
        { skipWhenDisabled: true },
      );
      return normalizedSaved;
    }

    if (!canUseFileFallback()) {
      throw new Error(
        "Admin managed record durable write failed. See server logs for the Supabase error details.",
      );
    }
  }

  await writeStore(nextStore);
  return nextRecord;
}

export async function deleteAdminManagedRecord(input: {
  family: string;
  slug: string;
  recordId?: string | null;
}) {
  const store = await readStore();
  const family = cleanString(input.family);
  const slug = normalizeSlug(input.slug);
  const recordId = cleanString(input.recordId);
  const existingIndex = store.records.findIndex(
    (record) =>
      (recordId && record.id === recordId) ||
      (record.family === family && record.slug === slug),
  );

  if (existingIndex < 0) {
    return null;
  }

  const deletedRecord = store.records[existingIndex];
  const nextStore: AdminOperatorStore = {
    ...store,
    records: store.records.filter((_, index) => index !== existingIndex),
    updatedAt: new Date().toISOString(),
  };

  if (hasDurableCmsStateStore()) {
    await deleteDurableAdminManagedRecordRow({
      id: deletedRecord.id,
      family: deletedRecord.family,
      slug: deletedRecord.slug,
    });
    await writeStore(nextStore, { skipWhenDisabled: true });
    return deletedRecord;
  }

  await writeStore(nextStore);
  return deletedRecord;
}

export async function appendAdminRecordRevision(
  input: AppendAdminRecordRevisionInput,
) {
  const store = await readStore();
  const revision: AdminRecordRevision = {
    id: `admin_revision_${randomUUID()}`,
    family: cleanString(input.family),
    slug: normalizeSlug(input.slug),
    title: cleanString(input.title),
    editor: cleanString(input.editor),
    action: cleanString(input.action),
    changedFields: input.changedFields.map((item) => cleanString(item)).filter(Boolean),
    reason: cleanString(input.reason),
    revisionState: input.revisionState,
    routeTarget: cleanString(input.routeTarget),
    editedAt: new Date().toISOString(),
  };

  const nextStore: AdminOperatorStore = {
    ...store,
    revisions: [revision, ...store.revisions],
    updatedAt: new Date().toISOString(),
  };

  if (hasDurableCmsStateStore()) {
    const durableRevision = await appendDurableAdminRecordRevisionRow(revision);
    if (durableRevision) {
      await writeStore(nextStore, { skipWhenDisabled: true });
      return durableRevision;
    }

    if (!canUseFileFallback()) {
      throw new Error(
        "Admin record revision durable write failed. See server logs for the Supabase error details.",
      );
    }
  }

  await writeStore(nextStore);
  return revision;
}

export async function appendAdminGlobalRevision(
  input: AppendAdminGlobalRevisionInput,
) {
  const store = await readStore();
  const revision: AdminGlobalRevision = {
    id: `admin_global_revision_${randomUUID()}`,
    section: input.section,
    title: cleanString(input.title),
    editor: cleanString(input.editor),
    action: cleanString(input.action),
    status: input.status,
    changedCount: Number.isFinite(Number(input.changedCount))
      ? Number(input.changedCount)
      : 0,
    editedAt: new Date().toISOString(),
  };

  const nextStore: AdminOperatorStore = {
    ...store,
    globalRevisions: [revision, ...store.globalRevisions],
    updatedAt: revision.editedAt,
  };

  if (hasDurableCmsStateStore()) {
    const durableRevision = await appendDurableAdminGlobalRevisionRow(revision);
    if (durableRevision) {
      await writeStore(nextStore, { skipWhenDisabled: true });
      return durableRevision;
    }
  }

  await writeStore(nextStore);
  return revision;
}

export async function saveAdminGlobalCollection(
  input: SaveAdminGlobalCollectionInput,
) {
  const store = await readStore();
  const now = new Date().toISOString();

  const items = input.items
    .map((item, index) => normalizeGlobalModule({ ...item, updatedAt: now }, index))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const nextStore: AdminOperatorStore = {
    ...store,
    globalSite: {
      ...store.globalSite,
      [input.section]: items,
    },
    updatedAt: now,
  };

  if (hasDurableCmsStateStore()) {
    const durableItems = await saveDurableAdminGlobalCollectionRows(input.section, items);
    if (durableItems) {
      await writeStore(
        {
          ...nextStore,
          globalSite: {
            ...nextStore.globalSite,
            [input.section]: durableItems.map((item, index) => normalizeGlobalModule(item, index)),
          },
        },
        { skipWhenDisabled: true },
      );
      return durableItems;
    }
  }

  await writeStore(nextStore);
  return nextStore.globalSite[input.section];
}

export async function saveAdminMembershipTier(
  input: SaveAdminMembershipTierInput,
) {
  if (hasDurableCmsStateStore()) {
    const existing = await getDurableAdminMembershipTier(normalizeSlug(input.slug));
    const tier = normalizeMembershipTier(
      {
        id: existing?.id,
        slug: normalizeSlug(input.slug),
        name: cleanString(input.name),
        description: cleanString(input.description),
        status: input.status ?? existing?.status ?? "active",
        active:
          typeof input.active === "boolean"
            ? input.active
            : existing?.active ?? input.status !== "archived",
        displayOrder:
          Number.isFinite(Number(input.displayOrder))
            ? Number(input.displayOrder)
            : existing?.displayOrder ?? 1,
        visibility: input.visibility ?? existing?.visibility ?? "public",
        ctaLabel: cleanString(input.ctaLabel) || existing?.ctaLabel || "",
        ctaHref: cleanString(input.ctaHref) || existing?.ctaHref || "",
        includedFamilies: input.includedFamilies ?? existing?.includedFamilies ?? [],
        includedRecords: input.includedRecords ?? existing?.includedRecords ?? [],
        excludedRecords: input.excludedRecords ?? existing?.excludedRecords ?? [],
        featureAccess: normalizeMembershipFeatureAccess(
          input.featureAccess ?? existing?.featureAccess ?? null,
          input.slug,
        ),
        internalNotes: cleanString(input.internalNotes) || existing?.internalNotes || "",
        updatedAt: new Date().toISOString(),
      },
      existing ? Math.max(existing.displayOrder - 1, 0) : 0,
    );
    const saved = await saveDurableAdminMembershipTier(tier);
    if (saved) {
      if (canUseFileFallback()) {
        const fallbackStore = await readFallbackStore();
        const existingFallbackIndex = fallbackStore.membershipTiers.findIndex(
          (item) => item.slug === saved.slug,
        );
        const nextMembershipTiers =
          existingFallbackIndex >= 0
            ? fallbackStore.membershipTiers.map((item, index) =>
                index === existingFallbackIndex ? saved : item,
              )
            : [...fallbackStore.membershipTiers, saved];
        await writeFallbackStore(
          {
            ...fallbackStore,
            membershipTiers: nextMembershipTiers.sort(
              (left, right) => left.displayOrder - right.displayOrder,
            ),
            updatedAt: saved.updatedAt,
          },
          { skipWhenDisabled: true },
        );
      }
      return saved;
    }
  }

  const store = await readStore();
  const slug = normalizeSlug(input.slug);
  const now = new Date().toISOString();
  const existingIndex = store.membershipTiers.findIndex((tier) => tier.slug === slug);
  const existing = existingIndex >= 0 ? store.membershipTiers[existingIndex] : null;

  const nextTier = normalizeMembershipTier(
    {
      id: existing?.id,
      slug,
      name: cleanString(input.name),
      description: cleanString(input.description),
      status: input.status ?? existing?.status ?? "active",
      active:
        typeof input.active === "boolean"
          ? input.active
          : existing?.active ?? input.status !== "archived",
      displayOrder:
        Number.isFinite(Number(input.displayOrder))
          ? Number(input.displayOrder)
          : existing?.displayOrder ?? store.membershipTiers.length + 1,
      visibility: input.visibility ?? existing?.visibility ?? "public",
      ctaLabel: cleanString(input.ctaLabel) || existing?.ctaLabel || "",
      ctaHref: cleanString(input.ctaHref) || existing?.ctaHref || "",
      includedFamilies: input.includedFamilies ?? existing?.includedFamilies ?? [],
      includedRecords: input.includedRecords ?? existing?.includedRecords ?? [],
      excludedRecords: input.excludedRecords ?? existing?.excludedRecords ?? [],
      featureAccess: normalizeMembershipFeatureAccess(
        input.featureAccess ?? existing?.featureAccess ?? null,
        slug,
      ),
      internalNotes: cleanString(input.internalNotes) || existing?.internalNotes || "",
      updatedAt: now,
    },
    existingIndex >= 0 ? existingIndex : store.membershipTiers.length,
  );

  const membershipTiers =
    existingIndex >= 0
      ? store.membershipTiers.map((tier, index) => (index === existingIndex ? nextTier : tier))
      : [...store.membershipTiers, nextTier];

  const nextStore: AdminOperatorStore = {
    ...store,
    membershipTiers: membershipTiers.sort((left, right) => left.displayOrder - right.displayOrder),
    updatedAt: now,
  };

  await writeStore(nextStore);
  return nextTier;
}

export async function updateAdminImportItemStatus(
  input: UpdateAdminImportItemInput,
) {
  const store = await readStore();
  const family = cleanString(input.family);
  const slug = normalizeSlug(input.slug);
  const importId = cleanString(input.importId);
  const now = new Date().toISOString();

  const recordIndex = store.records.findIndex(
    (record) => record.family === family && record.slug === slug,
  );

  if (recordIndex < 0) {
    return null;
  }

  const record = store.records[recordIndex];
  const importIndex = record.imports.findIndex((item) => item.id === importId);

  if (importIndex < 0) {
    return null;
  }

  const nextImport: AdminManagedImportItem = {
    ...record.imports[importIndex],
    status: input.status,
    note: cleanString(input.note) || record.imports[importIndex].note,
    ranAt: now,
    liveValueState:
      input.status === "blocked_by_lock"
        ? "permanent_lock_live"
        : input.status === "conflict"
          ? "import_conflict_needs_review"
          : input.status === "source_failed"
            ? "source_read_failed"
            : input.status === "partial_update"
              ? "refresh_overdue"
              : record.imports[importIndex].liveValueState,
  };

  const nextRecord: AdminManagedRecord = {
    ...record,
    imports: record.imports.map((item, index) => (index === importIndex ? nextImport : item)),
    updatedAt: now,
    sourceState: {
      ...record.sourceState,
      importStatus:
        input.status === "blocked_by_lock"
          ? "locked_manual_value"
          : input.status === "conflict"
            ? "import_conflict_needs_review"
            : record.sourceState.importStatus,
      latestError:
        input.status === "source_failed"
          ? cleanString(input.note) || "Source read failed."
          : record.sourceState.latestError,
      readFailure:
        input.status === "source_failed"
          ? cleanString(input.note) || "Source read failed."
          : record.sourceState.readFailure,
    },
  };

  const nextStore: AdminOperatorStore = {
    ...store,
    records: store.records.map((item, index) => (index === recordIndex ? nextRecord : item)),
    updatedAt: now,
  };

  if (hasDurableCmsStateStore()) {
    const durableRecord = await saveDurableAdminManagedRecordRow(nextRecord);
    if (durableRecord) {
      await writeStore(nextStore, { skipWhenDisabled: true });
      return nextImport;
    }
  }

  await writeStore(nextStore);
  return nextImport;
}

export async function saveAdminRefreshJob(input: SaveAdminRefreshJobInput) {
  const store = await readStore();
  const now = new Date().toISOString();
  const jobIndex = store.refreshJobs.findIndex((job) => job.key === cleanString(input.key));

  if (jobIndex < 0) {
    return null;
  }

  const job = store.refreshJobs[jobIndex];
  const nextJob: AdminRefreshJob = {
    ...job,
    enabled: typeof input.enabled === "boolean" ? input.enabled : job.enabled,
    cadence: cleanString(input.cadence) || job.cadence,
    latestStatus: input.latestStatus ?? job.latestStatus,
    latestError:
      input.latestError === null
        ? null
        : cleanString(input.latestError) || job.latestError,
    nextScheduledRunAt:
      input.nextScheduledRunAt === null
        ? null
        : toIsoOrNull(input.nextScheduledRunAt) ?? job.nextScheduledRunAt,
    lastOperatorActionAt: now,
    lastOperatorNote: cleanString(input.lastOperatorNote) || job.lastOperatorNote,
  };

  const nextStore: AdminOperatorStore = {
    ...store,
    refreshJobs: store.refreshJobs.map((item, index) =>
      index === jobIndex ? nextJob : item,
    ),
    updatedAt: now,
  };

  if (hasDurableCmsStateStore()) {
    const durableJob = await saveDurableAdminRefreshJobRow(nextJob);
    if (durableJob) {
      await writeStore(nextStore, { skipWhenDisabled: true });
      return durableJob;
    }
  }

  await writeStore(nextStore);
  return nextJob;
}

export async function runAdminRefreshJob(input: RunAdminRefreshJobInput) {
  const store = await readStore();
  const now = new Date().toISOString();
  const jobIndex = store.refreshJobs.findIndex((job) => job.key === cleanString(input.key));

  if (jobIndex < 0) {
    return null;
  }

  const job = store.refreshJobs[jobIndex];
  const outcome = input.outcome ?? "running";
  const nextJob: AdminRefreshJob = {
    ...job,
    latestStatus: outcome,
    lastRunAt: now,
    lastSuccessAt: outcome === "healthy" ? now : job.lastSuccessAt,
    lastFailureAt: outcome === "failed" ? now : job.lastFailureAt,
    latestError:
      outcome === "failed"
        ? cleanString(input.note) || "Operator-triggered refresh reported a failure."
        : outcome === "healthy"
          ? null
          : job.latestError,
    lastOperatorActionAt: now,
    lastOperatorNote: cleanString(input.note) || job.lastOperatorNote,
  };

  const nextStore: AdminOperatorStore = {
    ...store,
    refreshJobs: store.refreshJobs.map((item, index) =>
      index === jobIndex ? nextJob : item,
    ),
    updatedAt: now,
  };

  if (hasDurableCmsStateStore()) {
    const durableJob = await saveDurableAdminRefreshJobRow(nextJob);
    if (durableJob) {
      await writeStore(nextStore, { skipWhenDisabled: true });
      return durableJob;
    }
  }

  await writeStore(nextStore);
  return nextJob;
}
