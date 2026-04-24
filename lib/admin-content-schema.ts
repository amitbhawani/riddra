import type {
  AdminAccessMode,
  AdminManagedRecord,
  AdminMembershipTier,
  AdminRecordRefreshState,
  AdminRecordSourceState,
  AdminOverrideMode,
  AdminPublishState,
} from "@/lib/admin-operator-store";

export type AdminFamilyKey =
  | "stocks"
  | "mutual-funds"
  | "indices"
  | "etfs"
  | "ipos"
  | "pms"
  | "aif"
  | "sif"
  | "courses"
  | "webinars"
  | "learn"
  | "newsletter"
  | "research-articles";

export type AdminFieldDefinition = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "membership_tiers" | "checklist";
  placeholder?: string;
  rows?: number;
  options?: Array<{ label: string; value: string }>;
  sourceType?:
    | "identity"
    | "source"
    | "manual"
    | "hybrid"
    | "document"
    | "automation"
    | "computed";
  editable?: boolean;
  frontendVisible?: boolean;
  overrideCapable?: boolean;
  dataType?:
    | "string"
    | "multiline"
    | "enum"
    | "url"
    | "route"
    | "date"
    | "number_like";
  sectionGroup?: string;
  priority?: "critical" | "important" | "optional";
  readOnly?: boolean;
  adminOnly?: boolean;
  warningText?: string;
};

export type AdminSectionDefinition = {
  key: string;
  label: string;
  description: string;
  fields: AdminFieldDefinition[];
};

export type AdminFieldRegistryEntry = {
  id: string;
  family: AdminFamilyKey;
  sectionKey: string;
  sectionLabel: string;
  key: string;
  label: string;
  sourceType:
    | "identity"
    | "source"
    | "manual"
    | "hybrid"
    | "document"
    | "automation"
    | "computed";
  editable: boolean;
  frontendVisible: boolean;
  overrideCapable: boolean;
  dataType:
    | "string"
    | "multiline"
    | "enum"
    | "url"
    | "route"
    | "date"
    | "number_like";
  priority: "critical" | "important" | "optional";
  readOnly: boolean;
  adminOnly: boolean;
  warningText: string | null;
};

export type AdminSectionState = {
  definition: AdminSectionDefinition;
  fieldRegistry: AdminFieldRegistryEntry[];
  sourceValues: Record<string, string>;
  manualValues: Record<string, string>;
  effectiveValues: Record<string, string>;
  mode: AdminOverrideMode;
  lastSourceRefreshAt: string | null;
  lastManualEditAt: string | null;
  liveSource: "source" | "manual";
  conflictStatus:
    | "source_current"
    | "source_newer_than_manual"
    | "manual_overriding_source"
    | "temporary_override_pending_expiry"
    | "locked_manual_value"
    | "import_conflict_needs_review"
    | "not_connected";
  note: string;
  expiresAt: string | null;
};

export type AdminListRow = {
  family: AdminFamilyKey;
  familyLabel: string;
  slug: string;
  title: string;
  symbol: string | null;
  summary: string;
  publicHref: string | null;
  publishState: AdminPublishState;
  sourceState: "source_backed" | "manual_only" | "mixed_override";
  overrideIndicator: "none" | "manual" | "temporary" | "locked";
  importStatus:
    | "source_current"
    | "source_newer_than_manual"
    | "manual_overriding_source"
    | "temporary_override_pending_expiry"
    | "locked_manual_value"
    | "import_conflict_needs_review"
    | "not_connected";
  sourceFreshness: string | null;
  sourceLabel: string;
  refreshHealth:
    | "healthy"
    | "running"
    | "warning"
    | "failed"
    | "paused"
    | "planned"
    | "not_applicable";
  nextRefreshAt: string | null;
  lastUpdated: string;
  truthLabel: string;
  accessMode: AdminAccessMode;
  accessLabel: string;
  accessDetail: string | null;
  allowedMembershipTiers: string[];
  requireLogin: boolean;
  assignedTo: string | null;
  assignedBy: string | null;
  dueDate: string | null;
  contentHealthScore: number;
  freshnessScore: number;
  sourceCoverageScore: number;
  dependencyWarnings: string[];
  completenessPercent: number;
  completedFields: number;
  totalTrackedFields: number;
  missingCriticalCount: number;
  missingImportantCount: number;
  missingCriticalFields: string[];
  missingImportantFields: string[];
  needsReview: boolean;
  isStale: boolean;
  recentlyEdited: boolean;
  searchText: string;
};

export type AdminEditorRecord = {
  id: string | null;
  family: AdminFamilyKey;
  familyLabel: string;
  slug: string;
  title: string;
  symbol: string | null;
  publicHref: string | null;
  publishState: AdminPublishState;
  sourcePresent: boolean;
  sourceLabel: string;
  sourceDate: string;
  sourceUrl: string;
  visibility: "public" | "private" | "archived";
  canonicalRoute: string | null;
  sourceTable: string | null;
  sourceRowId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  scheduledPublishAt: string | null;
  scheduledUnpublishAt: string | null;
  sourceState: AdminRecordSourceState;
  refreshState: AdminRecordRefreshState;
  overrideActive: boolean;
  publishEligible: boolean;
  revisionCount: number;
  accessControl: {
    mode: AdminAccessMode;
    allowedMembershipTiers: string[];
    requireLogin: boolean;
    showTeaserPublicly: boolean;
    showLockedPreview: boolean;
    ctaLabel: string | null;
    ctaHref: string | null;
    internalNotes: string | null;
  };
  contentHealth: {
    score: number;
    freshnessScore: number;
    sourceCoverageScore: number;
    dependencyWarnings: string[];
  };
  activeEditors: Array<{
    id: string;
    editorEmail: string;
    startedAt: string;
    lastHeartbeatAt: string;
    expiresAt: string;
  }>;
  assigneeOptions: Array<{ label: string; value: string }>;
  membershipTierOptions: Array<{ label: string; value: string }>;
  sections: AdminSectionState[];
};

export type AdminCreateOption = {
  id: string;
  label: string;
  familyGroup: string;
  description: string;
  href: string;
  keywords?: string[];
};

export const adminPublishStateOptions: Array<{ label: string; value: AdminPublishState }> = [
  { label: "Draft", value: "draft" },
  { label: "Ready for review", value: "ready_for_review" },
  { label: "Needs fix", value: "needs_fix" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export const adminOverrideModeOptions: Array<{ label: string; value: AdminOverrideMode }> = [
  { label: "Auto source", value: "auto_source" },
  { label: "Manual override", value: "manual_override" },
  { label: "Manual until next refresh", value: "manual_until_next_refresh" },
  { label: "Manual permanent lock", value: "manual_permanent_lock" },
];

export const adminAccessModeOptions: Array<{ label: string; value: AdminAccessMode }> = [
  { label: "Public / free", value: "public_free" },
  { label: "Logged-in free member", value: "logged_in_free_member" },
  { label: "Specific membership tier(s)", value: "membership_tiers" },
  { label: "Hidden / draft / internal", value: "hidden_internal" },
  { label: "Coming soon / registration required", value: "coming_soon_registration_required" },
  { label: "Purchased / enrolled access", value: "purchased_enrolled" },
];

export const adminFamilyMeta: Record<
  AdminFamilyKey,
  {
    label: string;
    singular: string;
    routeBase: string;
    description: string;
    createGroup: "Markets and products" | "Education and editorial";
  }
> = {
  stocks: {
    label: "Stocks",
    singular: "Stock",
    routeBase: "/stocks",
    description: "Canonical stock pages with editable identity, source metadata, quick stats, fundamentals, ownership, and public support fields.",
    createGroup: "Markets and products",
  },
  "mutual-funds": {
    label: "Mutual funds",
    singular: "Mutual fund",
    routeBase: "/mutual-funds",
    description: "Fund pages with category, benchmark, manager, holdings, allocation, factsheet, and frontend support fields.",
    createGroup: "Markets and products",
  },
  indices: {
    label: "Indices",
    singular: "Index",
    routeBase: "/",
    description: "Tracked index pages with composition, benchmark mapping, narrative, and operator-controlled route posture.",
    createGroup: "Markets and products",
  },
  etfs: {
    label: "ETFs",
    singular: "ETF",
    routeBase: "/etfs",
    description: "Passive and thematic ETF product pages with benchmark, structure, and portfolio-role fields.",
    createGroup: "Markets and products",
  },
  ipos: {
    label: "IPOs",
    singular: "IPO",
    routeBase: "/ipo",
    description: "IPO lifecycle pages with issue details, key risks, strengths, objectives, and document support fields.",
    createGroup: "Markets and products",
  },
  pms: {
    label: "PMS",
    singular: "PMS product",
    routeBase: "/pms",
    description: "Portfolio management service pages with strategy, suitability, and due-diligence context.",
    createGroup: "Markets and products",
  },
  aif: {
    label: "AIF",
    singular: "AIF product",
    routeBase: "/aif",
    description: "Alternative investment fund pages with manager, category, fit, and diligence context.",
    createGroup: "Markets and products",
  },
  sif: {
    label: "SIF",
    singular: "SIF product",
    routeBase: "/sif",
    description: "Structured investment fund pages with new-category positioning and product context.",
    createGroup: "Markets and products",
  },
  courses: {
    label: "Courses",
    singular: "Course",
    routeBase: "/courses",
    description: "Structured learning pages with outcomes, modules, lesson plans, and route links.",
    createGroup: "Education and editorial",
  },
  webinars: {
    label: "Webinars",
    singular: "Webinar",
    routeBase: "/webinars",
    description: "Webinar records with live/replay setup, registration flow, agenda, assets, and follow-up routes.",
    createGroup: "Education and editorial",
  },
  learn: {
    label: "Learn",
    singular: "Learn article",
    routeBase: "/learn",
    description: "Learning articles with category, summary, key takeaways, and public route support.",
    createGroup: "Education and editorial",
  },
  newsletter: {
    label: "Newsletter",
    singular: "Newsletter item",
    routeBase: "/newsletter",
    description: "Newsletter tracks with cadence, audience, sections, and linked-surface management.",
    createGroup: "Education and editorial",
  },
  "research-articles": {
    label: "Research / articles",
    singular: "Research article",
    routeBase: "/learn",
    description: "Research-style learning articles managed through the same public article system.",
    createGroup: "Education and editorial",
  },
};

export type AdminSectionSeed = {
  definition: {
    key: string;
    label: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      type: string;
      placeholder?: string;
      rows?: number;
      options?: Array<{ label: string; value: string }>;
      priority?: "critical" | "important" | "optional";
    }>;
  };
  values: Record<string, string | null | undefined>;
};

export function getMembershipTierOptionList(
  tiers: AdminMembershipTier[],
): Array<{ label: string; value: string }> {
  return tiers
    .filter((tier) => tier.status !== "archived")
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((tier) => ({
      label: tier.name,
      value: tier.slug,
    }));
}

export type { AdminManagedRecord };
