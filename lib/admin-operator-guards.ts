import {
  adminAccessModeOptions,
  adminFamilyMeta,
  adminOverrideModeOptions,
  adminPublishStateOptions,
  type AdminEditorRecord,
  type AdminFamilyKey,
} from "@/lib/admin-content-schema";
import {
  AdminValidationError,
  assertAdminEmailValue,
  assertAdminHttpUrlValue,
  assertAdminRouteValue,
  assertAdminSlugValue,
  assertAdminUrlOrRouteValue,
  cleanAdminIsoOrNull,
  cleanAdminString,
  cleanAdminStringArray,
  cleanOptionalAdminString,
} from "@/lib/admin-validation";
import {
  coreMembershipTierSlugs,
  type AdminAccessMode,
  type AdminGlobalCollectionKey,
  type AdminGlobalModule,
  type AdminManagedImportItem,
  type AdminManagedRecord,
  type AdminManagedDocument,
  type AdminOverrideMode,
  type AdminPublishState,
  type AdminRefreshJobStatus,
  type AdminRecordAccessControl,
  type AdminRecordSectionStore,
  type SaveAdminMembershipTierInput,
  type SaveAdminRecordInput,
} from "@/lib/admin-operator-store";
import type { SaveSystemSettingsInput } from "@/lib/user-product-store";
import { sanitizeSystemHeadCodeInput } from "@/lib/system-head-code";
import {
  normalizeProductUserCapabilities,
  productUserCapabilityOptions,
  type ProductUserCapability,
  type ProductUserRole,
} from "@/lib/product-permissions";
import { normalizeMembershipFeatureAccess } from "@/lib/membership-product-features";
import { isProductionMode } from "@/lib/durable-data-runtime";

const publishStateValues = new Set(adminPublishStateOptions.map((option) => option.value));
const overrideModeValues = new Set(adminOverrideModeOptions.map((option) => option.value));
const accessModeValues = new Set(adminAccessModeOptions.map((option) => option.value));
const refreshStatusValues = new Set<AdminRefreshJobStatus>([
  "healthy",
  "running",
  "warning",
  "failed",
  "paused",
  "planned",
]);
const allowedGlobalSections = new Set<AdminGlobalCollectionKey>([
  "sharedBlocks",
  "banners",
  "routeStrips",
  "marketModules",
]);
const identifierPattern = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/;
const userRoleValues = new Set<ProductUserRole>(["admin", "editor", "user"]);
const userCapabilityValues = new Set<ProductUserCapability>(
  productUserCapabilityOptions.map((option) => option.value),
);
const mediaStatusValues = new Set(["draft", "published"]);
const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const maxMediaUploadBytes = 5 * 1024 * 1024;

function slugifyAdminContentTitle(value: string) {
  return cleanAdminString(value, 240)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getCanonicalAdminPublicRoute(family: AdminFamilyKey, slug: string) {
  return family === "indices" ? `/${slug}` : `${adminFamilyMeta[family].routeBase}/${slug}`;
}

function shouldReplaceTemplateImportSlug(slug: string, title: string) {
  return slug.startsWith("import-test-") && !title.toLowerCase().startsWith("import test ");
}

function shouldNormalizeCanonicalUrlToManagedRoute(value: string | null | undefined) {
  const normalized = cleanAdminString(value, 800).toLowerCase();
  if (!normalized) {
    return true;
  }

  return normalized.includes("/import-test-") || /^https?:\/\/(?:www\.)?riddra\.com\//i.test(normalized);
}

function isUnsafeProductionHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  );
}

function assertProductionSafeExternalUrl(value: string | null, label: string) {
  if (!value || !isProductionMode()) {
    return value;
  }

  const parsed = new URL(value);

  if (parsed.protocol !== "https:") {
    throw new AdminOperatorValidationError(`${label} must use HTTPS in production mode.`);
  }

  if (isUnsafeProductionHost(parsed.hostname)) {
    throw new AdminOperatorValidationError(`${label} cannot point to a local-only host in production mode.`);
  }

  return value;
}

export class AdminOperatorValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminOperatorValidationError";
    this.status = status;
  }
}

export function assertAdminFamily(value: string): AdminFamilyKey {
  if (!(value in adminFamilyMeta)) {
    throw new AdminOperatorValidationError("Unsupported content family.");
  }

  return value as AdminFamilyKey;
}

export function assertAdminSlug(value: unknown, label = "Slug") {
  try {
    return assertAdminSlugValue(value, label);
  } catch (error) {
    if (error instanceof AdminValidationError) {
      throw new AdminOperatorValidationError(error.message, error.status);
    }

    throw error;
  }
}

export function assertAdminIdentifier(value: unknown, label = "Identifier", maxLength = 160) {
  const nextValue = cleanAdminString(value, maxLength);

  if (!nextValue) {
    throw new AdminOperatorValidationError(`${label} is required.`);
  }

  if (!identifierPattern.test(nextValue)) {
    throw new AdminOperatorValidationError(`${label} contains unsupported characters.`);
  }

  return nextValue;
}

export function sanitizeAdminEmail(value: unknown, label = "Email address") {
  try {
    return assertAdminEmailValue(value, label);
  } catch (error) {
    if (error instanceof AdminValidationError) {
      throw new AdminOperatorValidationError(error.message, error.status);
    }

    throw error;
  }
}

function sanitizeOptionalAdminEmail(value: unknown, label: string) {
  const nextValue = cleanAdminString(value, 160);
  return nextValue ? sanitizeAdminEmail(nextValue, label) : null;
}

export function assertAdminUserRole(value: unknown) {
  if (!userRoleValues.has(value as ProductUserRole)) {
    throw new AdminOperatorValidationError("Unsupported user role.");
  }

  return value as ProductUserRole;
}

export function sanitizeAdminUserCapabilities(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ProductUserCapability[];
  }

  const normalized = normalizeProductUserCapabilities(value);
  if (
    value.some((item) => !userCapabilityValues.has(String(item ?? "").trim() as ProductUserCapability))
  ) {
    throw new AdminOperatorValidationError("Unsupported capability in the user profile.");
  }

  return normalized;
}

export function assertAdminPublishState(value: unknown) {
  if (!publishStateValues.has(value as AdminPublishState)) {
    throw new AdminOperatorValidationError("Unsupported publish state.");
  }

  return value as AdminPublishState;
}

export function sanitizeAdminRoute(value: unknown, label: string) {
  try {
    return assertAdminRouteValue(value, label);
  } catch (error) {
    if (error instanceof AdminValidationError) {
      throw new AdminOperatorValidationError(error.message, error.status);
    }

    throw error;
  }
}

export function sanitizeAdminHttpUrl(value: unknown, label: string) {
  try {
    const sanitized = assertAdminHttpUrlValue(value, label);
    return assertProductionSafeExternalUrl(sanitized, label);
  } catch (error) {
    if (error instanceof AdminValidationError) {
      throw new AdminOperatorValidationError(error.message, error.status);
    }

    throw error;
  }
}

export function sanitizeAdminUrlOrRoute(value: unknown, label: string) {
  try {
    const sanitized = assertAdminUrlOrRouteValue(value, label);
    if (sanitized && /^https?:\/\//i.test(sanitized)) {
      return assertProductionSafeExternalUrl(sanitized, label);
    }

    return sanitized;
  } catch (error) {
    if (error instanceof AdminValidationError) {
      throw new AdminOperatorValidationError(error.message, error.status);
    }

    throw error;
  }
}

export function sanitizeAdminDocuments(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AdminManagedDocument[];
  }

  return value
    .slice(0, 50)
    .map((item, index) => {
      const document = item as Partial<AdminManagedDocument>;
      return {
        id: cleanAdminString(document.id, 120) || `document_${index + 1}`,
        label: cleanAdminString(document.label, 200),
        href: sanitizeAdminHttpUrl(document.href, "Document link") ?? "",
        sourceLabel: cleanAdminString(document.sourceLabel, 120),
        sourceDate: cleanAdminString(document.sourceDate, 120),
        enabled: document.enabled !== false,
      } satisfies AdminManagedDocument;
    })
    .filter((document) => document.label || document.href);
}

export function sanitizeAdminImports(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AdminManagedImportItem[];
  }

  return value
    .slice(0, 100)
    .map((item, index) => {
      const importItem = item as Partial<AdminManagedImportItem>;
      const status = cleanAdminString(importItem.status, 80) || "pending_review";
      const liveValueState =
        cleanAdminString(importItem.liveValueState, 120) || "import_conflict_needs_review";

      return {
        id: cleanAdminString(importItem.id, 160) || `import_${index + 1}`,
        batchLabel: cleanAdminString(importItem.batchLabel, 200),
        status: status as AdminManagedImportItem["status"],
        sourceLabel: cleanAdminString(importItem.sourceLabel, 160),
        sourceUrl: sanitizeAdminHttpUrl(importItem.sourceUrl, "Import source URL") ?? "",
        sourceDate: cleanAdminString(importItem.sourceDate, 160),
        ranAt: cleanAdminIsoOrNull(importItem.ranAt) ?? new Date().toISOString(),
        note: cleanAdminString(importItem.note, 1200),
        duplicateCandidate: cleanAdminString(importItem.duplicateCandidate, 240),
        changedFields: cleanAdminStringArray(importItem.changedFields, 120, 40),
        sourceChangedAt: cleanAdminIsoOrNull(importItem.sourceChangedAt),
        liveValueState: liveValueState as AdminManagedImportItem["liveValueState"],
      } satisfies AdminManagedImportItem;
    })
    .filter((item) => item.batchLabel || item.note || item.changedFields.length > 0);
}

export function sanitizeAdminRecordSections(
  payloadSections: SaveAdminRecordInput["sections"],
  editorRecord: AdminEditorRecord,
) {
  const sectionDefinitions = new Map(
    editorRecord.sections.map((section) => [
      section.definition.key,
      new Set(section.definition.fields.map((field) => field.key)),
    ]),
  );

  const sanitized = Object.fromEntries(
    Object.entries(payloadSections ?? {})
      .filter(([sectionKey]) => sectionDefinitions.has(sectionKey))
      .map(([sectionKey, section]) => {
        const allowedFields = sectionDefinitions.get(sectionKey) ?? new Set<string>();
        const values = Object.fromEntries(
          Object.entries(section?.values ?? {})
            .filter(([fieldKey]) => allowedFields.has(fieldKey))
            .map(([fieldKey, fieldValue]) => [fieldKey, cleanAdminString(fieldValue)])
            .slice(0, 120),
        );

        const nextMode = overrideModeValues.has(section?.mode)
          ? (section.mode as AdminOverrideMode)
          : "auto_source";

        return [
          sectionKey,
          {
            mode: nextMode,
            values,
            note: cleanAdminString(section?.note, 1200),
            lastManualEditAt: null,
            expiresAt:
              nextMode === "manual_until_next_refresh"
                ? cleanAdminIsoOrNull(section?.expiresAt)
                : null,
          } satisfies AdminRecordSectionStore,
        ];
      }),
  );

  return sanitized;
}

export function sanitizeAdminAccessControl(
  value: Partial<AdminRecordAccessControl> | undefined,
) {
  const mode = accessModeValues.has(value?.mode as AdminAccessMode)
    ? (value?.mode as AdminAccessMode)
    : "public_free";

  return {
    mode,
    allowedMembershipTiers: cleanAdminStringArray(value?.allowedMembershipTiers, 80, 24),
    requireLogin: Boolean(value?.requireLogin),
    showTeaserPublicly: value?.showTeaserPublicly !== false,
    showLockedPreview: Boolean(value?.showLockedPreview),
    ctaLabel: cleanOptionalAdminString(value?.ctaLabel, 120),
    ctaHref: sanitizeAdminRoute(value?.ctaHref, "Locked CTA destination"),
    internalNotes: cleanOptionalAdminString(value?.internalNotes, 1200),
  } satisfies AdminRecordAccessControl;
}

export function sanitizeAdminRecordPayload(
  payload: SaveAdminRecordInput,
  family: AdminFamilyKey,
  editorRecord: AdminEditorRecord,
  existingRecord?: AdminManagedRecord | null,
) {
  const status = assertAdminPublishState(payload.status);
  const title = cleanAdminString(payload.title, 200);
  const rawSlug = cleanAdminString(payload.slug, 160).toLowerCase();
  const slugCandidate =
    rawSlug && !shouldReplaceTemplateImportSlug(rawSlug, title)
      ? rawSlug
      : slugifyAdminContentTitle(title) || rawSlug;
  const slug = assertAdminSlug(slugCandidate || payload.slug);
  const nextSourceLabel = cleanOptionalAdminString(payload.sourceLabel, 120);
  const nextSourceDate = cleanOptionalAdminString(payload.sourceDate, 120);
  const nextSourceUrl = sanitizeAdminHttpUrl(payload.sourceUrl, "Primary source URL");
  const preservedSourceState = existingRecord?.sourceState;
  const preservedRefreshState = existingRecord?.refreshState;

  if (!title) {
    throw new AdminOperatorValidationError("Title is required.");
  }

  const publicHref = getCanonicalAdminPublicRoute(family, slug);
  const canonicalRoute = publicHref;
  const scheduledPublishAt = cleanAdminIsoOrNull(payload.scheduledPublishAt);
  const scheduledUnpublishAt = cleanAdminIsoOrNull(payload.scheduledUnpublishAt);

  if (status === "published" && !publicHref) {
    throw new AdminOperatorValidationError("Published records must include a public route.");
  }

  if (
    scheduledPublishAt &&
    scheduledUnpublishAt &&
    new Date(scheduledUnpublishAt).getTime() <= new Date(scheduledPublishAt).getTime()
  ) {
    throw new AdminOperatorValidationError(
      "Scheduled unpublish must be later than scheduled publish.",
    );
  }

  const sections = sanitizeAdminRecordSections(payload.sections, editorRecord);
  if (sections.publishing) {
    sections.publishing.values.publicRoute = publicHref;
  }
  if (
    sections.seo &&
    shouldNormalizeCanonicalUrlToManagedRoute(sections.seo.values.canonicalUrl)
  ) {
    sections.seo.values.canonicalUrl = `https://www.riddra.com${publicHref}`;
  }

  return {
    recordId: cleanOptionalAdminString(payload.recordId, 160),
    originalSlug: cleanOptionalAdminString(payload.originalSlug, 160),
    lastKnownUpdatedAt: cleanAdminIsoOrNull(payload.lastKnownUpdatedAt),
    family,
    slug,
    title,
    symbol: cleanOptionalAdminString(payload.symbol, 80),
    benchmarkMapping: cleanOptionalAdminString(payload.benchmarkMapping, 160),
    status,
    visibility:
      payload.visibility === "archived"
        ? "archived"
        : payload.visibility === "public" && status === "published"
          ? "public"
          : status === "archived"
            ? "archived"
            : status === "published"
              ? "public"
              : "private",
    publicHref,
    canonicalRoute,
    sourceTable: cleanOptionalAdminString(payload.sourceTable, 160),
    sourceRowId: cleanOptionalAdminString(payload.sourceRowId, 160),
    sourceLabel: nextSourceLabel,
    sourceDate: nextSourceDate,
    sourceUrl: nextSourceUrl,
    sourceState: {
      sourceLabel: nextSourceLabel ?? undefined,
      sourceDate: nextSourceDate ?? undefined,
      sourceUrl: nextSourceUrl ?? undefined,
      lastRefreshAt: preservedSourceState?.lastRefreshAt ?? cleanAdminIsoOrNull(nextSourceDate),
      lastSuccessfulRefreshAt:
        preservedSourceState?.lastSuccessfulRefreshAt ?? cleanAdminIsoOrNull(nextSourceDate),
      nextScheduledRefreshAt: preservedSourceState?.nextScheduledRefreshAt ?? null,
      latestError: preservedSourceState?.latestError ?? undefined,
    },
    refreshState: {
      refreshEnabled: preservedRefreshState?.refreshEnabled,
      laneLabel: preservedRefreshState?.laneLabel,
      cadence: preservedRefreshState?.cadence,
      latestStatus:
        preservedRefreshState?.latestStatus &&
        refreshStatusValues.has(preservedRefreshState.latestStatus as AdminRefreshJobStatus)
          ? preservedRefreshState.latestStatus
          : undefined,
      nextScheduledRunAt: preservedRefreshState?.nextScheduledRunAt,
      lastSuccessAt: preservedRefreshState?.lastSuccessAt ?? null,
      lastFailureAt: preservedRefreshState?.lastFailureAt ?? null,
      latestError: preservedRefreshState?.latestError ?? null,
      sourceDependency: preservedRefreshState?.sourceDependency,
    },
    accessControl: sanitizeAdminAccessControl(payload.accessControl),
    assignedTo: sanitizeOptionalAdminEmail(payload.assignedTo, "Assigned to"),
    assignedBy: sanitizeOptionalAdminEmail(payload.assignedBy, "Assigned by"),
    dueDate: cleanAdminIsoOrNull(payload.dueDate),
    scheduledPublishAt,
    scheduledUnpublishAt,
    sections,
    documents: sanitizeAdminDocuments(payload.documents),
    imports: sanitizeAdminImports(payload.imports),
  } satisfies SaveAdminRecordInput;
}

export function sanitizeAdminGlobalCollectionInput(
  section: unknown,
  items: unknown,
) {
  if (!allowedGlobalSections.has(section as AdminGlobalCollectionKey)) {
    throw new AdminOperatorValidationError("Unsupported global-site section.");
  }

  if (!Array.isArray(items)) {
    throw new AdminOperatorValidationError("Global-site items are required.");
  }

  return {
    section: section as AdminGlobalCollectionKey,
    items: items.slice(0, 60).map((item, index) => sanitizeAdminGlobalModule(item, index)),
  };
}

function sanitizeAdminGlobalModule(value: unknown, index: number) {
  const item = (value ?? {}) as Partial<AdminGlobalModule>;

  return {
    id: cleanAdminString(item.id, 120) || `global_item_${index + 1}`,
    title: cleanAdminString(item.title, 160),
    eyebrow: cleanAdminString(item.eyebrow, 120),
    body: cleanAdminString(item.body, 4000),
    href: sanitizeAdminRoute(item.href, "Module route") ?? "",
    ctaLabel: cleanAdminString(item.ctaLabel, 120),
    moduleType: cleanAdminString(item.moduleType, 80) || "shared_module",
    featured: item.featured === true,
    priority:
      Number.isFinite(Number(item.priority)) && Number(item.priority) > 0
        ? Number(item.priority)
        : index + 1,
    archiveGroup: cleanOptionalAdminString(item.archiveGroup, 120),
    visibilityFamilies: cleanAdminStringArray(item.visibilityFamilies, 80, 30).filter(
      (family) => family in adminFamilyMeta,
    ),
    assignments: cleanAdminStringArray(item.assignments, 120, 40),
    comingSoon: item.comingSoon === true,
    hideUntilReady: item.hideUntilReady === true,
    enabled: item.enabled !== false,
    status: item.status === "published" ? "published" : "draft",
    placement: cleanAdminString(item.placement, 120),
    sortOrder:
      Number.isFinite(Number(item.sortOrder)) && Number(item.sortOrder) > 0
        ? Number(item.sortOrder)
        : index + 1,
    updatedAt: cleanAdminString(item.updatedAt, 120),
  } satisfies AdminGlobalModule;
}

export function sanitizeAdminMembershipTierInput(value: SaveAdminMembershipTierInput) {
  const slug = assertAdminSlug(value.slug, "Tier slug");
  const name = cleanAdminString(value.name, 120);
  const allowedTierSlugs = new Set<string>(coreMembershipTierSlugs);

  if (!name) {
    throw new AdminOperatorValidationError("Tier name is required.");
  }

  if (!allowedTierSlugs.has(slug)) {
    throw new AdminOperatorValidationError("Membership tiers are limited to Free, Pro, and Pro Max.");
  }

  return {
    slug,
    name,
    description: cleanOptionalAdminString(value.description, 400),
    status: value.status === "archived" ? "archived" : "active",
    active: typeof value.active === "boolean" ? value.active : undefined,
    displayOrder:
      Number.isFinite(Number(value.displayOrder)) && Number(value.displayOrder) > 0
        ? Number(value.displayOrder)
        : undefined,
    visibility: value.visibility === "private" ? "private" : "public",
    ctaLabel: cleanOptionalAdminString(value.ctaLabel, 120),
    ctaHref: sanitizeAdminRoute(value.ctaHref, "Tier CTA route"),
    includedFamilies: cleanAdminStringArray(value.includedFamilies, 80, 24).filter(
      (family) => family in adminFamilyMeta,
    ),
    includedRecords: cleanAdminStringArray(value.includedRecords, 160, 80),
    excludedRecords: cleanAdminStringArray(value.excludedRecords, 160, 80),
    featureAccess: normalizeMembershipFeatureAccess(value.featureAccess, slug),
    internalNotes: cleanOptionalAdminString(value.internalNotes, 1200),
  } satisfies SaveAdminMembershipTierInput;
}

export function sanitizeAdminUserProfileInput(value: {
  email?: unknown;
  name?: unknown;
  profileVisible?: unknown;
  membershipTier?: unknown;
  role?: unknown;
  capabilities?: unknown;
}) {
  return {
    email: sanitizeAdminEmail(value.email),
    name: cleanOptionalAdminString(value.name, 160),
    profileVisible:
      typeof value.profileVisible === "boolean" ? value.profileVisible : undefined,
    membershipTier: cleanOptionalAdminString(value.membershipTier, 120),
    role: value.role === undefined ? undefined : assertAdminUserRole(value.role),
    capabilities:
      value.capabilities === undefined ? undefined : sanitizeAdminUserCapabilities(value.capabilities),
  };
}

export function sanitizeAdminSystemSettingsInput(
  value: Record<string, unknown>,
): SaveSystemSettingsInput {
  let publicHeadCode: string | undefined;

  try {
    publicHeadCode =
      value.publicHeadCode === undefined ? undefined : sanitizeSystemHeadCodeInput(value.publicHeadCode) ?? "";
  } catch (error) {
    if (error instanceof Error) {
      throw new AdminOperatorValidationError(error.message);
    }

    throw error;
  }

  return {
    siteName: cleanOptionalAdminString(value.siteName, 120) ?? undefined,
    defaultMetaTitleSuffix: cleanOptionalAdminString(value.defaultMetaTitleSuffix, 120) ?? undefined,
    defaultMetaDescription:
      cleanOptionalAdminString(value.defaultMetaDescription, 320) ?? undefined,
    defaultOgImage: sanitizeAdminUrlOrRoute(value.defaultOgImage, "Default OG image") ?? undefined,
    defaultCanonicalBase:
      sanitizeAdminHttpUrl(value.defaultCanonicalBase, "Default canonical base") ?? undefined,
    publicHeadCode,
    defaultMembershipTier:
      cleanOptionalAdminString(value.defaultMembershipTier, 80) ?? undefined,
    defaultLockedCtaLabel:
      cleanOptionalAdminString(value.defaultLockedCtaLabel, 120) ?? undefined,
    supportEmail: value.supportEmail ? sanitizeAdminEmail(value.supportEmail, "Support email") : undefined,
    supportRoute: sanitizeAdminRoute(value.supportRoute, "Support route") ?? undefined,
    defaultNoIndex:
      typeof value.defaultNoIndex === "boolean" ? value.defaultNoIndex : undefined,
    previewEnabled:
      typeof value.previewEnabled === "boolean" ? value.previewEnabled : undefined,
    mediaUploadsEnabled:
      typeof value.mediaUploadsEnabled === "boolean" ? value.mediaUploadsEnabled : undefined,
    watchlistEnabled:
      typeof value.watchlistEnabled === "boolean" ? value.watchlistEnabled : undefined,
    portfolioEnabled:
      typeof value.portfolioEnabled === "boolean" ? value.portfolioEnabled : undefined,
  };
}

export function sanitizeAdminExternalMediaAssetInput(value: {
  title?: unknown;
  altText?: unknown;
  url?: unknown;
  assetType?: unknown;
  category?: unknown;
  tags?: unknown;
  status?: unknown;
}): {
  title: string | null;
  altText: string | null;
  url: string | null;
  assetType: "image" | "document";
  category: string | null;
  tags: string[];
  status: "draft" | "published";
} {
  const status = mediaStatusValues.has(String(value.status ?? "draft"))
    ? (String(value.status) as "draft" | "published")
    : "draft";
  const assetType = String(value.assetType ?? "image") === "document" ? "document" : "image";

  return {
    title: cleanOptionalAdminString(value.title, 160),
    altText: cleanOptionalAdminString(value.altText, 240),
    url: sanitizeAdminHttpUrl(value.url, "Asset URL"),
    assetType,
    category: cleanOptionalAdminString(value.category, 80),
    tags: cleanAdminStringArray(value.tags, 40, 20),
    status,
  };
}

export function assertAdminMediaUpload(input: {
  name?: string;
  type?: string;
  size?: number;
}) {
  const mimeType = cleanAdminString(input.type, 120).toLowerCase();
  const fileName = cleanAdminString(input.name, 200);
  const size = Number(input.size ?? 0);

  if (!fileName) {
    throw new AdminOperatorValidationError("Image file name is required.");
  }

  if (!allowedImageMimeTypes.has(mimeType)) {
    throw new AdminOperatorValidationError("Only JPEG, PNG, WebP, GIF, and AVIF images are allowed.");
  }

  if (!Number.isFinite(size) || size <= 0 || size > maxMediaUploadBytes) {
    throw new AdminOperatorValidationError("Image uploads must be smaller than 5 MB.");
  }

  return {
    fileName,
    mimeType,
    size,
  };
}

export function sanitizeAdminFailureMessage(error: unknown) {
  if (error instanceof AdminValidationError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof AdminOperatorValidationError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  ) {
    const redirectTarget = error.digest.split(";")[2] ?? "";

    return {
      status: redirectTarget === "/login" ? 401 : 403,
      message:
        redirectTarget === "/login"
          ? "Sign-in required."
          : "You do not have permission to perform this admin action.",
    };
  }

  return {
    status: 500,
    message: "This admin action could not be completed right now. Please retry or ask an operator to review the server logs.",
  };
}
