import { cache } from "react";
import { getFund, getFunds, getIpo, getIpos, getStock, getStocks } from "@/lib/content";
import type { CourseItem } from "@/lib/courses";
import { courses } from "@/lib/courses";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import { getIndexSnapshot, getIndexSnapshots } from "@/lib/index-content";
import { learnArticles, type LearnArticle } from "@/lib/learn";
import type { FundSnapshot, IpoSnapshot, StockSnapshot } from "@/lib/mock-data";
import { newsletterTracks, type NewsletterTrack } from "@/lib/newsletter";
import {
  getAdminMembershipTiers,
  type AdminManagedRecord,
  type AdminRecordAccessControl,
  type AdminOverrideMode,
  type AdminPublishState,
} from "@/lib/admin-operator-store";
import {
  adminAccessModeOptions,
  type AdminEditorRecord,
  type AdminFamilyKey,
  type AdminFieldDefinition,
  type AdminFieldRegistryEntry,
  adminFamilyMeta,
  getMembershipTierOptionList,
  type AdminListRow,
  adminOverrideModeOptions,
  adminPublishStateOptions,
  type AdminSectionDefinition,
  type AdminSectionSeed,
  type AdminSectionState,
} from "@/lib/admin-content-schema";
import {
  buildGeneratedSeoDefaults,
  pickFirstNonEmptySeoValue,
} from "@/lib/generated-seo";
import { getLaunchConfigStore } from "@/lib/launch-config-store";
import { listUserProductProfiles } from "@/lib/user-product-store";
import { listAdminEditorLocks } from "@/lib/admin-editor-locks";
import type { Webinar } from "@/lib/webinars";
import { webinars } from "@/lib/webinars";
import type { WealthFamily, WealthProduct } from "@/lib/wealth-products";
import { getWealthProductsByFamily } from "@/lib/wealth-products";
export {
  adminFamilyMeta,
  adminOverrideModeOptions,
  adminPublishStateOptions,
  type AdminEditorRecord,
  type AdminFamilyKey,
  type AdminFieldDefinition,
  type AdminListRow,
  type AdminSectionDefinition,
  type AdminSectionState,
};

type AdminRowsQueryOptions = {
  cacheKey?: string | null;
};

type AdminRecordSearchOptions = AdminRowsQueryOptions & {
  limit?: number;
  families?: AdminFamilyKey[];
};

const ADMIN_ROW_CACHE_LIMIT = 96;
const adminFamilyRowsCache = new Map<string, AdminListRow[]>();
const adminAllRowsCache = new Map<string, AdminListRow[]>();

export const memberFacingAdminFamilies: AdminFamilyKey[] = [
  "courses",
  "webinars",
  "learn",
  "newsletter",
  "research-articles",
  "etfs",
  "pms",
  "aif",
  "sif",
];

function setBoundedListCache(
  cacheMap: Map<string, AdminListRow[]>,
  key: string,
  value: AdminListRow[],
) {
  if (cacheMap.size >= ADMIN_ROW_CACHE_LIMIT && !cacheMap.has(key)) {
    const oldestKey = cacheMap.keys().next().value;
    if (oldestKey) {
      cacheMap.delete(oldestKey);
    }
  }

  cacheMap.set(key, value);
}

function buildRecordsSignature(
  records: AdminManagedRecord[],
  family?: AdminFamilyKey,
) {
  let count = 0;
  let checksum = 17;
  let latestUpdatedAt = "";

  for (const record of records) {
    if (family && record.family !== family) {
      continue;
    }

    count += 1;
    if (record.updatedAt > latestUpdatedAt) {
      latestUpdatedAt = record.updatedAt;
    }

    const token = `${record.family}:${record.slug}:${record.updatedAt}:${record.status}:${record.visibility}`;
    for (let index = 0; index < token.length; index += 1) {
      checksum = (checksum * 31 + token.charCodeAt(index)) % 2147483647;
    }
  }

  return `${family ?? "all"}:${count}:${latestUpdatedAt}:${checksum}`;
}

function buildAdminRowsCacheKey(
  scope: "family" | "all",
  records: AdminManagedRecord[],
  options?: AdminRowsQueryOptions,
  family?: AdminFamilyKey,
) {
  const explicitCacheKey = options?.cacheKey?.trim();

  if (explicitCacheKey) {
    return scope === "family" && family
      ? `${scope}:${family}:${explicitCacheKey}`
      : `${scope}:${explicitCacheKey}`;
  }

  const derivedSignature = buildRecordsSignature(records, family);
  return scope === "family" && family
    ? `${scope}:${family}:${derivedSignature}`
    : `${scope}:${derivedSignature}`;
}

function getAdminFamilyKeys(input?: AdminFamilyKey[]) {
  const families = input?.length
    ? input
    : (Object.keys(adminFamilyMeta) as AdminFamilyKey[]);

  return Array.from(new Set(families));
}

const publishStateField: AdminFieldDefinition = {
  key: "publishState",
  label: "Publish state",
  type: "select",
  options: adminPublishStateOptions,
};

const truthStateField: AdminFieldDefinition = {
  key: "truthLabel",
  label: "Truth posture",
  type: "text",
  placeholder: "Source-backed stock route",
};

const publicRouteField: AdminFieldDefinition = {
  key: "publicRoute",
  label: "Public route",
  type: "text",
  placeholder: "/stocks/tata-motors",
};

const scheduledPublishField: AdminFieldDefinition = {
  key: "scheduledPublishAt",
  label: "Scheduled publish",
  type: "text",
  placeholder: "2026-04-21T18:30:00Z",
};

const scheduledUnpublishField: AdminFieldDefinition = {
  key: "scheduledUnpublishAt",
  label: "Scheduled unpublish",
  type: "text",
  placeholder: "2026-04-28T18:30:00Z",
};

const sourceStateField: AdminFieldDefinition = {
  key: "sourceState",
  label: "Source state",
  type: "text",
  placeholder: "source_backed",
};

const sourceUpdatedField: AdminFieldDefinition = {
  key: "sourceUpdatedAt",
  label: "Last source refresh",
  type: "text",
  placeholder: "Awaiting source refresh",
};

const documentsTextField: AdminFieldDefinition = {
  key: "documentLinksText",
  label: "Document / link rows",
  type: "textarea",
  rows: 5,
  placeholder: "Document label | https://example.com/file.pdf | Source label | Source date",
};

const yesNoOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
] satisfies Array<{ label: string; value: string }>;

const stockSectorIndexOptions = [
  { label: "Nifty 50", value: "nifty50" },
  { label: "Nifty 100", value: "nifty100" },
  { label: "Nifty 200", value: "nifty200" },
  { label: "Nifty 500", value: "nifty500" },
  { label: "NSE Equities", value: "nse_equities" },
  { label: "Nifty Auto", value: "nifty_auto" },
  { label: "Nifty Bank", value: "banknifty" },
  { label: "Fin Nifty", value: "finnifty" },
  { label: "Nifty IT", value: "nifty_it" },
  { label: "Nifty FMCG", value: "nifty_fmcg" },
  { label: "Nifty Pharma", value: "nifty_pharma" },
  { label: "Nifty Metal", value: "nifty_metal" },
  { label: "Nifty PSU Bank", value: "nifty_psu_bank" },
  { label: "Nifty Realty", value: "nifty_realty" },
  { label: "Nifty Energy", value: "nifty_energy" },
  { label: "Sensex", value: "sensex" },
] satisfies Array<{ label: string; value: string }>;

const stockIndexMembershipOptions = [
  { label: "Nifty 50", value: "nifty50" },
  { label: "Nifty Next 50", value: "nifty_next_50" },
  { label: "Nifty 100", value: "nifty100" },
  { label: "Nifty 200", value: "nifty200" },
  { label: "Nifty 500", value: "nifty500" },
  { label: "Sensex", value: "sensex" },
  { label: "BSE 100", value: "bse100" },
  { label: "BSE 200", value: "bse200" },
  { label: "Bank Nifty", value: "banknifty" },
  { label: "Fin Nifty", value: "finnifty" },
  { label: "Nifty Auto", value: "nifty_auto" },
  { label: "Nifty IT", value: "nifty_it" },
  { label: "Nifty FMCG", value: "nifty_fmcg" },
  { label: "Nifty Pharma", value: "nifty_pharma" },
  { label: "Nifty Metal", value: "nifty_metal" },
  { label: "Nifty PSU Bank", value: "nifty_psu_bank" },
] satisfies Array<{ label: string; value: string }>;

const accessEligibleFamilies = new Set<AdminFamilyKey>([
  "courses",
  "webinars",
  "learn",
  "newsletter",
  "research-articles",
  "etfs",
  "pms",
  "aif",
  "sif",
]);

function lines(items: Array<string | null | undefined>) {
  return items.filter((item): item is string => Boolean(item && item.trim())).join("\n");
}

function rowsToText<T>(items: T[], mapper: (item: T) => string) {
  return items.map(mapper).filter(Boolean).join("\n");
}

function linksToText(items: Array<{ label: string; href: string; note?: string }>) {
  return rowsToText(items, (item) => {
    const note = item.note?.trim();
    return note ? `${item.label} | ${item.href} | ${note}` : `${item.label} | ${item.href}`;
  });
}

function keyValueText(items: Array<{ label: string; value: string }>) {
  return rowsToText(items, (item) => `${item.label} | ${item.value}`);
}

function labelValueNoteText(items: Array<{ label: string; value: string; note: string }>) {
  return rowsToText(items, (item) => `${item.label} | ${item.value} | ${item.note}`);
}

function faqText(items: Array<{ question: string; answer: string }>) {
  return rowsToText(items, (item) => `${item.question} | ${item.answer}`);
}

function stockNewsText(items: Array<{ title: string; source: string; type: string }>) {
  return rowsToText(items, (item) => `${item.title} | ${item.source} | ${item.type}`);
}

function fundHoldingsText(items: Array<{ name: string; sector: string; weight: string }>) {
  return rowsToText(items, (item) => `${item.name} | ${item.sector} | ${item.weight}`);
}

function allocationText(items: Array<{ name: string; weight: string }>) {
  return rowsToText(items, (item) => `${item.name} | ${item.weight}`);
}

function ensureValues(
  fields: AdminFieldDefinition[],
  values: Record<string, string | null | undefined>,
) {
  return Object.fromEntries(fields.map((field) => [field.key, values[field.key] ?? ""]));
}

const criticalFieldKeys = new Set([
  "companyName",
  "fundName",
  "name",
  "title",
  "slug",
  "symbol",
  "summary",
  "shortDescription",
  "description",
  "bodyBlocksText",
  "issueBodyBlocksText",
  "modulesText",
  "lessonPlanText",
  "liveDateTime",
  "registrationLink",
]);

const importantFieldKeys = new Set([
  "sector",
  "sectorIndexSlug",
  "benchmark",
  "benchmarkIndexSlug",
  "managerName",
  "category",
  "subtitle",
  "coverImage",
  "speakerHost",
  "objective",
  "agendaText",
  "resourcesText",
  "featuredLinksText",
  "keyTakeawaysText",
  "publicRoute",
  "publishState",
  "assignedTo",
  "dueDate",
  "accessMode",
  "metaTitle",
  "metaDescription",
]);

function inferFieldPriority(
  sectionKey: string,
  field: AdminSectionSeed["definition"]["fields"][number],
): NonNullable<AdminFieldDefinition["priority"]> {
  if (field.priority) {
    return field.priority;
  }

  if (sectionKey === "workflow") {
    if (field.key === "publishState") {
      return "critical";
    }

    if (field.key === "assignedTo" || field.key === "dueDate") {
      return "important";
    }

    return "optional";
  }

  if (sectionKey === "identity" && criticalFieldKeys.has(field.key)) {
    return "critical";
  }

  if (criticalFieldKeys.has(field.key)) {
    return "important";
  }

  if (importantFieldKeys.has(field.key)) {
    return "important";
  }

  if (["publishing", "access_control", "seo", "relations"].includes(sectionKey)) {
    return "important";
  }

  return "optional";
}

function isReadOnlyField(sectionKey: string, fieldKey: string) {
  if (sectionKey === "workflow" && fieldKey === "publishState") {
    return true;
  }

  if (fieldKey === "assignedBy") {
    return true;
  }

  if (
    ["truthLabel", "sourceState", "sourceUpdatedAt", "lastSuccessAt", "lastFailureAt", "latestStatus"].includes(fieldKey)
  ) {
    return true;
  }

  if (sectionKey === "data_sources" && fieldKey !== "sourceUrl" && fieldKey !== "primarySourceCode") {
    return true;
  }

  return false;
}

function isAdminOnlyField(sectionKey: string) {
  return sectionKey === "data_sources" || sectionKey === "refresh_automation";
}

function getFieldWarningText(sectionKey: string, fieldKey: string) {
  if (sectionKey === "workflow" && fieldKey === "publishState") {
    return "Use the action buttons on the right to move this record through draft, review, fix, publish, or archive.";
  }

  if (fieldKey === "publishState") {
    return "Changes workflow and live readiness.";
  }

  if (fieldKey === "slug" || fieldKey === "symbol") {
    return "Changes core identity and route mapping.";
  }

  if (fieldKey === "publicRoute") {
    return "Changes the public route operators and visitors use.";
  }

  if (fieldKey === "accessMode") {
    return "Changes who can open this content.";
  }

  if (sectionKey === "workflow" && fieldKey === "dueDate") {
    return "Use a real target date so review queues stay trustworthy.";
  }

  return undefined;
}

function normalizeSectionDefinition(definition: AdminSectionSeed["definition"]): AdminSectionDefinition {
  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    fields: definition.fields.map((field) => ({
      ...field,
      type: field.type as AdminFieldDefinition["type"],
      sourceType: inferFieldSourceType(definition.key, field.key),
      editable:
        !(field.key === "publishState" && definition.key !== "workflow") &&
        !isReadOnlyField(definition.key, field.key),
      frontendVisible: isFrontendVisible(definition.key, field.key),
      overrideCapable: isOverrideCapable(definition.key, field.key),
      dataType: inferFieldDataType(field),
      sectionGroup: definition.key,
      priority: inferFieldPriority(definition.key, field),
      readOnly: isReadOnlyField(definition.key, field.key),
      adminOnly: isAdminOnlyField(definition.key),
      warningText: getFieldWarningText(definition.key, field.key),
    })),
  };
}

function inferFieldSourceType(
  sectionKey: string,
  fieldKey: string,
): NonNullable<AdminFieldDefinition["sourceType"]> {
  if (sectionKey === "identity") {
    return "identity";
  }

  if (sectionKey === "documents_links") {
    return "document";
  }

  if (sectionKey === "refresh_automation") {
    return "automation";
  }

  if (sectionKey === "data_sources") {
    return "source";
  }

  if (fieldKey === "publishState") {
    return "computed";
  }

  if (sectionKey === "workflow") {
    return "hybrid";
  }

  if (sectionKey === "publishing") {
    return "hybrid";
  }

  return "manual";
}

function isFrontendVisible(sectionKey: string, fieldKey: string) {
  if (sectionKey === "workflow") {
    return false;
  }

  if (sectionKey === "data_sources") {
    return ["sourceUrl"].includes(fieldKey);
  }

  if (sectionKey === "refresh_automation") {
    return false;
  }

  return fieldKey !== "publishState";
}

function isOverrideCapable(sectionKey: string, fieldKey: string) {
  if (fieldKey === "publishState") {
    return false;
  }

  return !["workflow", "data_sources", "refresh_automation"].includes(sectionKey);
}

function inferFieldDataType(
  field:
    | AdminSectionDefinition["fields"][number]
    | AdminSectionSeed["definition"]["fields"][number],
): NonNullable<AdminFieldDefinition["dataType"]> {
  if (field.type === "textarea") {
    return "multiline";
  }

  if (field.type === "select" || field.type === "checklist") {
    return "enum";
  }

  if (field.key.toLowerCase().includes("url") || field.placeholder?.startsWith("https://")) {
    return "url";
  }

  if (field.key.toLowerCase().includes("route") || field.key.toLowerCase().includes("href")) {
    return "route";
  }

  if (field.key.toLowerCase().includes("date")) {
    return "date";
  }

  if (
    field.key.toLowerCase().includes("aum") ||
    field.key.toLowerCase().includes("ratio") ||
    field.key.toLowerCase().includes("price") ||
    field.key.toLowerCase().includes("ticket")
  ) {
    return "number_like";
  }

  return "string";
}

function buildFieldRegistry(
  family: AdminFamilyKey,
  sections: AdminSectionDefinition[],
): AdminFieldRegistryEntry[] {
  return sections.flatMap((section) =>
    section.fields.map((field) => ({
      id: `${family}:${section.key}:${field.key}`,
      family,
      sectionKey: section.key,
      sectionLabel: section.label,
      key: field.key,
      label: field.label,
      sourceType: field.sourceType ?? "manual",
      editable: field.editable !== false,
      frontendVisible: field.frontendVisible !== false,
      overrideCapable: field.overrideCapable !== false,
      dataType: field.dataType ?? "string",
      priority: field.priority ?? "optional",
      readOnly: field.readOnly === true,
      adminOnly: field.adminOnly === true,
      warningText: field.warningText ?? null,
    })),
  );
}

function resolveSectionMode(record: AdminManagedRecord | null, key: string): AdminOverrideMode {
  return record?.sections[key]?.mode ?? "auto_source";
}

function resolveSectionManualValues(record: AdminManagedRecord | null, key: string) {
  return record?.sections[key]?.values ?? {};
}

function resolveImportStatus(
  sourcePresent: boolean,
  mode: AdminOverrideMode,
  lastSourceRefreshAt: string | null,
  lastManualEditAt: string | null,
) {
  if (!sourcePresent) {
    return "not_connected" as const;
  }

  if (mode === "manual_permanent_lock") {
    return "locked_manual_value" as const;
  }

  if (mode === "manual_until_next_refresh") {
    if (lastSourceRefreshAt && lastManualEditAt && new Date(lastSourceRefreshAt) > new Date(lastManualEditAt)) {
      return "import_conflict_needs_review" as const;
    }

    return "temporary_override_pending_expiry" as const;
  }

  if (mode === "manual_override") {
    if (lastSourceRefreshAt && lastManualEditAt && new Date(lastSourceRefreshAt) > new Date(lastManualEditAt)) {
      return "source_newer_than_manual" as const;
    }

    return "manual_overriding_source" as const;
  }

  return "source_current" as const;
}

function computeEffectiveValues(
  sourceValues: Record<string, string>,
  manualValues: Record<string, string>,
  mode: AdminOverrideMode,
  lastSourceRefreshAt: string | null,
  lastManualEditAt: string | null,
) {
  if (mode === "auto_source") {
    return { values: sourceValues, liveSource: "source" as const };
  }

  if (
    mode === "manual_until_next_refresh" &&
    lastSourceRefreshAt &&
    lastManualEditAt &&
    new Date(lastSourceRefreshAt) > new Date(lastManualEditAt)
  ) {
    return { values: sourceValues, liveSource: "source" as const };
  }

  return {
    values: Object.keys(sourceValues).length ? { ...sourceValues, ...manualValues } : manualValues,
    liveSource: "manual" as const,
  };
}

function buildSectionState({
  definition,
  sourceValues,
  record,
  sourcePresent,
  lastSourceRefreshAt,
  family,
}: {
  definition: AdminSectionDefinition;
  sourceValues: Record<string, string>;
  record: AdminManagedRecord | null;
  sourcePresent: boolean;
  lastSourceRefreshAt: string | null;
  family: AdminFamilyKey;
}) {
  const mode = resolveSectionMode(record, definition.key);
  const manualValues = resolveSectionManualValues(record, definition.key);
  const lastManualEditAt = record?.sections[definition.key]?.lastManualEditAt ?? null;
  const note = record?.sections[definition.key]?.note ?? "";
  const expiresAt = record?.sections[definition.key]?.expiresAt ?? null;
  const { values: effectiveValues, liveSource } = computeEffectiveValues(
    ensureValues(definition.fields, sourceValues),
    ensureValues(definition.fields, manualValues),
    mode,
    lastSourceRefreshAt,
    lastManualEditAt,
  );
  const conflictStatus = resolveImportStatus(sourcePresent, mode, lastSourceRefreshAt, lastManualEditAt);

  return {
    definition,
    fieldRegistry: buildFieldRegistry(family, [definition]),
    sourceValues: ensureValues(definition.fields, sourceValues),
    manualValues,
    effectiveValues,
    mode,
    lastSourceRefreshAt,
    lastManualEditAt,
    liveSource,
    conflictStatus,
    note,
    expiresAt,
  } satisfies AdminSectionState;
}

function hasActiveOverride(record: AdminManagedRecord | null) {
  if (!record) {
    return false;
  }

  return Object.values(record.sections).some((section) => section.mode !== "auto_source");
}

function getOverrideIndicator(record: AdminManagedRecord | null): AdminListRow["overrideIndicator"] {
  if (!record) {
    return "none";
  }

  const modes = Object.values(record.sections).map((section) => section.mode);

  if (modes.includes("manual_permanent_lock")) {
    return "locked";
  }

  if (modes.includes("manual_until_next_refresh")) {
    return "temporary";
  }

  if (modes.includes("manual_override")) {
    return "manual";
  }

  return "none";
}

function getSourceState(sourcePresent: boolean, record: AdminManagedRecord | null): AdminListRow["sourceState"] {
  if (!sourcePresent) {
    return "manual_only";
  }

  return hasActiveOverride(record) ? "mixed_override" : "source_backed";
}

function getRowImportStatus(sourcePresent: boolean, record: AdminManagedRecord | null, sourceFreshness: string | null) {
  if (!sourcePresent) {
    return "not_connected" as const;
  }

  if (!record) {
    return "source_current" as const;
  }

  const statuses = Object.entries(record.sections).map(([key, section]) =>
    resolveImportStatus(
      sourcePresent,
      section.mode,
      sourceFreshness,
      section.lastManualEditAt ?? record.updatedAt,
    ),
  );

  return (
    statuses.find((status) => status === "import_conflict_needs_review") ??
    statuses.find((status) => status === "locked_manual_value") ??
    statuses.find((status) => status === "temporary_override_pending_expiry") ??
    statuses.find((status) => status === "source_newer_than_manual") ??
    statuses.find((status) => status === "manual_overriding_source") ??
    "source_current"
  );
}

function defaultPublishState(sourcePresent: boolean, record: AdminManagedRecord | null): AdminPublishState {
  if (record?.status) {
    return record.status;
  }

  return sourcePresent ? "published" : "draft";
}

function normalizeAccessControl(
  value: Partial<AdminRecordAccessControl> | null | undefined,
): AdminRecordAccessControl {
  return {
    mode: value?.mode ?? "public_free",
    allowedMembershipTiers: Array.isArray(value?.allowedMembershipTiers)
      ? value.allowedMembershipTiers.filter(Boolean)
      : [],
    requireLogin: value?.requireLogin ?? false,
    showTeaserPublicly: value?.showTeaserPublicly ?? true,
    showLockedPreview: value?.showLockedPreview ?? false,
    ctaLabel: value?.ctaLabel ?? null,
    ctaHref: value?.ctaHref ?? null,
    internalNotes: value?.internalNotes ?? null,
  };
}

function parseLines(text: string | null | undefined) {
  return (text ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveCatalogAccessControl(
  accessLabel: string | null | undefined,
): AdminRecordAccessControl {
  const normalized = (accessLabel ?? "").trim().toLowerCase();

  if (!normalized) {
    return normalizeAccessControl(undefined);
  }

  if (normalized.includes("free with signup") || normalized.includes("registration")) {
    return normalizeAccessControl({
      mode: "coming_soon_registration_required",
      showTeaserPublicly: true,
      showLockedPreview: true,
      ctaLabel: "Register now",
    });
  }

  if (normalized.includes("bundle included")) {
    return normalizeAccessControl({
      mode: "membership_tiers",
      requireLogin: true,
      showTeaserPublicly: true,
      showLockedPreview: true,
      ctaLabel: "Unlock with membership",
    });
  }

  if (normalized.includes("premium") || normalized.includes("subscriber")) {
    return normalizeAccessControl({
      mode: "membership_tiers",
      requireLogin: true,
      showTeaserPublicly: true,
      showLockedPreview: true,
      ctaLabel: "Join membership",
    });
  }

  return normalizeAccessControl({
    mode: "public_free",
    requireLogin: normalized.includes("login"),
  });
}

function resolveSourceAccessControl(
  family: AdminFamilyKey,
  source:
    | StockSnapshot
    | FundSnapshot
    | IndexSnapshot
    | IpoSnapshot
    | WealthProduct
    | CourseItem
    | Webinar
    | LearnArticle
    | NewsletterTrack
    | null,
) {
  if (!source) {
    return normalizeAccessControl(undefined);
  }

  if (family === "courses") {
    return deriveCatalogAccessControl((source as CourseItem).access);
  }

  if (family === "webinars") {
    return deriveCatalogAccessControl((source as Webinar).access);
  }

  if (accessEligibleFamilies.has(family)) {
    return normalizeAccessControl(undefined);
  }

  return normalizeAccessControl(undefined);
}

function resolveRecordAccessControl(
  family: AdminFamilyKey,
  record: AdminManagedRecord | null,
  source:
    | StockSnapshot
    | FundSnapshot
    | IndexSnapshot
    | IpoSnapshot
    | WealthProduct
    | CourseItem
    | Webinar
    | LearnArticle
    | NewsletterTrack
    | null,
) {
  return normalizeAccessControl(record?.accessControl ?? resolveSourceAccessControl(family, source));
}

function getAccessModeLabel(access: AdminRecordAccessControl) {
  switch (access.mode) {
    case "logged_in_free_member":
      return "Free member";
    case "membership_tiers":
      return "Tiered";
    case "hidden_internal":
      return "Internal";
    case "coming_soon_registration_required":
      return "Coming soon";
    case "purchased_enrolled":
      return "Purchased";
    default:
      return "Public";
  }
}

function getAccessDetail(access: AdminRecordAccessControl) {
  if (access.mode === "membership_tiers") {
    return access.allowedMembershipTiers.length
      ? `Tiers: ${access.allowedMembershipTiers.join(", ")}`
      : "Tier assignment pending";
  }

  if (access.mode === "hidden_internal") {
    return "Hidden from public routes";
  }

  if (access.mode === "coming_soon_registration_required") {
    return access.ctaLabel || "Registration or waitlist CTA";
  }

  if (access.mode === "purchased_enrolled") {
    return "Purchased or enrolled access";
  }

  if (access.requireLogin) {
    return "Login required";
  }

  return null;
}

function buildAccessSection(
  access: AdminRecordAccessControl,
  tierOptions: Array<{ label: string; value: string }>,
) {
  return {
    definition: {
      key: "access_control",
      label: "Access",
      description:
        "Reusable access-control posture for this record, including login requirements, tier visibility, teaser behavior, and lock-state CTA handling.",
      fields: [
        {
          key: "accessMode",
          label: "Access mode",
          type: "select",
          options: adminAccessModeOptions,
        },
        {
          key: "allowedMembershipTiers",
          label: "Allowed membership tiers",
          type: "membership_tiers",
          options: tierOptions,
        },
        {
          key: "requireLogin",
          label: "Require login",
          type: "select",
          options: yesNoOptions,
        },
        {
          key: "showTeaserPublicly",
          label: "Show teaser publicly",
          type: "select",
          options: yesNoOptions,
        },
        {
          key: "showLockedPreview",
          label: "Show locked preview",
          type: "select",
          options: yesNoOptions,
        },
        {
          key: "ctaLabel",
          label: "Locked CTA label",
          type: "text",
          placeholder: "Unlock with membership",
        },
        {
          key: "ctaHref",
          label: "Locked CTA destination",
          type: "text",
          placeholder: "/pricing",
        },
        {
          key: "internalNotes",
          label: "Internal notes",
          type: "textarea",
          rows: 3,
          placeholder: "Operator-only context about teaser, locking, or enrollment posture.",
        },
      ],
    },
    values: {
      accessMode: access.mode,
      allowedMembershipTiers: access.allowedMembershipTiers.join(", "),
      requireLogin: access.requireLogin ? "yes" : "no",
      showTeaserPublicly: access.showTeaserPublicly ? "yes" : "no",
      showLockedPreview: access.showLockedPreview ? "yes" : "no",
      ctaLabel: access.ctaLabel ?? "",
      ctaHref: access.ctaHref ?? "",
      internalNotes: access.internalNotes ?? "",
    },
  } satisfies AdminSectionSeed;
}

function injectAccessSection(
  family: AdminFamilyKey,
  sections: AdminSectionSeed[],
  access: AdminRecordAccessControl,
  tierOptions: Array<{ label: string; value: string }>,
) {
  if (!accessEligibleFamilies.has(family)) {
    return sections;
  }

  const accessSection = buildAccessSection(access, tierOptions);
  const documentsIndex = sections.findIndex((section) => section.definition.key === "documents_links");

  if (documentsIndex === -1) {
    return [...sections, accessSection];
  }

  return [
    ...sections.slice(0, documentsIndex),
    accessSection,
    ...sections.slice(documentsIndex),
  ];
}

function buildSeoSection(input: {
  title: string;
  summary: string;
  canonicalUrl: string | null;
  ogImage: string | null;
  noIndex: boolean;
}) {
  return {
    definition: {
      key: "seo",
      label: "SEO and sharing",
      description:
        "Search, sharing, and canonical controls for this record. Defaults follow the master launch-config format and can be overwritten for this page at any time.",
      fields: [
        {
          key: "metaTitle",
          label: "Meta title",
          type: "text",
          placeholder: input.title,
        },
        {
          key: "metaDescription",
          label: "Meta description",
          type: "textarea",
          rows: 3,
          placeholder: input.summary,
        },
        {
          key: "ogImage",
          label: "OG image",
          type: "text",
          placeholder: "/media-library/default-og.jpg",
        },
        {
          key: "canonicalUrl",
          label: "Canonical URL",
          type: "text",
          placeholder: input.canonicalUrl ?? "",
        },
        {
          key: "noIndex",
          label: "Noindex",
          type: "select",
          options: yesNoOptions,
        },
      ],
    },
    values: {
      metaTitle: input.title,
      metaDescription: input.summary,
      ogImage: input.ogImage ?? "",
      canonicalUrl: input.canonicalUrl ?? "",
      noIndex: input.noIndex ? "yes" : "no",
    },
  } satisfies AdminSectionSeed;
}

function injectSeoSection(
  sections: AdminSectionSeed[],
  input: {
    title: string;
    summary: string;
    canonicalUrl: string | null;
    ogImage: string | null;
    noIndex: boolean;
  },
) {
  const seoSection = buildSeoSection(input);
  const documentsIndex = sections.findIndex((section) => section.definition.key === "documents_links");

  if (documentsIndex === -1) {
    return [...sections, seoSection];
  }

  return [
    ...sections.slice(0, documentsIndex),
    seoSection,
    ...sections.slice(documentsIndex),
  ];
}

async function getAssigneeOptionList() {
  const profiles = await listUserProductProfiles();
  return profiles
    .filter((profile) => profile.role === "admin" || profile.role === "editor")
    .map((profile) => ({
      label: `${profile.name} (${profile.email})`,
      value: profile.email,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function buildWorkflowSection(
  record: AdminManagedRecord | null,
  assigneeOptions: Array<{ label: string; value: string }>,
) {
  return {
    definition: {
      key: "workflow",
      label: "Workflow",
      description:
        "Content-manager workflow controls for status, assignment, and target due date. This is the main planning surface before publish controls.",
      fields: [
        {
          key: "publishState",
          label: "Content status",
          type: "select",
          options: adminPublishStateOptions,
        },
        {
          key: "assignedTo",
          label: "Assigned to",
          type: "text",
          options: assigneeOptions,
          placeholder: "editor@riddra.com",
        },
        {
          key: "assignedBy",
          label: "Assigned by",
          type: "text",
          placeholder: "Saved automatically from the current operator",
        },
        {
          key: "dueDate",
          label: "Due date",
          type: "text",
          placeholder: "2026-04-28T18:30:00Z",
        },
      ],
    },
    values: {
      publishState: record?.status ?? "draft",
      assignedTo: record?.assignedTo ?? "",
      assignedBy: record?.assignedBy ?? "",
      dueDate: record?.dueDate ?? "",
    },
  } satisfies AdminSectionSeed;
}

function injectWorkflowSection(
  sections: AdminSectionSeed[],
  record: AdminManagedRecord | null,
  assigneeOptions: Array<{ label: string; value: string }>,
) {
  return [buildWorkflowSection(record, assigneeOptions), ...sections];
}

function hasFilledValue(value: string | null | undefined) {
  return Boolean(String(value ?? "").trim());
}

function isRecentDate(value: string | null | undefined, days = 7) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

function buildRowCompleteness({
  family,
  title,
  slug,
  summary,
  publicHref,
  symbol,
  benchmarkMapping,
  record,
}: {
  family: AdminFamilyKey;
  title: string;
  slug: string;
  summary: string;
  publicHref: string | null;
  symbol: string | null;
  benchmarkMapping: string | null;
  record: AdminManagedRecord | null;
}) {
  const workflowStatus = record?.status ?? (publicHref ? "published" : "draft");
  const workflowTrackingActive = workflowStatus !== "published" && workflowStatus !== "archived";
  const checklist = [
    { label: "Title", priority: "critical" as const, value: title },
    { label: "Slug", priority: "critical" as const, value: slug },
    { label: "Status", priority: "critical" as const, value: workflowStatus },
    { label: "Summary", priority: "important" as const, value: summary },
    { label: "Public route", priority: "important" as const, value: publicHref ?? "" },
  ];

  if (workflowTrackingActive) {
    checklist.push({
      label: "Assigned to",
      priority: "important" as const,
      value: record?.assignedTo ?? "",
    });
    checklist.push({
      label: "Due date",
      priority: "important" as const,
      value: record?.dueDate ?? "",
    });
  }

  if (["stocks", "mutual-funds", "indices", "etfs", "ipos", "pms", "aif", "sif"].includes(family)) {
    checklist.push({
      label: "Benchmark mapping",
      priority: "important" as const,
      value: benchmarkMapping ?? "",
    });
  }

  if (["stocks", "mutual-funds", "etfs", "ipos"].includes(family)) {
    checklist.push({
      label: "Symbol",
      priority: "important" as const,
      value: symbol ?? "",
    });
  }

  const completedFields = checklist.filter((item) => hasFilledValue(item.value)).length;
  const missingCriticalFields = checklist
    .filter((item) => item.priority === "critical" && !hasFilledValue(item.value))
    .map((item) => item.label);
  const missingImportantFields = checklist
    .filter((item) => item.priority === "important" && !hasFilledValue(item.value))
    .map((item) => item.label);

  return {
    completedFields,
    totalTrackedFields: checklist.length,
    completenessPercent: checklist.length ? Math.round((completedFields / checklist.length) * 100) : 100,
    missingCriticalFields,
    missingImportantFields,
  };
}

function buildDependencyWarnings({
  family,
  sourcePresent,
  benchmarkMapping,
  sourceLabel,
}: {
  family: AdminFamilyKey;
  sourcePresent: boolean;
  benchmarkMapping: string | null;
  sourceLabel: string;
}) {
  const warnings: string[] = [];

  if (family === "stocks" && !benchmarkMapping) {
    warnings.push("Missing sector mapping");
  }

  if (["mutual-funds", "etfs", "ipos", "pms", "aif", "sif"].includes(family) && !benchmarkMapping) {
    warnings.push("Missing benchmark");
  }

  if (
    ["stocks", "mutual-funds", "indices", "etfs", "ipos", "pms", "aif", "sif"].includes(family) &&
    (!sourcePresent || !sourceLabel.trim())
  ) {
    warnings.push("Missing source");
  }

  return warnings;
}

function getFreshnessScore(
  sourcePresent: boolean,
  refreshHealth: AdminListRow["refreshHealth"],
  record: AdminManagedRecord | null,
) {
  if (!sourcePresent) {
    return 80;
  }

  if (record?.sourceState?.freshnessState === "fresh" || refreshHealth === "healthy") {
    return 100;
  }

  if (record?.sourceState?.freshnessState === "stale" || refreshHealth === "warning") {
    return 62;
  }

  if (record?.sourceState?.freshnessState === "overdue" || refreshHealth === "failed") {
    return 35;
  }

  if (refreshHealth === "running") {
    return 75;
  }

  return 70;
}

function getSourceCoverageScore(sourcePresent: boolean, dependencyWarnings: string[]) {
  let score = sourcePresent ? 100 : 80;
  for (const warning of dependencyWarnings) {
    if (warning === "Missing source") {
      score -= 45;
    } else if (warning === "Missing benchmark" || warning === "Missing sector mapping") {
      score -= 20;
    }
  }

  return Math.max(20, score);
}

function buildContentHealth(input: {
  completenessPercent: number;
  sourcePresent: boolean;
  refreshHealth: AdminListRow["refreshHealth"];
  record: AdminManagedRecord | null;
  dependencyWarnings: string[];
}) {
  const freshnessScore = getFreshnessScore(input.sourcePresent, input.refreshHealth, input.record);
  const sourceCoverageScore = getSourceCoverageScore(
    input.sourcePresent,
    input.dependencyWarnings,
  );
  const score = Math.round(
    input.completenessPercent * 0.5 + freshnessScore * 0.25 + sourceCoverageScore * 0.25,
  );

  return {
    score,
    freshnessScore,
    sourceCoverageScore,
  };
}

function createListRow({
  family,
  slug,
  title,
  symbol,
  summary,
  publicHref,
  sourceLabel,
  sourceFreshness,
  record,
  sourcePresent,
  accessControl,
  benchmarkMapping,
}: {
  family: AdminFamilyKey;
  slug: string;
  title: string;
  symbol: string | null;
  summary: string;
  publicHref: string | null;
  sourceLabel: string;
  sourceFreshness: string | null;
  record: AdminManagedRecord | null;
  sourcePresent: boolean;
  accessControl: AdminRecordAccessControl;
  benchmarkMapping?: string | null;
}) {
  const meta = adminFamilyMeta[family];
  const publishState = defaultPublishState(sourcePresent, record);
  const sourceState = getSourceState(sourcePresent, record);
  const overrideIndicator = getOverrideIndicator(record);
  const importStatus = getRowImportStatus(sourcePresent, record, sourceFreshness);
  const lastUpdated = record?.updatedAt ?? sourceFreshness ?? "Awaiting first operator save";
  const truthLabel =
    sourceState === "manual_only"
      ? "Manual draft"
      : sourceState === "mixed_override"
        ? "Source plus manual override"
        : "Source-backed";
  const refreshHealth = record?.refreshState
    ? record.refreshState.refreshEnabled
      ? record.refreshState.latestStatus
      : "paused"
    : sourcePresent
      ? sourceFreshness
        ? "healthy"
        : "planned"
      : "not_applicable";
  const accessLabel = getAccessModeLabel(accessControl);
  const accessDetail = getAccessDetail(accessControl);
  const completeness = buildRowCompleteness({
    family,
    title,
    slug,
    summary,
    publicHref,
    symbol,
    benchmarkMapping: benchmarkMapping ?? record?.benchmarkMapping ?? null,
    record,
  });
  const dependencyWarnings = buildDependencyWarnings({
    family,
    sourcePresent,
    benchmarkMapping: benchmarkMapping ?? record?.benchmarkMapping ?? null,
    sourceLabel,
  });
  const health = buildContentHealth({
    completenessPercent: completeness.completenessPercent,
    sourcePresent,
    refreshHealth,
    record,
    dependencyWarnings,
  });
  const needsReview =
    publishState === "ready_for_review" ||
    publishState === "needs_fix" ||
    importStatus === "import_conflict_needs_review";
  const isStale =
    record?.sourceState?.freshnessState === "stale" ||
    record?.sourceState?.freshnessState === "overdue" ||
    refreshHealth === "warning" ||
    refreshHealth === "failed";

  return {
    family,
    familyLabel: meta.label,
    slug,
    title,
    symbol,
    summary,
    publicHref,
    publishState,
    sourceState,
    overrideIndicator,
    importStatus,
    sourceFreshness,
    sourceLabel,
    refreshHealth,
    nextRefreshAt: record?.refreshState?.nextScheduledRunAt ?? null,
    lastUpdated,
    truthLabel,
    accessMode: accessControl.mode,
    accessLabel,
    accessDetail,
    allowedMembershipTiers: accessControl.allowedMembershipTiers,
    requireLogin: accessControl.requireLogin,
    assignedTo: record?.assignedTo ?? null,
    assignedBy: record?.assignedBy ?? null,
    dueDate: record?.dueDate ?? null,
    contentHealthScore: health.score,
    freshnessScore: health.freshnessScore,
    sourceCoverageScore: health.sourceCoverageScore,
    dependencyWarnings,
    completenessPercent: completeness.completenessPercent,
    completedFields: completeness.completedFields,
    totalTrackedFields: completeness.totalTrackedFields,
    missingCriticalCount: completeness.missingCriticalFields.length,
    missingImportantCount: completeness.missingImportantFields.length,
    missingCriticalFields: completeness.missingCriticalFields,
    missingImportantFields: completeness.missingImportantFields,
    needsReview,
    isStale,
    recentlyEdited: isRecentDate(record?.updatedAt ?? null),
    searchText: [
      title,
      slug,
      symbol,
      summary,
      sourceLabel,
      accessLabel,
      accessControl.allowedMembershipTiers.join(" "),
      record?.assignedTo,
      record?.assignedBy,
      record?.dueDate,
      dependencyWarnings.join(" "),
      completeness.missingCriticalFields.join(" "),
      completeness.missingImportantFields.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  } satisfies AdminListRow;
}

function buildSourceDateFromStock(stock: StockSnapshot) {
  return (
    stock.snapshotMeta?.lastUpdated ??
    stock.fundamentalsMeta?.sourceDate ??
    stock.shareholdingMeta?.sourceDate ??
    ""
  );
}

function buildSourceDateFromFund(fund: FundSnapshot) {
  return (
    fund.snapshotMeta?.lastUpdated ??
    fund.factsheetMeta?.sourceDate ??
    fund.holdingsMeta?.sourceDate ??
    fund.allocationMeta?.sourceDate ??
    ""
  );
}

function deriveEditorFreshness(sourceDate: string) {
  if (!sourceDate) {
    return "unknown" as const;
  }

  const parsed = new Date(sourceDate).getTime();
  if (Number.isNaN(parsed)) {
    return "unknown" as const;
  }

  const ageInDays = Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
  if (ageInDays <= 7) {
    return "fresh" as const;
  }

  if (ageInDays <= 31) {
    return "stale" as const;
  }

  return "overdue" as const;
}

function buildStockSections(stock: StockSnapshot | null) {
  const identity: AdminSectionDefinition = {
    key: "identity",
    label: "Identity",
    description:
      "Canonical company identity, sector, the single chart comparison index, and index-membership routing fields.",
    fields: [
      { key: "companyName", label: "Company name", type: "text", placeholder: "Tata Motors" },
      { key: "slug", label: "Slug", type: "text", placeholder: "tata-motors" },
      { key: "symbol", label: "Symbol", type: "text", placeholder: "TATAMOTORS" },
      { key: "sector", label: "Sector", type: "text", placeholder: "Automobiles" },
      {
        key: "sectorIndexSlug",
        label: "Sector comparison index",
        type: "select",
        options: stockSectorIndexOptions,
      },
      {
        key: "indexMemberships",
        label: "Index memberships",
        type: "checklist",
        options: stockIndexMembershipOptions,
      },
    ],
  };
  const publishing: AdminSectionDefinition = {
    key: "publishing",
    label: "Publishing",
    description: "Public route, publish posture, and operator-controlled page readiness fields.",
    fields: [
      publishStateField,
      publicRouteField,
      scheduledPublishField,
      scheduledUnpublishField,
      truthStateField,
      { key: "latestNewsReady", label: "Latest news ready", type: "select", options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
      { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Why this route is or is not ready for public visibility." },
    ],
  };
  const dataSources: AdminSectionDefinition = {
    key: "data_sources",
    label: "Data sources",
    description: "Source labels, dates, URLs, and imported source posture for this stock route.",
    fields: [
      { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "nse_equities" },
      sourceStateField,
      sourceUpdatedField,
      { key: "snapshotSource", label: "Snapshot source", type: "text", placeholder: "Delayed snapshot source" },
      { key: "snapshotDate", label: "Snapshot date", type: "text", placeholder: "2026-04-20" },
      { key: "fundamentalsSource", label: "Fundamentals source label", type: "text", placeholder: "Company filings" },
      { key: "fundamentalsDate", label: "Fundamentals source date", type: "text", placeholder: "2026-03-31" },
      { key: "shareholdingSource", label: "Shareholding source label", type: "text", placeholder: "Quarterly shareholding" },
      { key: "shareholdingDate", label: "Shareholding source date", type: "text", placeholder: "2025-12-31" },
      { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
    ],
  };
  const frontend: AdminSectionDefinition = {
    key: "frontend_fields",
    label: "Frontend fields",
    description: "Summary, editorial support, quick stats, fundamentals, ownership, peers, FAQs, and news configuration shown on the frontend.",
    fields: [
      {
        key: "summary",
        label: "Summary",
        type: "textarea",
        rows: 3,
        placeholder:
          "Honeywell Automation India Ltd builds industrial automation, controls, and software systems for factories, process plants, and smart buildings. Use 2 to 3 lines that explain what the company does and why it matters now.",
      },
      {
        key: "thesis",
        label: "Editorial thesis",
        type: "textarea",
        rows: 4,
        placeholder:
          "Use this block for the front-page investment read: demand outlook, margin quality, order book, valuation posture, and the next trigger the reader should track.",
      },
      { key: "momentumLabel", label: "Headline label", type: "text", placeholder: "Industrial automation leader" },
      {
        key: "keyPointsText",
        label: "Key points",
        type: "textarea",
        rows: 4,
        placeholder:
          "Premium industrial automation franchise with high switching costs\nStrong parentage and balance-sheet quality\nWatch valuation comfort and order inflow cadence",
      },
      {
        key: "quickStatsText",
        label: "Quick stats",
        type: "textarea",
        rows: 5,
        placeholder:
          "1Y Return | +18.4%\n52W High | ₹48,720\n52W Low | ₹31,180\nMarket Cap | ₹43,520 Cr",
      },
      {
        key: "fundamentalsText",
        label: "Fundamentals",
        type: "textarea",
        rows: 6,
        placeholder:
          "Revenue | ₹4,812 Cr | Latest full year\nEBIT Margin | 18.6% | Use the latest reported number\nROCE | 27.4% | High-quality capital efficiency\nDividend Yield | 0.9% | Optional note if relevant",
      },
      {
        key: "shareholdingText",
        label: "Shareholding",
        type: "textarea",
        rows: 6,
        placeholder:
          "Promoters | 75.0% | Latest quarter\nFIIs | 6.8% | Use the reported quarter\nDIIs | 9.1% | Add note only when needed\nPublic | 9.1% | Optional if shown on page",
      },
      { key: "peerConfigText", label: "Peer / related route configuration", type: "textarea", rows: 4, placeholder: "Label | /stocks/peer-slug | Why it belongs here" },
      {
        key: "newsReadinessNote",
        label: "Latest news readiness / config",
        type: "textarea",
        rows: 4,
        placeholder:
          "Explain whether latest news should pull live items, stay hidden, or use a manual fallback when the source feed is thin.",
      },
      { key: "newsItemsText", label: "News items", type: "textarea", rows: 5, placeholder: "Title | Source | Type" },
      { key: "faqText", label: "FAQ items", type: "textarea", rows: 5, placeholder: "Question | Answer" },
      {
        key: "manualNotes",
        label: "Public editorial note",
        type: "textarea",
        rows: 4,
        placeholder:
          "Use this for support-style or editor guidance that appears on the page, such as how to read the chart, what the FAQ should cover, or whether a block is intentionally temporary.",
      },
    ],
  };
  const documents: AdminSectionDefinition = {
    key: "documents_links",
    label: "Documents / links",
    description: "Document links, filing links, source URLs, and traceable document references.",
    fields: [
      documentsTextField,
      { key: "fundamentalsSourceUrl", label: "Fundamentals source URL", type: "text", placeholder: "https://..." },
      { key: "shareholdingSourceUrl", label: "Shareholding source URL", type: "text", placeholder: "https://..." },
    ],
  };

  return [
    {
      definition: identity,
      values: {
        companyName: stock?.name,
        slug: stock?.slug,
        symbol: stock?.symbol,
        sector: stock?.sector,
        sectorIndexSlug: stock?.sectorIndexSlug ?? "",
        indexMemberships: "",
      },
    },
    {
      definition: publishing,
      values: {
        publishState: stock ? "published" : "draft",
        publicRoute: stock ? `/stocks/${stock.slug}` : "",
        truthLabel: stock ? "Source-backed stock route" : "Manual stock draft",
        latestNewsReady: stock?.newsItems?.length ? "yes" : "no",
        publishNote: stock ? "This stock route is already part of the public product surface." : "",
      },
    },
    {
      definition: dataSources,
      values: {
        primarySourceCode: stock?.primarySourceCode ?? "",
        sourceState: stock ? "source_backed" : "not_connected",
        sourceUpdatedAt: stock ? buildSourceDateFromStock(stock) : "",
        snapshotSource: stock?.snapshotMeta?.source ?? "",
        snapshotDate: stock?.snapshotMeta?.lastUpdated ?? "",
        fundamentalsSource: stock?.fundamentalsMeta?.source ?? "",
        fundamentalsDate: stock?.fundamentalsMeta?.sourceDate ?? "",
        shareholdingSource: stock?.shareholdingMeta?.source ?? "",
        shareholdingDate: stock?.shareholdingMeta?.sourceDate ?? "",
        sourceUrl: stock?.fundamentalsMeta?.sourceUrl ?? stock?.shareholdingMeta?.sourceUrl ?? "",
      },
    },
    {
      definition: frontend,
      values: {
        summary: stock?.summary ?? "",
        thesis: stock?.thesis ?? "",
        momentumLabel: stock?.momentumLabel ?? "",
        keyPointsText: lines(stock?.keyPoints ?? []),
        quickStatsText: keyValueText(stock?.stats ?? []),
        fundamentalsText: labelValueNoteText(stock?.fundamentals ?? []),
        shareholdingText: labelValueNoteText(stock?.shareholding ?? []),
        peerConfigText: "",
        newsReadinessNote: stock?.newsItems?.length
          ? "Latest news rows are available on the source-backed stock route."
          : "Latest news rows still need support for this stock.",
        newsItemsText: stockNewsText(stock?.newsItems ?? []),
        faqText: faqText(stock?.faqItems ?? []),
        manualNotes: "",
      },
    },
    {
      definition: documents,
      values: {
        documentLinksText: "",
        fundamentalsSourceUrl: stock?.fundamentalsMeta?.sourceUrl ?? "",
        shareholdingSourceUrl: stock?.shareholdingMeta?.sourceUrl ?? "",
      },
    },
  ];
}

function buildFundSections(fund: FundSnapshot | null) {
  const sections = [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: "Canonical fund identity, category, benchmark, and route mapping fields.",
        fields: [
          { key: "fundName", label: "Fund name", type: "text", placeholder: "HDFC Mid-Cap Opportunities Fund" },
          { key: "slug", label: "Slug", type: "text", placeholder: "hdfc-mid-cap-opportunities" },
          { key: "category", label: "Category", type: "text", placeholder: "Mid Cap Fund" },
          { key: "benchmarkLabel", label: "Benchmark label", type: "text", placeholder: "Nifty 50" },
          { key: "benchmarkIndexSlug", label: "Benchmark mapping", type: "text", placeholder: "nifty50" },
        ],
      },
      values: {
        fundName: fund?.name ?? "",
        slug: fund?.slug ?? "",
        category: fund?.category ?? "",
        benchmarkLabel: fund?.benchmark ?? "",
        benchmarkIndexSlug: fund?.benchmarkIndexSlug ?? "",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route, publish posture, and operator review fields for the fund page.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Notes for review or publication." },
        ],
      },
      values: {
        publishState: fund ? "published" : "draft",
        publicRoute: fund ? `/mutual-funds/${fund.slug}` : "",
        truthLabel: fund ? "Source-backed fund route" : "Manual fund draft",
        publishNote: fund ? "This fund route is already present in the public product." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "Factsheet, holdings, allocation, benchmark mapping, and source-date fields.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "amfi" },
          sourceStateField,
          sourceUpdatedField,
          { key: "snapshotSource", label: "NAV snapshot source", type: "text", placeholder: "AMFI delayed NAV" },
          { key: "snapshotDate", label: "NAV source date", type: "text", placeholder: "2026-04-20" },
          { key: "factsheetSource", label: "Factsheet source label", type: "text", placeholder: "AMC factsheet" },
          { key: "factsheetDate", label: "Factsheet source date", type: "text", placeholder: "2026-03-31" },
          { key: "holdingsSource", label: "Holdings source label", type: "text", placeholder: "Monthly holdings" },
          { key: "holdingsDate", label: "Holdings source date", type: "text", placeholder: "2026-03-31" },
          { key: "allocationSource", label: "Sector allocation source", type: "text", placeholder: "Monthly allocation" },
          { key: "allocationDate", label: "Sector allocation source date", type: "text", placeholder: "2026-03-31" },
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: fund?.primarySourceCode ?? "",
        sourceState: fund ? "source_backed" : "not_connected",
        sourceUpdatedAt: fund ? buildSourceDateFromFund(fund) : "",
        snapshotSource: fund?.snapshotMeta?.source ?? "",
        snapshotDate: fund?.snapshotMeta?.lastUpdated ?? "",
        factsheetSource: fund?.factsheetMeta?.source ?? "",
        factsheetDate: fund?.factsheetMeta?.sourceDate ?? "",
        holdingsSource: fund?.holdingsMeta?.source ?? "",
        holdingsDate: fund?.holdingsMeta?.sourceDate ?? "",
        allocationSource: fund?.allocationMeta?.source ?? "",
        allocationDate: fund?.allocationMeta?.sourceDate ?? "",
        sourceUrl:
          fund?.factsheetMeta?.referenceUrl ??
          fund?.holdingsMeta?.referenceUrl ??
          fund?.allocationMeta?.referenceUrl ??
          "",
      },
    },
    {
      definition: {
        key: "frontend_fields",
        label: "Frontend fields",
        description: "Summary, angle, return rows, manager data, holdings, allocation, FAQ, and operator-controlled support fields.",
        fields: [
          { key: "summary", label: "Summary", type: "textarea", rows: 3, placeholder: "Public fund summary" },
          { key: "angle", label: "Editorial angle", type: "textarea", rows: 3, placeholder: "Why this fund exists on the product." },
          { key: "riskLabel", label: "Risk label", type: "text", placeholder: "Moderate to high" },
          { key: "aum", label: "AUM", type: "text", placeholder: "₹..." },
          { key: "expenseRatio", label: "Expense ratio", type: "text", placeholder: "0.75%" },
          { key: "returnsTableText", label: "Return ladder", type: "textarea", rows: 5, placeholder: "Window | Return" },
          { key: "keyPointsText", label: "Key points", type: "textarea", rows: 4, placeholder: "One key point per line" },
          { key: "holdingsText", label: "Holdings", type: "textarea", rows: 6, placeholder: "Holding | Sector | Weight" },
          { key: "sectorAllocationText", label: "Sector allocation", type: "textarea", rows: 5, placeholder: "Sector | Weight" },
          { key: "fundManagerName", label: "Fund manager", type: "text", placeholder: "Manager name" },
          { key: "fundManagerSince", label: "Manager since", type: "text", placeholder: "2020" },
          { key: "fundManagerExperience", label: "Manager experience", type: "text", placeholder: "12 years" },
          { key: "fundManagerStyle", label: "Manager style", type: "text", placeholder: "Growth with quality" },
          { key: "manualNotes", label: "Public editorial note", type: "textarea", rows: 4, placeholder: "Operator-controlled public note." },
        ],
      },
      values: {
        summary: fund?.summary ?? "",
        angle: fund?.angle ?? "",
        riskLabel: fund?.riskLabel ?? "",
        aum: fund?.aum ?? "",
        expenseRatio: fund?.expenseRatio ?? "",
        returnsTableText: keyValueText(fund?.returnsTable ?? []),
        keyPointsText: lines(fund?.keyPoints ?? []),
        holdingsText: fundHoldingsText(fund?.holdings ?? []),
        sectorAllocationText: allocationText(fund?.sectorAllocation ?? []),
        fundManagerName: fund?.fundManager.name ?? "",
        fundManagerSince: fund?.fundManager.since ?? "",
        fundManagerExperience: fund?.fundManager.experience ?? "",
        fundManagerStyle: fund?.fundManager.style ?? "",
        manualNotes: "",
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Factsheet and supporting document links plus operator-managed source URLs.",
        fields: [
          documentsTextField,
          { key: "factsheetUrl", label: "Factsheet URL", type: "text", placeholder: "https://..." },
          { key: "holdingsReferenceUrl", label: "Holdings reference URL", type: "text", placeholder: "https://..." },
          { key: "allocationReferenceUrl", label: "Allocation reference URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        documentLinksText: "",
        factsheetUrl: fund?.factsheetMeta?.referenceUrl ?? "",
        holdingsReferenceUrl: fund?.holdingsMeta?.referenceUrl ?? "",
        allocationReferenceUrl: fund?.allocationMeta?.referenceUrl ?? "",
      },
    },
  ];

  return sections;
}

function buildIndexSections(index: IndexSnapshot | null) {
  return [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: "Tracked index identity, short name, and route mapping fields.",
        fields: [
          { key: "title", label: "Index name", type: "text", placeholder: "Nifty 50" },
          { key: "slug", label: "Slug", type: "text", placeholder: "nifty50" },
          { key: "shortName", label: "Short name", type: "text", placeholder: "Nifty50" },
          { key: "sourceCode", label: "Source code", type: "text", placeholder: "nse_index" },
        ],
      },
      values: {
        title: index?.title ?? "",
        slug: index?.slug ?? "",
        shortName: index?.shortName ?? "",
        sourceCode: index?.sourceCode ?? "",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route and operator-controlled route posture for the index page.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Review note" },
        ],
      },
      values: {
        publishState: index ? "published" : "draft",
        publicRoute: index ? `/${index.slug}` : "",
        truthLabel: index ? "Source-backed index route" : "Manual index draft",
        publishNote: index ? "This tracked index route is already present in the public product." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "Last source refresh, composition source, and tracked route support fields.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "nse_index" },
          sourceStateField,
          sourceUpdatedField,
          { key: "compositionSource", label: "Composition source label", type: "text", placeholder: "Official factsheet" },
          { key: "compositionDate", label: "Composition source date", type: "text", placeholder: "2026-03-31" },
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: index?.sourceCode ?? "",
        sourceState: index ? "source_backed" : "not_connected",
        sourceUpdatedAt: index?.lastUpdated ?? "",
        compositionSource: index?.compositionMeta?.sourceLabel ?? "",
        compositionDate: index?.compositionMeta?.sourceDate ?? "",
        sourceUrl: index?.compositionMeta?.referenceUrl ?? "",
      },
    },
    {
      definition: {
        key: "frontend_fields",
        label: "Frontend fields",
        description: "Narrative, official sync note, breadth labels, and operator-facing public support copy.",
        fields: [
          { key: "narrative", label: "Narrative", type: "textarea", rows: 4, placeholder: "Public index narrative" },
          { key: "breadthLabel", label: "Breadth label", type: "text", placeholder: "Broad-based strength" },
          { key: "marketMood", label: "Market mood", type: "text", placeholder: "Bullish" },
          { key: "dominanceLabel", label: "Dominance label", type: "text", placeholder: "Leaders are in control" },
          { key: "trendLabel", label: "Trend label", type: "text", placeholder: "Improving through the session" },
          { key: "officialSyncNote", label: "Official sync note", type: "textarea", rows: 4, placeholder: "Official sync note" },
          { key: "manualNotes", label: "Public editorial note", type: "textarea", rows: 4, placeholder: "Operator-controlled note" },
        ],
      },
      values: {
        narrative: index?.narrative ?? "",
        breadthLabel: index?.breadthLabel ?? "",
        marketMood: index?.marketMood ?? "",
        dominanceLabel: index?.dominanceLabel ?? "",
        trendLabel: index?.trendLabel ?? "",
        officialSyncNote: index?.officialSyncNote ?? "",
        manualNotes: "",
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Source URLs and operator-managed document links for the tracked index route.",
        fields: [documentsTextField],
      },
      values: {
        documentLinksText: "",
      },
    },
  ];
}

function buildWealthSections(product: WealthProduct | null, familyLabel: string, routeBase: string) {
  return [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: `${familyLabel} identity, benchmark, strategy label, and route mapping fields.`,
        fields: [
          { key: "name", label: "Name", type: "text", placeholder: familyLabel },
          { key: "slug", label: "Slug", type: "text", placeholder: "product-slug" },
          { key: "category", label: "Category", type: "text", placeholder: "Category" },
          { key: "benchmark", label: "Benchmark", type: "text", placeholder: "Benchmark" },
          { key: "structure", label: "Structure", type: "text", placeholder: "Structure" },
        ],
      },
      values: {
        name: product?.name ?? "",
        slug: product?.slug ?? "",
        category: product?.category ?? "",
        benchmark: product?.benchmark ?? "",
        structure: product?.structure ?? "",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route and publishing posture for this wealth product page.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Review note" },
        ],
      },
      values: {
        publishState: product ? "published" : "draft",
        publicRoute: product ? `${routeBase}/${product.slug}` : "",
        truthLabel: product ? "Source-backed wealth route" : "Manual wealth draft",
        publishNote: product ? "This wealth route is already part of the public product family." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "Product source posture, route state, and operator-managed source references.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "wealth_products" },
          sourceStateField,
          sourceUpdatedField,
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: product ? "wealth_products" : "",
        sourceState: product ? "source_backed" : "not_connected",
        sourceUpdatedAt: "",
        sourceUrl: "",
      },
    },
    {
      definition: {
        key: "frontend_fields",
        label: "Frontend fields",
        description: "Summary, thesis, fit, avoid, diligence, role, and compare lanes shown on the frontend.",
        fields: [
          { key: "summary", label: "Summary", type: "textarea", rows: 3, placeholder: "Public summary" },
          { key: "angle", label: "Angle", type: "textarea", rows: 3, placeholder: "Public angle" },
          { key: "thesis", label: "Thesis", type: "textarea", rows: 4, placeholder: "Editorial thesis" },
          { key: "manager", label: "Manager", type: "text", placeholder: "Manager" },
          { key: "minimumTicket", label: "Minimum ticket", type: "text", placeholder: "₹..." },
          { key: "riskLabel", label: "Risk label", type: "text", placeholder: "Moderate" },
          { key: "liquidity", label: "Liquidity note", type: "textarea", rows: 3, placeholder: "Liquidity note" },
          { key: "taxation", label: "Taxation note", type: "textarea", rows: 3, placeholder: "Taxation note" },
          { key: "costNote", label: "Cost note", type: "textarea", rows: 3, placeholder: "Cost note" },
          { key: "keyPointsText", label: "Key points", type: "textarea", rows: 4, placeholder: "One key point per line" },
          { key: "researchStatsText", label: "Research stats", type: "textarea", rows: 5, placeholder: "Label | Value" },
          { key: "portfolioRoleText", label: "Portfolio role", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "fitForText", label: "Fit for", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "avoidIfText", label: "Avoid if", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "dueDiligenceText", label: "Due diligence", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "compareLanesText", label: "Compare lanes", type: "textarea", rows: 4, placeholder: "One point per line" },
        ],
      },
      values: {
        summary: product?.summary ?? "",
        angle: product?.angle ?? "",
        thesis: product?.thesis ?? "",
        manager: product?.manager ?? "",
        minimumTicket: product?.minimumTicket ?? "",
        riskLabel: product?.riskLabel ?? "",
        liquidity: product?.liquidity ?? "",
        taxation: product?.taxation ?? "",
        costNote: product?.costNote ?? "",
        keyPointsText: lines(product?.keyPoints ?? []),
        researchStatsText: keyValueText(product?.researchStats ?? []),
        portfolioRoleText: lines(product?.portfolioRole ?? []),
        fitForText: lines(product?.fitFor ?? []),
        avoidIfText: lines(product?.avoidIf ?? []),
        dueDiligenceText: lines(product?.dueDiligence ?? []),
        compareLanesText: lines(product?.compareLanes ?? []),
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Supporting documents and operator-managed route links for this wealth product.",
        fields: [documentsTextField],
      },
      values: {
        documentLinksText: "",
      },
    },
  ];
}

function buildIpoSections(ipo: IpoSnapshot | null) {
  return [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: "IPO identity, issue status, and route-mapping fields.",
        fields: [
          { key: "companyName", label: "Company name", type: "text", placeholder: "IPO company" },
          { key: "slug", label: "Slug", type: "text", placeholder: "ipo-slug" },
          { key: "status", label: "Issue status", type: "text", placeholder: "Open" },
          { key: "ipoType", label: "IPO type", type: "text", placeholder: "Mainboard / SME" },
          { key: "priceBand", label: "Price band", type: "text", placeholder: "₹..." },
        ],
      },
      values: {
        companyName: ipo?.name ?? "",
        slug: ipo?.slug ?? "",
        status: ipo?.status ?? "",
        ipoType: ipo?.ipoType ?? "",
        priceBand: ipo?.priceBand ?? "",
      },
    },
    {
      definition: {
        key: "lifecycle",
        label: "Listing transition",
        description: "Use the IPO listing date to trigger an automatic handoff into the stock route family and activate the permanent redirect.",
        fields: [
          {
            key: "listingDate",
            label: "Listing date",
            type: "text",
            placeholder: "2026-05-15 or May 15, 2026",
          },
          {
            key: "targetStockSlug",
            label: "Target stock slug",
            type: "text",
            placeholder: "company-stock-slug",
          },
          {
            key: "targetStockName",
            label: "Target stock name",
            type: "text",
            placeholder: "Company name without IPO suffix",
          },
          {
            key: "autoConvertOnListingDate",
            label: "Auto-convert on listing date",
            type: "select",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
          },
          {
            key: "redirectActive",
            label: "Redirect active",
            type: "select",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            readOnly: true,
            warningText:
              "This turns on automatically after the lifecycle cron job completes the listing cutover.",
          },
          {
            key: "redirectPath",
            label: "Redirect path",
            type: "text",
            placeholder: "/stocks/company-slug",
            readOnly: true,
          },
          {
            key: "cutoverCompletedAt",
            label: "Cutover completed at",
            type: "text",
            placeholder: "2026-05-15T06:30:00+05:30",
            readOnly: true,
          },
          {
            key: "cutoverStatus",
            label: "Cutover status",
            type: "text",
            placeholder: "Waiting for listing date",
            readOnly: true,
          },
        ],
      },
      values: {
        listingDate: ipo?.listingDate ?? "",
        targetStockSlug: ipo?.slug?.replace(/-ipo$/i, "") ?? "",
        targetStockName: ipo?.name?.replace(/\s+IPO$/i, "") ?? "",
        autoConvertOnListingDate: "yes",
        redirectActive: "no",
        redirectPath: "",
        cutoverCompletedAt: "",
        cutoverStatus: "Waiting for listing date",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route, lifecycle posture, and operator review state.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Review note" },
        ],
      },
      values: {
        publishState: ipo ? "published" : "draft",
        publicRoute: ipo ? `/ipo/${ipo.slug}` : "",
        truthLabel: ipo ? "Source-backed IPO route" : "Manual IPO draft",
        publishNote: ipo ? "This IPO route is already part of the public lifecycle surface." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "IPO source posture, document source label, and lifecycle source references.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "ipo_source" },
          sourceStateField,
          sourceUpdatedField,
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: ipo?.primarySourceCode ?? "",
        sourceState: ipo ? "source_backed" : "not_connected",
        sourceUpdatedAt: ipo?.listingDate ?? "",
        sourceUrl: "",
      },
    },
    {
      definition: {
        key: "frontend_fields",
        label: "Frontend fields",
        description: "Summary, issue details, strengths, risks, objectives, subscription watch, listing watch, and FAQs.",
        fields: [
          { key: "summary", label: "Summary", type: "textarea", rows: 3, placeholder: "Public IPO summary" },
          { key: "angle", label: "Angle", type: "textarea", rows: 3, placeholder: "IPO angle" },
          { key: "issueBreakupText", label: "Issue breakup", type: "textarea", rows: 5, placeholder: "Label | Value" },
          { key: "companyDetailsText", label: "Company details", type: "textarea", rows: 5, placeholder: "Label | Value" },
          { key: "strengthsText", label: "Strengths", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "risksText", label: "Risks", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "issueObjectivesText", label: "Issue objectives", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "subscriptionWatchText", label: "Subscription watch", type: "textarea", rows: 5, placeholder: "Label | Value | Note" },
          { key: "listingWatchText", label: "Listing watch", type: "textarea", rows: 5, placeholder: "Label | Value" },
          { key: "faqText", label: "FAQ items", type: "textarea", rows: 5, placeholder: "Question | Answer" },
        ],
      },
      values: {
        summary: ipo?.summary ?? "",
        angle: ipo?.angle ?? "",
        issueBreakupText: keyValueText(ipo?.issueBreakup ?? []),
        companyDetailsText: keyValueText(ipo?.companyDetails ?? []),
        strengthsText: lines(ipo?.strengths ?? []),
        risksText: lines(ipo?.risks ?? []),
        issueObjectivesText: lines(ipo?.issueObjectives ?? []),
        subscriptionWatchText: labelValueNoteText(ipo?.subscriptionWatch ?? []),
        listingWatchText: keyValueText(ipo?.listingWatch ?? []),
        faqText: faqText(ipo?.faqItems ?? []),
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Issue documents and operator-managed filing or source links.",
        fields: [documentsTextField],
      },
      values: {
        documentLinksText: rowsToText(ipo?.documents ?? [], (item) => `${item.title} | ${item.label}`),
      },
    },
  ];
}

function buildLearnSections(
  article: LearnArticle | null,
  family: "learn" | "research-articles" = "learn",
) {
  const primarySourceCode = family === "research-articles" ? "research_catalog" : "learn_catalog";
  const routeLabel = family === "research-articles" ? "research route" : "learn route";

  return [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: "Editorial identity, authoring posture, archive grouping, and route mapping fields.",
        fields: [
          { key: "title", label: "Title", type: "text", placeholder: "Learn article title" },
          { key: "slug", label: "Slug", type: "text", placeholder: "article-slug" },
          { key: "category", label: "Category", type: "text", placeholder: "Category" },
          { key: "author", label: "Author", type: "text", placeholder: "Amit Bhawani" },
          { key: "archiveGroup", label: "Archive group", type: "text", placeholder: "derivatives-basics" },
          { key: "featuredPriority", label: "Featured / priority", type: "text", placeholder: "High priority feature" },
        ],
      },
      values: {
        title: article?.title ?? "",
        slug: article?.slug ?? "",
        category: article?.category ?? "",
        author: "",
        archiveGroup: article?.category?.toLowerCase().replaceAll(" ", "-") ?? "",
        featuredPriority: "",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route, editorial timing, and publishing posture for the article.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "publishDate", label: "Publish date", type: "text", placeholder: "2026-04-21" },
          { key: "updatedDate", label: "Updated date", type: "text", placeholder: "2026-04-21" },
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Review note" },
        ],
      },
      values: {
        publishState: article ? "published" : "draft",
        publicRoute: article ? `/learn/${article.slug}` : "",
        truthLabel: article ? `Source-backed ${routeLabel}` : `Manual ${routeLabel} draft`,
        publishDate: "",
        updatedDate: "",
        publishNote: article ? "This editorial route is already part of the public learning surface." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "Editorial source posture, linked references, and catalog mapping for the article.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: primarySourceCode },
          sourceStateField,
          sourceUpdatedField,
          { key: "editorialSourceLabel", label: "Editorial source label", type: "text", placeholder: "Internal CMS" },
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: article ? primarySourceCode : "",
        sourceState: article ? "source_backed" : "not_connected",
        sourceUpdatedAt: "",
        editorialSourceLabel: "",
        sourceUrl: "",
      },
    },
    {
      definition: {
        key: "frontend_fields",
        label: "Content",
        description: "Summary, long-form body support, takeaways, related routes, and archive continuity shown on the frontend.",
        fields: [
          { key: "summary", label: "Summary", type: "textarea", rows: 3, placeholder: "Public summary" },
          { key: "body", label: "Body", type: "textarea", rows: 6, placeholder: "Structured editorial body or long-form operator notes." },
          { key: "keyTakeawaysText", label: "Key takeaways", type: "textarea", rows: 4, placeholder: "One takeaway per line" },
          { key: "relatedRoutesText", label: "Related routes", type: "textarea", rows: 4, placeholder: "Label | /route | Why it belongs here" },
          { key: "featuredLinksText", label: "Featured links", type: "textarea", rows: 4, placeholder: "Label | /route" },
          { key: "archiveNavigationText", label: "Archive navigation", type: "textarea", rows: 4, placeholder: "Previous | /learn/... or Next | /learn/..." },
          { key: "bodyBlocksText", label: "Structured body blocks", type: "textarea", rows: 5, placeholder: "Block type | Value | Optional note" },
          { key: "manualNotes", label: "Public editorial note", type: "textarea", rows: 4, placeholder: "Operator-controlled note" },
        ],
      },
      values: {
        summary: article?.summary ?? "",
        body: "",
        keyTakeawaysText: lines(article?.keyTakeaways ?? []),
        relatedRoutesText: "",
        featuredLinksText: "",
        archiveNavigationText: "",
        bodyBlocksText: "",
        manualNotes: "",
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Linked source references, downloadable support links, and research attachments.",
        fields: [documentsTextField],
      },
      values: {
        documentLinksText: "",
      },
    },
  ];
}

function buildNewsletterSections(track: NewsletterTrack | null) {
  return [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: "Newsletter identity, issue framing, cadence, archive grouping, and route mapping fields.",
        fields: [
          { key: "title", label: "Title", type: "text", placeholder: "Investor weekly" },
          { key: "slug", label: "Slug", type: "text", placeholder: "investor-weekly" },
          { key: "issueNumber", label: "Issue number", type: "text", placeholder: "Issue 042" },
          { key: "issueDate", label: "Issue date", type: "text", placeholder: "2026-04-21" },
          { key: "cadence", label: "Cadence", type: "text", placeholder: "Weekly" },
          { key: "audience", label: "Audience", type: "text", placeholder: "Investor users" },
          { key: "archiveGroup", label: "Archive group", type: "text", placeholder: "investor-weekly-2026" },
          { key: "author", label: "Author", type: "text", placeholder: "Riddra editorial" },
        ],
      },
      values: {
        title: track?.title ?? "",
        slug: track?.slug ?? "",
        issueNumber: "",
        issueDate: "",
        cadence: track?.cadence ?? "",
        audience: track?.audience ?? "",
        archiveGroup: track?.slug ?? "",
        author: "",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route, archive posture, and publishing state for the newsletter item.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "featuredPriority", label: "Featured / priority", type: "text", placeholder: "Primary subscriber issue" },
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Review note" },
        ],
      },
      values: {
        publishState: track ? "published" : "draft",
        publicRoute: track ? `/newsletter/${track.slug}` : "",
        truthLabel: track ? "Source-backed newsletter route" : "Manual newsletter draft",
        featuredPriority: "",
        publishNote: track ? "This newsletter track is already live on the public product." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "Newsletter source posture and operator-managed source references.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "newsletter_catalog" },
          sourceStateField,
          sourceUpdatedField,
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: track ? "newsletter_catalog" : "",
        sourceState: track ? "source_backed" : "not_connected",
        sourceUpdatedAt: "",
        sourceUrl: "",
      },
    },
    {
      definition: {
        key: "frontend_fields",
        label: "Content",
        description: "Summary, objective, issue sections, featured links, archive navigation, and linked surfaces shown on the frontend.",
        fields: [
          { key: "summary", label: "Summary", type: "textarea", rows: 4, placeholder: "Public summary" },
          { key: "objective", label: "Objective", type: "textarea", rows: 4, placeholder: "Objective" },
          { key: "sectionsText", label: "Issue sections", type: "textarea", rows: 4, placeholder: "One section per line" },
          { key: "featuredLinksText", label: "Featured links", type: "textarea", rows: 4, placeholder: "Label | /route" },
          { key: "archiveNavigationText", label: "Archive navigation", type: "textarea", rows: 4, placeholder: "Previous issue | /newsletter/... or Next issue | /newsletter/..." },
          { key: "linkedSurfacesText", label: "Linked surfaces", type: "textarea", rows: 4, placeholder: "One route per line" },
          { key: "issueBodyBlocksText", label: "Structured issue blocks", type: "textarea", rows: 5, placeholder: "Block type | Value | Optional note" },
          { key: "internalEditorialNote", label: "Internal editorial note", type: "textarea", rows: 3, placeholder: "Internal note on issue positioning or sequencing." },
        ],
      },
      values: {
        summary: track?.summary ?? "",
        objective: track?.objective ?? "",
        sectionsText: lines(track?.sections ?? []),
        featuredLinksText: "",
        archiveNavigationText: "",
        linkedSurfacesText: lines(track?.linkedSurfaces ?? []),
        issueBodyBlocksText: "",
        internalEditorialNote: "",
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Supporting campaign links or source references for this newsletter track.",
        fields: [documentsTextField],
      },
      values: {
        documentLinksText: "",
      },
    },
  ];
}

function buildCourseSections(course: CourseItem | null) {
  return [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: "Course identity, cover, authoring, and route mapping fields.",
        fields: [
          { key: "title", label: "Title", type: "text", placeholder: "Course title" },
          { key: "slug", label: "Slug", type: "text", placeholder: "course-slug" },
          { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Course subtitle" },
          { key: "shortDescription", label: "Short description", type: "textarea", rows: 3, placeholder: "One-paragraph course summary" },
          { key: "fullDescription", label: "Full description", type: "textarea", rows: 6, placeholder: "Long-form course description, benefits, and promise." },
          { key: "coverImage", label: "Thumbnail / cover", type: "text", placeholder: "https://..." },
          { key: "instructor", label: "Instructor / author", type: "text", placeholder: "Amit Bhawani" },
          { key: "category", label: "Category", type: "text", placeholder: "Category" },
          { key: "level", label: "Level", type: "text", placeholder: "Beginner" },
        ],
      },
      values: {
        title: course?.title ?? "",
        slug: course?.slug ?? "",
        subtitle: course?.audience ?? "",
        shortDescription: course?.summary ?? "",
        fullDescription: course?.summary ?? "",
        coverImage: "",
        instructor: course?.instructor ?? "",
        category: course?.category ?? "",
        level: course?.level ?? "",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route, visibility posture, and route readiness for the course.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "seoTitle", label: "SEO title", type: "text", placeholder: "Course SEO title" },
          { key: "seoDescription", label: "SEO description", type: "textarea", rows: 3, placeholder: "Optional SEO/support description." },
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Review note" },
        ],
      },
      values: {
        publishState: course ? "published" : "draft",
        publicRoute: course ? `/courses/${course.slug}` : "",
        truthLabel: course ? "Source-backed course route" : "Manual course draft",
        seoTitle: "",
        seoDescription: "",
        publishNote: course ? "This course route is already part of the public education surface." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "Course source posture and operator-controlled references.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "courses_catalog" },
          sourceStateField,
          sourceUpdatedField,
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: course ? "courses_catalog" : "",
        sourceState: course ? "source_backed" : "not_connected",
        sourceUpdatedAt: "",
        sourceUrl: "",
      },
    },
    {
      definition: {
        key: "structure",
        label: "Structure",
        description: "Modules, lessons, duration, difficulty, tags, and ordering for the course experience.",
        fields: [
          { key: "duration", label: "Duration", type: "text", placeholder: "6 modules" },
          { key: "difficulty", label: "Difficulty", type: "text", placeholder: "Beginner" },
          { key: "categoryTags", label: "Category / tags", type: "text", placeholder: "Stocks, basics, beginner" },
          { key: "format", label: "Format", type: "text", placeholder: "Video + notes" },
          { key: "audience", label: "Audience", type: "text", placeholder: "Audience" },
          { key: "bundleFit", label: "Bundle fit", type: "text", placeholder: "Starter trust builder" },
          { key: "priceAnchor", label: "Price anchor", type: "text", placeholder: "Worth ₹2,499" },
          { key: "modulesText", label: "Modules", type: "textarea", rows: 4, placeholder: "One module per line" },
          { key: "lessonPlanText", label: "Lessons", type: "textarea", rows: 6, placeholder: "Title | Format | Duration | Outcome" },
          { key: "lessonOrderingNote", label: "Lesson ordering note", type: "textarea", rows: 3, placeholder: "How the lesson order should be grouped or sequenced." },
          { key: "outcomesText", label: "Outcomes", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "prerequisitesText", label: "Prerequisites", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "deliverablesText", label: "Deliverables", type: "textarea", rows: 4, placeholder: "One point per line" },
        ],
      },
      values: {
        duration: course?.duration ?? "",
        difficulty: course?.level ?? "",
        categoryTags: course?.category ?? "",
        format: course?.format ?? "",
        audience: course?.audience ?? "",
        bundleFit: course?.bundleFit ?? "",
        priceAnchor: course?.priceAnchor ?? "",
        modulesText: lines(course?.modules ?? []),
        lessonPlanText: rowsToText(course?.lessonPlan ?? [], (item) => `${item.title} | ${item.format} | ${item.duration} | ${item.outcome}`),
        lessonOrderingNote: "",
        outcomesText: lines(course?.outcomes ?? []),
        prerequisitesText: lines(course?.prerequisites ?? []),
        deliverablesText: lines(course?.deliverables ?? []),
      },
    },
    {
      definition: {
        key: "lesson_content",
        label: "Lesson content support",
        description: "Structured lesson blocks for embeds, resources, callouts, external links, and future quiz readiness.",
        fields: [
          { key: "lessonContentBlocksText", label: "Lesson content blocks", type: "textarea", rows: 6, placeholder: "Lesson slug | Block type | Value | Optional note" },
          { key: "youtubeEmbedUrl", label: "YouTube embed URL", type: "text", placeholder: "https://youtube.com/watch?v=..." },
          { key: "videoTitle", label: "Video title", type: "text", placeholder: "Module 1 intro" },
          { key: "resourceLinksText", label: "Downloadable resources", type: "textarea", rows: 4, placeholder: "Label | /resource or https://..." },
          { key: "calloutNote", label: "Callout / note block", type: "textarea", rows: 3, placeholder: "Important teaching callout or reminder." },
          { key: "externalLinksText", label: "External link blocks", type: "textarea", rows: 4, placeholder: "Label | https://..." },
          { key: "quizPlaceholderFlag", label: "Quiz placeholder", type: "select", options: yesNoOptions },
          { key: "previewLesson", label: "Preview lesson enabled", type: "select", options: yesNoOptions },
        ],
      },
      values: {
        lessonContentBlocksText: "",
        youtubeEmbedUrl: "",
        videoTitle: "",
        resourceLinksText: "",
        calloutNote: "",
        externalLinksText: "",
        quizPlaceholderFlag: "no",
        previewLesson: "no",
      },
    },
    {
      definition: {
        key: "relations",
        label: "Relations",
        description: "Related courses, learn articles, webinars, and linked market or product routes.",
        fields: [
          { key: "relatedCoursesText", label: "Related courses", type: "textarea", rows: 4, placeholder: "Label | /courses/slug" },
          { key: "relatedLearnText", label: "Related learn articles", type: "textarea", rows: 4, placeholder: "Label | /learn/slug" },
          { key: "relatedWebinarsText", label: "Related webinars", type: "textarea", rows: 4, placeholder: "Label | /webinars/slug" },
          { key: "relatedMarketRoutesText", label: "Related market or product routes", type: "textarea", rows: 4, placeholder: "Label | /route" },
        ],
      },
      values: {
        relatedCoursesText: "",
        relatedLearnText: "",
        relatedWebinarsText: "",
        relatedMarketRoutesText: rowsToText(course?.relatedRoutes ?? [], (item) => `${item.label} | ${item.href}`),
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Supporting curriculum, downloadable resources, and operator-managed route links for the course.",
        fields: [documentsTextField],
      },
      values: {
        documentLinksText: "",
      },
    },
  ];
}

function buildWebinarSections(webinar: Webinar | null) {
  return [
    {
      definition: {
        key: "identity",
        label: "Identity",
        description: "Webinar identity, summary, cover, speaker context, and route mapping fields.",
        fields: [
          { key: "title", label: "Title", type: "text", placeholder: "Webinar title" },
          { key: "slug", label: "Slug", type: "text", placeholder: "webinar-slug" },
          { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Webinar subtitle" },
          { key: "summary", label: "Summary", type: "textarea", rows: 3, placeholder: "Public summary" },
          { key: "coverImage", label: "Cover image", type: "text", placeholder: "https://..." },
          { key: "speakerHost", label: "Speaker / host", type: "text", placeholder: "Amit Bhawani" },
          { key: "format", label: "Format", type: "text", placeholder: "Live workshop" },
          { key: "audience", label: "Audience", type: "text", placeholder: "Audience" },
        ],
      },
      values: {
        title: webinar?.title ?? "",
        slug: webinar?.slug ?? "",
        subtitle: webinar?.formatStatus ?? "",
        summary: webinar?.summary ?? "",
        coverImage: "",
        speakerHost: webinar?.host ?? "",
        format: webinar?.format ?? "",
        audience: webinar?.audience ?? "",
      },
    },
    {
      definition: {
        key: "publishing",
        label: "Publishing",
        description: "Public route, replay posture, and publishing state for the webinar.",
        fields: [
          publishStateField,
          publicRouteField,
          scheduledPublishField,
          scheduledUnpublishField,
          truthStateField,
          { key: "seoTitle", label: "SEO title", type: "text", placeholder: "Webinar SEO title" },
          { key: "publishNote", label: "Publish note", type: "textarea", rows: 3, placeholder: "Review note" },
        ],
      },
      values: {
        publishState: webinar ? "published" : "draft",
        publicRoute: webinar ? `/webinars/${webinar.slug}` : "",
        truthLabel: webinar ? "Source-backed webinar route" : "Manual webinar draft",
        seoTitle: "",
        publishNote: webinar ? "This webinar route is already part of the public education surface." : "",
      },
    },
    {
      definition: {
        key: "data_sources",
        label: "Data sources",
        description: "Webinar source posture and operator-managed source references.",
        fields: [
          { key: "primarySourceCode", label: "Primary source label", type: "text", placeholder: "webinars_catalog" },
          sourceStateField,
          sourceUpdatedField,
          { key: "sourceUrl", label: "Primary source URL", type: "text", placeholder: "https://..." },
        ],
      },
      values: {
        primarySourceCode: webinar ? "webinars_catalog" : "",
        sourceState: webinar ? "source_backed" : "not_connected",
        sourceUpdatedAt: "",
        sourceUrl: "",
      },
    },
    {
      definition: {
        key: "schedule_event",
        label: "Schedule / event",
        description: "Live timing, timezone, registration status, replay posture, and event-state controls.",
        fields: [
          { key: "liveDateTime", label: "Live date / time", type: "text", placeholder: "2026-04-27 11:00 IST" },
          { key: "timezone", label: "Timezone", type: "text", placeholder: "Asia/Kolkata" },
          { key: "registrationStatus", label: "Registration status", type: "text", placeholder: "Open" },
          {
            key: "eventStatus",
            label: "Event status",
            type: "select",
            options: [
              { label: "Upcoming", value: "upcoming" },
              { label: "Live", value: "live" },
              { label: "Completed", value: "completed" },
              { label: "Replay only", value: "replay_only" },
            ],
          },
          { key: "replayAvailable", label: "Replay available", type: "select", options: yesNoOptions },
          { key: "duration", label: "Duration", type: "text", placeholder: "60 minutes" },
          { key: "cadence", label: "Cadence", type: "text", placeholder: "Weekly" },
          { key: "nextSession", label: "Next session", type: "text", placeholder: "Saturday · 11:00 AM IST" },
          { key: "formatStatus", label: "Format status", type: "text", placeholder: "Launch-ready" },
        ],
      },
      values: {
        liveDateTime: webinar?.nextSession ?? "",
        timezone: "Asia/Kolkata",
        registrationStatus: webinar?.registrationMode ?? "",
        eventStatus: "upcoming",
        replayAvailable: webinar?.replayAssets?.length ? "yes" : "no",
        duration: webinar?.duration ?? "",
        cadence: webinar?.cadence ?? "",
        nextSession: webinar?.nextSession ?? "",
        formatStatus: webinar?.formatStatus ?? "",
      },
    },
    {
      definition: {
        key: "frontend_fields",
        label: "Content",
        description: "Description, agenda, registration or replay links, downloadable assets, and follow-up routes shown publicly.",
        fields: [
          { key: "description", label: "Description", type: "textarea", rows: 5, placeholder: "Long-form webinar description." },
          { key: "agendaText", label: "Agenda", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "registrationLink", label: "Registration link", type: "text", placeholder: "https://..." },
          { key: "replayLink", label: "Replay link", type: "text", placeholder: "https://..." },
          { key: "youtubeReplayUrl", label: "YouTube / replay URL", type: "text", placeholder: "https://youtube.com/watch?v=..." },
          { key: "registrationMode", label: "Registration mode", type: "text", placeholder: "Open signup" },
          { key: "registrationStepsText", label: "Registration steps", type: "textarea", rows: 4, placeholder: "One step per line" },
          { key: "replayPlan", label: "Replay plan", type: "textarea", rows: 3, placeholder: "Replay plan" },
          { key: "replayAssetsText", label: "Replay assets", type: "textarea", rows: 4, placeholder: "One asset per line" },
          { key: "resourcesText", label: "Downloadable assets / resources", type: "textarea", rows: 4, placeholder: "One asset per line" },
          { key: "outcomesText", label: "Outcomes", type: "textarea", rows: 4, placeholder: "One point per line" },
          { key: "followUpRoutesText", label: "Related routes", type: "textarea", rows: 4, placeholder: "Label | /route" },
          { key: "relatedCoursesText", label: "Related courses", type: "textarea", rows: 4, placeholder: "Label | /courses/slug" },
          { key: "relatedLearnText", label: "Related learn articles", type: "textarea", rows: 4, placeholder: "Label | /learn/slug" },
          { key: "relatedMarketRoutesText", label: "Related stocks, funds, or indices", type: "textarea", rows: 4, placeholder: "Label | /route" },
        ],
      },
      values: {
        description: webinar?.summary ?? "",
        agendaText: lines(webinar?.agenda ?? []),
        registrationLink: "",
        replayLink: "",
        youtubeReplayUrl: "",
        registrationMode: webinar?.registrationMode ?? "",
        registrationStepsText: lines(webinar?.registrationSteps ?? []),
        replayPlan: webinar?.replayPlan ?? "",
        replayAssetsText: lines(webinar?.replayAssets ?? []),
        resourcesText: lines(webinar?.assets ?? []),
        outcomesText: lines(webinar?.outcomes ?? []),
        followUpRoutesText: rowsToText(webinar?.followUpRoutes ?? [], (item) => `${item.label} | ${item.href}`),
        relatedCoursesText: "",
        relatedLearnText: "",
        relatedMarketRoutesText: "",
      },
    },
    {
      definition: {
        key: "documents_links",
        label: "Documents / links",
        description: "Replay assets, registration references, and operator-managed supporting links for the webinar.",
        fields: [documentsTextField],
      },
      values: {
        documentLinksText: "",
      },
    },
  ];
}

const loadFamilySourceRows = cache(async function loadFamilySourceRows(family: AdminFamilyKey) {
  switch (family) {
    case "stocks":
      return await getStocks();
    case "mutual-funds":
      return await getFunds();
    case "indices":
      return await getIndexSnapshots();
    case "etfs":
      return getWealthProductsByFamily("etf");
    case "ipos":
      return await getIpos();
    case "pms":
      return getWealthProductsByFamily("pms");
    case "aif":
      return getWealthProductsByFamily("aif");
    case "sif":
      return getWealthProductsByFamily("sif");
    case "courses":
      return courses;
    case "webinars":
      return webinars;
    case "learn":
    case "research-articles":
      return learnArticles;
    case "newsletter":
      return newsletterTracks;
  }
});

const loadStaticFamilySourceRow = cache(async function loadStaticFamilySourceRow(
  family: AdminFamilyKey,
  slug: string,
) {
  const sourceRows = await loadFamilySourceRows(family);
  return (
    (sourceRows as Array<{
      slug?: string | null;
    }>).find((item) => item.slug === slug) ?? null
  );
});

const loadFamilySourceRow = cache(async function loadFamilySourceRow(
  family: AdminFamilyKey,
  slug: string,
) {
  switch (family) {
    case "stocks":
      return await getStock(slug);
    case "mutual-funds":
      return await getFund(slug);
    case "indices":
      return await getIndexSnapshot(slug);
    case "ipos":
      return await getIpo(slug);
    default:
      return await loadStaticFamilySourceRow(family, slug);
  }
});

function getFamilyPublicHref(family: AdminFamilyKey, slug: string) {
  return family === "indices" ? `/${slug}` : `${adminFamilyMeta[family].routeBase}/${slug}`;
}

function buildRefreshSection(
  family: AdminFamilyKey,
  record: AdminManagedRecord | null,
  sourceDate: string,
) {
  const refreshState = record?.refreshState ?? {
    laneKey:
      family === "stocks"
        ? "stock_quote_session"
        : family === "mutual-funds"
          ? "mutual_fund_nav_history"
          : family === "indices"
            ? "index_composition"
            : "editorial_catalog",
    laneLabel:
      family === "stocks"
        ? "Stock quote / session refresh"
        : family === "mutual-funds"
          ? "Mutual-fund NAV history refresh"
          : family === "indices"
            ? "Index composition refresh"
            : "Editorial catalog refresh",
    refreshEnabled: ["stocks", "mutual-funds", "indices"].includes(family),
    cadence:
      family === "stocks"
        ? "Every 15 minutes during market hours"
        : family === "mutual-funds"
          ? "Daily end of day"
          : family === "indices"
            ? "Weekly"
            : "Manual / CMS driven",
    lastRunAt: sourceDate || null,
    lastSuccessAt: sourceDate || null,
    lastFailureAt: null,
    latestStatus: sourceDate ? "healthy" : "planned",
    latestError: null,
    nextScheduledRunAt: null,
    manualRunSupported: ["stocks", "mutual-funds", "indices"].includes(family),
    sourceDependency:
      family === "stocks"
        ? "Market data provider"
        : family === "mutual-funds"
          ? "Fund durable lanes"
          : family === "indices"
            ? "Index durable lanes"
            : "Editorial CMS",
  };

  return {
    definition: {
      key: "refresh_automation",
      label: "Refresh / automation",
      description:
        "Refresh cadence, next scheduled run, source dependency, and operator-managed automation posture.",
      fields: [
        {
          key: "refreshEnabled",
          label: "Refresh enabled",
          type: "select",
          options: [
            { label: "Enabled", value: "yes" },
            { label: "Disabled", value: "no" },
          ],
        },
        {
          key: "laneLabel",
          label: "Refresh lane",
          type: "text",
          placeholder: "Durable refresh lane",
        },
        {
          key: "cadence",
          label: "Cadence",
          type: "text",
          placeholder: "Every 15 minutes",
        },
        {
          key: "latestStatus",
          label: "Latest status",
          type: "select",
          options: [
            { label: "Healthy", value: "healthy" },
            { label: "Running", value: "running" },
            { label: "Warning", value: "warning" },
            { label: "Failed", value: "failed" },
            { label: "Paused", value: "paused" },
            { label: "Planned", value: "planned" },
          ],
        },
        {
          key: "nextScheduledRunAt",
          label: "Next scheduled run",
          type: "text",
          placeholder: "2026-04-21T14:00:00Z",
        },
        {
          key: "lastSuccessAt",
          label: "Last success",
          type: "text",
          placeholder: "Awaiting first success",
        },
        {
          key: "lastFailureAt",
          label: "Last failure",
          type: "text",
          placeholder: "No failures recorded",
        },
        {
          key: "sourceDependency",
          label: "Source dependency",
          type: "text",
          placeholder: "Source dependency",
        },
        {
          key: "latestError",
          label: "Latest error",
          type: "textarea",
          rows: 3,
          placeholder: "Latest failure or operator note",
        },
      ],
    },
    values: {
      refreshEnabled: refreshState.refreshEnabled ? "yes" : "no",
      laneLabel: refreshState.laneLabel,
      cadence: refreshState.cadence,
      latestStatus: refreshState.latestStatus,
      nextScheduledRunAt: refreshState.nextScheduledRunAt ?? "",
      lastSuccessAt: refreshState.lastSuccessAt ?? "",
      lastFailureAt: refreshState.lastFailureAt ?? "",
      sourceDependency: refreshState.sourceDependency,
      latestError: refreshState.latestError ?? "",
    },
  } satisfies AdminSectionSeed;
}

function injectPublishingLifecycleValues(
  sections: AdminSectionSeed[],
  record: AdminManagedRecord | null,
) {
  return sections.map((section) =>
    section.definition.key === "publishing"
      ? {
          ...section,
          values: {
            ...section.values,
            scheduledPublishAt: record?.scheduledPublishAt ?? "",
            scheduledUnpublishAt: record?.scheduledUnpublishAt ?? "",
          },
        }
      : section,
  );
}

export async function getAdminFamilyRows(
  family: AdminFamilyKey,
  records: AdminManagedRecord[],
  options?: AdminRowsQueryOptions,
): Promise<AdminListRow[]> {
  const cacheKey = buildAdminRowsCacheKey("family", records, options, family);
  const cachedRows = adminFamilyRowsCache.get(cacheKey);

  if (cachedRows) {
    return cachedRows;
  }

  const sourceRows = await loadFamilySourceRows(family);
  const familyRecords = records.filter((record) => record.family === family);
  const recordBySlug = new Map(familyRecords.map((record) => [record.slug, record]));
  const appendManualRows = (rows: AdminListRow[]) => {
    const existingSlugs = new Set(rows.map((row) => row.slug));
    const manualOnlyRows = familyRecords
      .filter((record) => !existingSlugs.has(record.slug))
      .map((record) =>
        createListRow({
          family,
          slug: record.slug,
          title: record.title,
          symbol: record.symbol,
          summary:
            record.sections.frontend_fields?.values.summary ??
            record.sections.frontend_fields?.values.manualNotes ??
            record.sections.publishing?.values.publishNote ??
            "Manual operator draft",
          publicHref: record.publicHref ?? getFamilyPublicHref(family, record.slug),
          sourceLabel: record.sourceLabel,
          sourceFreshness: record.sourceDate || null,
          record,
          sourcePresent: false,
          accessControl: resolveRecordAccessControl(family, record, null),
          benchmarkMapping: record.benchmarkMapping,
        }),
      );

    const resolvedRows = [...rows, ...manualOnlyRows].sort((left, right) =>
      left.title.localeCompare(right.title),
    );
    setBoundedListCache(adminFamilyRowsCache, cacheKey, resolvedRows);
    return resolvedRows;
  };

  if (family === "stocks") {
    return appendManualRows((sourceRows as StockSnapshot[]).map((stock) =>
      {
        const rowRecord = recordBySlug.get(stock.slug) ?? null;
        return createListRow({
          family,
          slug: stock.slug,
          title: stock.name,
          symbol: stock.symbol,
          summary: stock.summary,
          publicHref: getFamilyPublicHref(family, stock.slug),
          sourceLabel: stock.primarySourceCode,
          sourceFreshness: buildSourceDateFromStock(stock),
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, stock),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? stock.sectorIndexSlug ?? null,
        });
      },
    ));
  }

  if (family === "mutual-funds") {
    return appendManualRows((sourceRows as FundSnapshot[]).map((fund) =>
      {
        const rowRecord = recordBySlug.get(fund.slug) ?? null;
        return createListRow({
          family,
          slug: fund.slug,
          title: fund.name,
          symbol: null,
          summary: fund.summary,
          publicHref: getFamilyPublicHref(family, fund.slug),
          sourceLabel: fund.primarySourceCode,
          sourceFreshness: buildSourceDateFromFund(fund),
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, fund),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? fund.benchmarkIndexSlug ?? fund.benchmark,
        });
      },
    ));
  }

  if (family === "indices") {
    return appendManualRows((sourceRows as IndexSnapshot[]).map((index) =>
      {
        const rowRecord = recordBySlug.get(index.slug) ?? null;
        return createListRow({
          family,
          slug: index.slug,
          title: index.title,
          symbol: index.shortName,
          summary: index.narrative,
          publicHref: getFamilyPublicHref(family, index.slug),
          sourceLabel: index.sourceCode,
          sourceFreshness: index.lastUpdated,
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, index),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? null,
        });
      },
    ));
  }

  if (family === "ipos") {
    return appendManualRows((sourceRows as IpoSnapshot[]).map((ipo) =>
      {
        const rowRecord = recordBySlug.get(ipo.slug) ?? null;
        return createListRow({
          family,
          slug: ipo.slug,
          title: ipo.name,
          symbol: null,
          summary: ipo.summary,
          publicHref: getFamilyPublicHref(family, ipo.slug),
          sourceLabel: ipo.primarySourceCode,
          sourceFreshness: ipo.listingDate,
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, ipo),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? null,
        });
      },
    ));
  }

  if (["etfs", "pms", "aif", "sif"].includes(family)) {
    return appendManualRows((sourceRows as WealthProduct[]).map((product) =>
      {
        const rowRecord = recordBySlug.get(product.slug) ?? null;
        return createListRow({
          family,
          slug: product.slug,
          title: product.name,
          symbol: null,
          summary: product.summary,
          publicHref: getFamilyPublicHref(family, product.slug),
          sourceLabel: "wealth_products",
          sourceFreshness: null,
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, product),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? product.benchmark,
        });
      },
    ));
  }

  if (family === "courses") {
    return appendManualRows((sourceRows as CourseItem[]).map((course) =>
      {
        const rowRecord = recordBySlug.get(course.slug) ?? null;
        return createListRow({
          family,
          slug: course.slug,
          title: course.title,
          symbol: null,
          summary: course.summary,
          publicHref: getFamilyPublicHref(family, course.slug),
          sourceLabel: "courses_catalog",
          sourceFreshness: null,
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, course),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? null,
        });
      },
    ));
  }

  if (family === "webinars") {
    return appendManualRows((sourceRows as Webinar[]).map((webinar) =>
      {
        const rowRecord = recordBySlug.get(webinar.slug) ?? null;
        return createListRow({
          family,
          slug: webinar.slug,
          title: webinar.title,
          symbol: null,
          summary: webinar.summary,
          publicHref: getFamilyPublicHref(family, webinar.slug),
          sourceLabel: "webinars_catalog",
          sourceFreshness: null,
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, webinar),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? null,
        });
      },
    ));
  }

  if (family === "newsletter") {
    return appendManualRows((sourceRows as NewsletterTrack[]).map((track) =>
      {
        const rowRecord = recordBySlug.get(track.slug) ?? null;
        return createListRow({
          family,
          slug: track.slug,
          title: track.title,
          symbol: null,
          summary: track.summary,
          publicHref: getFamilyPublicHref(family, track.slug),
          sourceLabel: "newsletter_catalog",
          sourceFreshness: null,
          record: rowRecord,
          sourcePresent: true,
          accessControl: resolveRecordAccessControl(family, rowRecord, track),
          benchmarkMapping: rowRecord?.benchmarkMapping ?? null,
        });
      },
    ));
  }

  return appendManualRows((sourceRows as LearnArticle[]).map((article) =>
    {
      const rowRecord = recordBySlug.get(article.slug) ?? null;
      return createListRow({
        family,
        slug: article.slug,
        title: article.title,
        symbol: null,
        summary: article.summary,
        publicHref: getFamilyPublicHref(family, article.slug),
        sourceLabel: "learn_catalog",
        sourceFreshness: null,
        record: rowRecord,
        sourcePresent: true,
        accessControl: resolveRecordAccessControl(family, rowRecord, article),
        benchmarkMapping: rowRecord?.benchmarkMapping ?? null,
      });
    },
  ));
}

export async function getAllAdminRows(
  records: AdminManagedRecord[],
  options?: AdminRowsQueryOptions,
): Promise<AdminListRow[]> {
  const cacheKey = buildAdminRowsCacheKey("all", records, options);
  const cachedRows = adminAllRowsCache.get(cacheKey);

  if (cachedRows) {
    return cachedRows;
  }

  const allRows = await Promise.all(
    getAdminFamilyKeys().map(async (family) => await getAdminFamilyRows(family, records, options)),
  );
  const flattenedRows = allRows.flat();
  setBoundedListCache(adminAllRowsCache, cacheKey, flattenedRows);
  return flattenedRows;
}

export async function getAdminRowsForFamilies(
  families: AdminFamilyKey[],
  records: AdminManagedRecord[],
  options?: AdminRowsQueryOptions,
): Promise<AdminListRow[]> {
  const scopedFamilies = getAdminFamilyKeys(families);

  if (!scopedFamilies.length) {
    return [];
  }

  const rowGroups = await Promise.all(
    scopedFamilies.map(async (family) => await getAdminFamilyRows(family, records, options)),
  );

  return rowGroups.flat();
}

export async function searchAdminRecords(
  query: string,
  records: AdminManagedRecord[],
  options?: AdminRecordSearchOptions,
): Promise<AdminListRow[]> {
  const lowered = query.trim().toLowerCase();

  if (!lowered) {
    return [];
  }

  const exactMatches: AdminListRow[] = [];
  const partialMatches: AdminListRow[] = [];
  const limit = options?.limit ?? 50;
  const families = getAdminFamilyKeys(options?.families);

  for (const family of families) {
    const rows = await getAdminFamilyRows(family, records, options);

    for (const row of rows) {
      if (!row.searchText.includes(lowered)) {
        continue;
      }

      const exactMatch =
        row.slug.toLowerCase() === lowered ||
        row.symbol?.toLowerCase() === lowered ||
        row.title.toLowerCase() === lowered;

      if (exactMatch) {
        exactMatches.push(row);
      } else {
        partialMatches.push(row);
      }
    }

    if (exactMatches.length >= limit || exactMatches.length + partialMatches.length >= limit * 3) {
      break;
    }
  }

  return [...exactMatches, ...partialMatches]
    .sort((left, right) => {
      const leftExact =
        left.slug.toLowerCase() === lowered ||
        left.symbol?.toLowerCase() === lowered ||
        left.title.toLowerCase() === lowered;
      const rightExact =
        right.slug.toLowerCase() === lowered ||
        right.symbol?.toLowerCase() === lowered ||
        right.title.toLowerCase() === lowered;

      if (leftExact && !rightExact) {
        return -1;
      }

      if (rightExact && !leftExact) {
        return 1;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}

export async function getAdminRecordEditorData(
  family: AdminFamilyKey,
  slug: string,
  record: AdminManagedRecord | null,
): Promise<AdminEditorRecord> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (family === "stocks") {
    const stock = (await loadFamilySourceRow("stocks", normalizedSlug)) as StockSnapshot | null;
    return buildAdminEditorRecord(family, stock?.slug ?? normalizedSlug, stock?.name ?? record?.title ?? "", stock?.symbol ?? record?.symbol ?? null, stock ? stock.summary : "", buildStockSections(stock), record, {
      publicHref: stock ? `/stocks/${stock.slug}` : record?.publicHref ?? `/stocks/${normalizedSlug}`,
      sourceLabel: stock?.primarySourceCode ?? record?.sourceLabel ?? "",
      sourceDate: stock ? buildSourceDateFromStock(stock) : record?.sourceDate ?? "",
      sourceUrl: record?.sourceUrl ?? stock?.fundamentalsMeta?.sourceUrl ?? stock?.shareholdingMeta?.sourceUrl ?? "",
      sourceTable: record?.sourceTable ?? "stocks_catalog",
      sourceRowId: record?.sourceRowId ?? stock?.slug ?? null,
      sourcePresent: Boolean(stock),
      benchmarkMapping: stock?.sectorIndexSlug ?? record?.benchmarkMapping ?? null,
      seoContext: {
        price: stock?.price ?? null,
        sector: stock?.sector ?? null,
        benchmark: stock?.sectorIndexSlug ?? record?.benchmarkMapping ?? null,
      },
      accessControl: resolveRecordAccessControl(family, record, stock),
    });
  }

  if (family === "mutual-funds") {
    const fund = (await loadFamilySourceRow("mutual-funds", normalizedSlug)) as FundSnapshot | null;
    return buildAdminEditorRecord(family, fund?.slug ?? normalizedSlug, fund?.name ?? record?.title ?? "", null, fund ? fund.summary : "", buildFundSections(fund), record, {
      publicHref: fund ? `/mutual-funds/${fund.slug}` : record?.publicHref ?? `/mutual-funds/${normalizedSlug}`,
      sourceLabel: fund?.primarySourceCode ?? record?.sourceLabel ?? "",
      sourceDate: fund ? buildSourceDateFromFund(fund) : record?.sourceDate ?? "",
      sourceUrl:
        record?.sourceUrl ??
        fund?.factsheetMeta?.referenceUrl ??
        fund?.holdingsMeta?.referenceUrl ??
        fund?.allocationMeta?.referenceUrl ??
        "",
      sourceTable: record?.sourceTable ?? "funds_catalog",
      sourceRowId: record?.sourceRowId ?? fund?.slug ?? null,
      sourcePresent: Boolean(fund),
      benchmarkMapping: fund?.benchmarkIndexSlug ?? fund?.benchmark ?? record?.benchmarkMapping ?? null,
      seoContext: {
        price: fund?.nav ?? null,
        category: fund?.category ?? null,
        benchmark: fund?.benchmark ?? fund?.benchmarkIndexSlug ?? record?.benchmarkMapping ?? null,
      },
      accessControl: resolveRecordAccessControl(family, record, fund),
    });
  }

  if (family === "indices") {
    const index = (await loadFamilySourceRow("indices", normalizedSlug)) as IndexSnapshot | null;
    return buildAdminEditorRecord(family, index?.slug ?? normalizedSlug, index?.title ?? record?.title ?? "", index?.shortName ?? record?.symbol ?? null, index ? index.narrative : "", buildIndexSections(index), record, {
      publicHref: index ? `/${index.slug}` : record?.publicHref ?? `/${normalizedSlug}`,
      sourceLabel: index?.sourceCode ?? record?.sourceLabel ?? "",
      sourceDate: index?.lastUpdated ?? record?.sourceDate ?? "",
      sourceUrl: record?.sourceUrl ?? index?.compositionMeta?.referenceUrl ?? "",
      sourceTable: record?.sourceTable ?? "index_snapshots",
      sourceRowId: record?.sourceRowId ?? index?.slug ?? null,
      sourcePresent: Boolean(index),
      benchmarkMapping: record?.benchmarkMapping ?? null,
      seoContext: {
        benchmark: record?.benchmarkMapping ?? null,
      },
      accessControl: resolveRecordAccessControl(family, record, index),
    });
  }

  if (family === "ipos") {
    const ipo = (await loadFamilySourceRow("ipos", normalizedSlug)) as IpoSnapshot | null;
    return buildAdminEditorRecord(family, ipo?.slug ?? normalizedSlug, ipo?.name ?? record?.title ?? "", null, ipo ? ipo.summary : "", buildIpoSections(ipo), record, {
      publicHref: ipo ? `/ipo/${ipo.slug}` : record?.publicHref ?? `/ipo/${normalizedSlug}`,
      sourceLabel: ipo?.primarySourceCode ?? record?.sourceLabel ?? "",
      sourceDate: ipo?.listingDate ?? record?.sourceDate ?? "",
      sourceUrl: record?.sourceUrl ?? "",
      sourceTable: record?.sourceTable ?? "ipos_catalog",
      sourceRowId: record?.sourceRowId ?? ipo?.slug ?? null,
      sourcePresent: Boolean(ipo),
      accessControl: resolveRecordAccessControl(family, record, ipo),
    });
  }

  if (["etfs", "pms", "aif", "sif"].includes(family)) {
    const product = (await loadFamilySourceRow(family, normalizedSlug)) as WealthProduct | null;
    return buildAdminEditorRecord(
      family,
      product?.slug ?? normalizedSlug,
      product?.name ?? record?.title ?? "",
      null,
      product ? product.summary : "",
      buildWealthSections(product, adminFamilyMeta[family].singular, adminFamilyMeta[family].routeBase),
      record,
      {
        publicHref: product
          ? `${adminFamilyMeta[family].routeBase}/${product.slug}`
          : record?.publicHref ?? `${adminFamilyMeta[family].routeBase}/${normalizedSlug}`,
        sourceLabel: record?.sourceLabel ?? "wealth_products",
        sourceDate: record?.sourceDate ?? "",
        sourceUrl: record?.sourceUrl ?? "",
        sourceTable: record?.sourceTable ?? "wealth_products",
        sourceRowId: record?.sourceRowId ?? product?.slug ?? null,
        sourcePresent: Boolean(product),
        benchmarkMapping: product?.benchmark ?? record?.benchmarkMapping ?? null,
        accessControl: resolveRecordAccessControl(family, record, product),
      },
    );
  }

  if (family === "courses") {
    const course = (await loadFamilySourceRow("courses", normalizedSlug)) as CourseItem | null;
    return buildAdminEditorRecord(family, course?.slug ?? normalizedSlug, course?.title ?? record?.title ?? "", null, course ? course.summary : "", buildCourseSections(course), record, {
      publicHref: course ? `/courses/${course.slug}` : record?.publicHref ?? `/courses/${normalizedSlug}`,
      sourceLabel: record?.sourceLabel ?? "courses_catalog",
      sourceDate: record?.sourceDate ?? "",
      sourceUrl: record?.sourceUrl ?? "",
      sourceTable: record?.sourceTable ?? "courses_catalog",
      sourceRowId: record?.sourceRowId ?? course?.slug ?? null,
      sourcePresent: Boolean(course),
      accessControl: resolveRecordAccessControl(family, record, course),
    });
  }

  if (family === "webinars") {
    const webinar = (await loadFamilySourceRow("webinars", normalizedSlug)) as Webinar | null;
    return buildAdminEditorRecord(family, webinar?.slug ?? normalizedSlug, webinar?.title ?? record?.title ?? "", null, webinar ? webinar.summary : "", buildWebinarSections(webinar), record, {
      publicHref: webinar ? `/webinars/${webinar.slug}` : record?.publicHref ?? `/webinars/${normalizedSlug}`,
      sourceLabel: record?.sourceLabel ?? "webinars_catalog",
      sourceDate: record?.sourceDate ?? "",
      sourceUrl: record?.sourceUrl ?? "",
      sourceTable: record?.sourceTable ?? "webinars_catalog",
      sourceRowId: record?.sourceRowId ?? webinar?.slug ?? null,
      sourcePresent: Boolean(webinar),
      accessControl: resolveRecordAccessControl(family, record, webinar),
    });
  }

  if (family === "newsletter") {
    const track = (await loadFamilySourceRow("newsletter", normalizedSlug)) as NewsletterTrack | null;
    return buildAdminEditorRecord(family, track?.slug ?? normalizedSlug, track?.title ?? record?.title ?? "", null, track ? track.summary : "", buildNewsletterSections(track), record, {
      publicHref: track ? `/newsletter/${track.slug}` : record?.publicHref ?? `/newsletter/${normalizedSlug}`,
      sourceLabel: record?.sourceLabel ?? "newsletter_catalog",
      sourceDate: record?.sourceDate ?? "",
      sourceUrl: record?.sourceUrl ?? "",
      sourceTable: record?.sourceTable ?? "newsletter_catalog",
      sourceRowId: record?.sourceRowId ?? track?.slug ?? null,
      sourcePresent: Boolean(track),
      accessControl: resolveRecordAccessControl(family, record, track),
    });
  }

  const article = (await loadFamilySourceRow(family, normalizedSlug)) as LearnArticle | null;
  return buildAdminEditorRecord(family, article?.slug ?? normalizedSlug, article?.title ?? record?.title ?? "", null, article ? article.summary : "", buildLearnSections(article, family === "research-articles" ? "research-articles" : "learn"), record, {
    publicHref: article ? `/learn/${article.slug}` : record?.publicHref ?? `/learn/${normalizedSlug}`,
    sourceLabel: record?.sourceLabel ?? (family === "research-articles" ? "research_catalog" : "learn_catalog"),
    sourceDate: record?.sourceDate ?? "",
    sourceUrl: record?.sourceUrl ?? "",
    sourceTable: record?.sourceTable ?? (family === "research-articles" ? "research_catalog" : "learn_catalog"),
    sourceRowId: record?.sourceRowId ?? article?.slug ?? null,
    sourcePresent: Boolean(article),
    accessControl: resolveRecordAccessControl(family, record, article),
  });
}

async function buildAdminEditorRecord(
  family: AdminFamilyKey,
  slug: string,
  title: string,
  symbol: string | null,
  summary: string,
  sections: AdminSectionSeed[],
  record: AdminManagedRecord | null,
  meta: {
    publicHref: string | null;
    sourceLabel: string;
    sourceDate: string;
    sourceUrl: string;
    sourceTable: string | null;
    sourceRowId: string | null;
    sourcePresent: boolean;
    benchmarkMapping?: string | null;
    seoContext?: {
      price?: string | null;
      sector?: string | null;
      category?: string | null;
      benchmark?: string | null;
    };
    accessControl: AdminRecordAccessControl;
  },
): Promise<AdminEditorRecord> {
  const launchConfig = await getLaunchConfigStore();
  const refreshSection = buildRefreshSection(family, record, meta.sourceDate);
  const membershipTierOptions = getMembershipTierOptionList(await getAdminMembershipTiers());
  const assigneeOptions = await getAssigneeOptionList();
  const activeEditors = await listAdminEditorLocks(family, slug);
  const effectiveAccessControl = normalizeAccessControl(record?.accessControl ?? meta.accessControl);
  const sectionsWithWorkflow = injectWorkflowSection(sections, record, assigneeOptions);
  const sectionsWithLifecycle = injectPublishingLifecycleValues(sectionsWithWorkflow, record);
  const sectionsWithAccess = injectAccessSection(
    family,
    sectionsWithLifecycle,
    effectiveAccessControl,
    membershipTierOptions,
  );
  const generatedSeoDefaults = buildGeneratedSeoDefaults({
    family,
    slug,
    title,
    summary,
    symbol,
    publicHref: meta.publicHref,
    benchmarkMapping: meta.benchmarkMapping ?? record?.benchmarkMapping ?? null,
    launchConfig,
    seoContext: meta.seoContext,
  });
  const sectionsWithSeo = injectSeoSection(sectionsWithAccess, {
    title:
      pickFirstNonEmptySeoValue(record?.sections.seo?.values.metaTitle) ||
      generatedSeoDefaults.metaTitle,
    summary:
      pickFirstNonEmptySeoValue(record?.sections.seo?.values.metaDescription) ||
      generatedSeoDefaults.metaDescription,
    canonicalUrl:
      pickFirstNonEmptySeoValue(
        record?.sections.seo?.values.canonicalUrl,
        record?.canonicalRoute,
      ) || generatedSeoDefaults.canonicalUrl,
    ogImage:
      pickFirstNonEmptySeoValue(record?.sections.seo?.values.ogImage) ||
      generatedSeoDefaults.ogImage,
    noIndex: (record?.sections.seo?.values.noIndex ?? "no") === "yes",
  });
  const completeness = buildRowCompleteness({
    family,
    title,
    slug,
    summary,
    publicHref: meta.publicHref,
    symbol,
    benchmarkMapping: meta.benchmarkMapping ?? record?.benchmarkMapping ?? null,
    record,
  });
  const refreshHealth = record?.refreshState
    ? record.refreshState.refreshEnabled
      ? record.refreshState.latestStatus
      : "paused"
    : meta.sourcePresent
      ? meta.sourceDate
        ? "healthy"
        : "planned"
      : "not_applicable";
  const dependencyWarnings = buildDependencyWarnings({
    family,
    sourcePresent: meta.sourcePresent,
    benchmarkMapping: meta.benchmarkMapping ?? record?.benchmarkMapping ?? null,
    sourceLabel: meta.sourceLabel,
  });
  const contentHealth = buildContentHealth({
    completenessPercent: completeness.completenessPercent,
    sourcePresent: meta.sourcePresent,
    refreshHealth,
    record,
    dependencyWarnings,
  });

  return {
    id: record?.id ?? null,
    family,
    familyLabel: adminFamilyMeta[family].label,
    slug,
    title,
    symbol,
    publicHref: meta.publicHref,
    publishState: defaultPublishState(meta.sourcePresent, record),
    sourcePresent: meta.sourcePresent,
    sourceLabel: meta.sourceLabel,
    sourceDate: meta.sourceDate,
    sourceUrl: meta.sourceUrl,
    visibility: record?.visibility ?? (meta.sourcePresent ? "public" : "private"),
    canonicalRoute: record?.canonicalRoute ?? meta.publicHref,
    sourceTable: meta.sourceTable,
    sourceRowId: meta.sourceRowId,
    createdAt: record?.createdAt ?? null,
    updatedAt: record?.updatedAt ?? null,
    scheduledPublishAt: record?.scheduledPublishAt ?? null,
    scheduledUnpublishAt: record?.scheduledUnpublishAt ?? null,
    sourceState:
      record?.sourceState ?? {
        sourceLabel: meta.sourceLabel,
        sourceUrl: meta.sourceUrl,
        sourceDate: meta.sourceDate,
        lastRefreshAt: meta.sourceDate || null,
        lastSuccessfulRefreshAt: meta.sourceDate || null,
        nextScheduledRefreshAt: null,
        freshnessState: meta.sourcePresent ? deriveEditorFreshness(meta.sourceDate) : "manual_only",
        sourceStatus: meta.sourcePresent ? "ok" : "manual_only",
        importStatus: meta.sourcePresent ? "source_current" : "not_connected",
        readFailure: null,
        latestError: null,
      },
    refreshState:
      record?.refreshState ?? {
        laneKey: refreshSection.values.laneLabel?.toLowerCase().replaceAll(" ", "_") || "editorial_catalog",
        laneLabel: refreshSection.values.laneLabel ?? "Editorial catalog refresh",
        refreshEnabled: refreshSection.values.refreshEnabled === "yes",
        cadence: refreshSection.values.cadence ?? "Manual",
        lastRunAt: meta.sourceDate || null,
        lastSuccessAt: refreshSection.values.lastSuccessAt || null,
        lastFailureAt: refreshSection.values.lastFailureAt || null,
        latestStatus: (refreshSection.values.latestStatus as AdminEditorRecord["refreshState"]["latestStatus"]) ?? "planned",
        latestError: refreshSection.values.latestError || null,
        nextScheduledRunAt: refreshSection.values.nextScheduledRunAt || null,
        manualRunSupported: ["stocks", "mutual-funds", "indices"].includes(family),
        sourceDependency: refreshSection.values.sourceDependency ?? "Operator managed",
      },
    overrideActive: hasActiveOverride(record),
    publishEligible: Boolean(title.trim() && slug.trim()),
    revisionCount: 0,
    accessControl: effectiveAccessControl,
    contentHealth: {
      score: contentHealth.score,
      freshnessScore: contentHealth.freshnessScore,
      sourceCoverageScore: contentHealth.sourceCoverageScore,
      dependencyWarnings,
    },
    activeEditors: activeEditors.map((lock) => ({
      id: lock.id,
      editorEmail: lock.editorEmail,
      startedAt: lock.startedAt,
      lastHeartbeatAt: lock.lastHeartbeatAt,
      expiresAt: lock.expiresAt,
    })),
    assigneeOptions,
    membershipTierOptions,
    sections: [...sectionsWithSeo, refreshSection].map((section) =>
      buildSectionState({
        definition: normalizeSectionDefinition(section.definition),
        sourceValues: ensureValues(normalizeSectionDefinition(section.definition).fields, section.values),
        record,
        sourcePresent: meta.sourcePresent,
        lastSourceRefreshAt: meta.sourceDate || null,
        family,
      }),
    ),
  };
}
