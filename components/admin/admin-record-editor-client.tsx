"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { formatAdminDateTime, formatAdminSavedState } from "@/lib/admin-time";
import type { AdminPendingApproval } from "@/lib/admin-approvals";
import {
  type AdminEditorRecord,
  type AdminFamilyKey,
  type AdminFieldDefinition,
  adminOverrideModeOptions,
} from "@/lib/admin-content-schema";
import type {
  AdminManagedDocument,
  AdminManagedImportItem,
  AdminOverrideMode,
  AdminPublishState,
  AdminRecordRevision,
} from "@/lib/admin-operator-store";
import type { CmsPreviewSession, CmsRecordVersion, MediaAsset } from "@/lib/user-product-store";
import {
  advancedSectionKeys,
  getSectionOrderForFamily,
  getSectionPresentation,
} from "@/lib/admin-record-presentation";
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";
import {
  AdminStockImportTabs,
  stockImportEditorTabs,
  type StockImportEditorTabKey,
} from "@/components/admin/admin-stock-import-tabs";
import { getInternalLinkProps } from "@/lib/link-utils";
import type { AdminStockImportDetails } from "@/lib/admin-stock-import-dashboard";

type EditorSectionState = {
  key: string;
  label: string;
  description: string;
  fields: AdminFieldDefinition[];
  fieldRegistry: AdminEditorRecord["sections"][number]["fieldRegistry"];
  sourceValues: Record<string, string>;
  manualValues: Record<string, string>;
  mode: AdminOverrideMode;
  note: string;
  expiresAt: string | null;
  lastSourceRefreshAt: string | null;
  lastManualEditAt: string | null;
  conflictStatus: AdminEditorRecord["sections"][number]["conflictStatus"];
};

type OverrideRow = {
  sectionKey: string;
  sectionLabel: string;
  field: AdminFieldDefinition;
  sourceValue: string;
  manualValue: string;
  effectiveValue: string;
  mode: AdminOverrideMode;
  lastSourceRefreshAt: string | null;
  lastManualEditAt: string | null;
  conflictStatus: EditorSectionState["conflictStatus"];
  liveSource: "source" | "manual";
};

type StructuredColumn = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "select";
  options?: Array<{ label: string; value: string }>;
};

type StructuredFieldConfig = {
  columns: StructuredColumn[];
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
};

type NewRecordSupport = {
  singularLabel: string;
  importHref?: string | null;
  templateHref?: string | null;
  helpHref?: string | null;
};

type ComparisonRow = {
  id: string;
  groupLabel: string;
  fieldLabel: string;
  displayLabel: string;
  currentValue: string;
  previousValue: string;
};

type ComputedEditorSection = EditorSectionState & {
  effectiveValues: Record<string, string>;
  liveSource: "source" | "manual";
  completeness: ReturnType<typeof buildCompletenessSummary>;
};

function computeEffectiveValues(
  sourceValues: Record<string, string>,
  manualValues: Record<string, string>,
  mode: AdminOverrideMode,
  lastSourceRefreshAt: string | null,
  lastManualEditAt: string | null,
) {
  if (
    mode === "manual_until_next_refresh" &&
    lastSourceRefreshAt &&
    lastManualEditAt &&
    new Date(lastSourceRefreshAt) > new Date(lastManualEditAt)
  ) {
    return { values: sourceValues, liveSource: "source" as const };
  }

  if (mode === "auto_source") {
    return { values: sourceValues, liveSource: "source" as const };
  }

  return {
    values: Object.keys(sourceValues).length ? { ...sourceValues, ...manualValues } : manualValues,
    liveSource: "manual" as const,
  };
}

function parseDocuments(text: string): AdminManagedDocument[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, href, sourceLabel = "", sourceDate = ""] = line
        .split("|")
        .map((item) => item.trim());
      return {
        id: `editor-document-${index + 1}`,
        label,
        href,
        sourceLabel,
        sourceDate,
        enabled: true,
      };
    })
    .filter((item) => item.label || item.href);
}

function parseDelimitedValues(text: string) {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatAssetCategory(value: string | null | undefined) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return "general";
  }

  return cleaned.replace(/[_-]+/g, " ");
}

function getStatusTone(status: AdminPublishState) {
  if (status === "published") return "success" as const;
  if (status === "ready_for_review") return "warning" as const;
  if (status === "needs_fix") return "danger" as const;
  return "default" as const;
}

function formatWorkflowStatus(status: AdminPublishState) {
  return status.replaceAll("_", " ");
}

function getOverrideTone(mode: AdminOverrideMode) {
  if (mode === "manual_permanent_lock") return "danger" as const;
  if (mode === "manual_until_next_refresh") return "warning" as const;
  if (mode === "manual_override") return "warning" as const;
  return "info" as const;
}

function getOverrideLabel(mode: AdminOverrideMode) {
  if (mode === "manual_permanent_lock") return "Locked";
  if (mode === "manual_until_next_refresh") return "Temp";
  if (mode === "manual_override") return "Manual";
  return "Auto";
}

function getVisibleFieldValue(
  sourceValues: Record<string, string>,
  manualValues: Record<string, string>,
  effectiveValues: Record<string, string>,
  fieldKey: string,
) {
  if (Object.prototype.hasOwnProperty.call(manualValues, fieldKey)) {
    return manualValues[fieldKey] ?? "";
  }

  return effectiveValues[fieldKey] ?? sourceValues[fieldKey] ?? "";
}

function formatTimelineDate(value: string | null | undefined) {
  return formatAdminDateTime(value, "Not scheduled");
}

function shouldTrackFieldForCompleteness(field: AdminFieldDefinition) {
  return !field.readOnly && !field.adminOnly && field.editable !== false;
}

function hasFieldValue(value: string | null | undefined) {
  return Boolean(String(value ?? "").trim());
}

function buildCompletenessSummary(
  fields: AdminFieldDefinition[],
  values: Record<string, string>,
  sectionLabel?: string,
) {
  const workflowTrackingActive =
    !["published", "archived"].includes(String(values.publishState ?? "").trim().toLowerCase());
  const trackedFields = fields.filter((field) => {
    if (!shouldTrackFieldForCompleteness(field)) {
      return false;
    }

    if (!workflowTrackingActive && (field.key === "assignedTo" || field.key === "dueDate")) {
      return false;
    }

    return true;
  });
  const filledCount = trackedFields.filter((field) => hasFieldValue(values[field.key])).length;
  const missingCritical = trackedFields
    .filter((field) => field.priority === "critical" && !hasFieldValue(values[field.key]))
    .map((field) => (sectionLabel ? `${sectionLabel} · ${field.label}` : field.label));
  const missingImportant = trackedFields
    .filter((field) => field.priority === "important" && !hasFieldValue(values[field.key]))
    .map((field) => (sectionLabel ? `${sectionLabel} · ${field.label}` : field.label));

  return {
    filledCount,
    totalCount: trackedFields.length,
    percent: trackedFields.length ? Math.round((filledCount / trackedFields.length) * 100) : 100,
    missingCritical,
    missingImportant,
  };
}

function formatRemainingTime(value: string | null | undefined) {
  if (!value) {
    return "No active preview";
  }

  const remainingMs = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return "Expired";
  }

  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (remainingHours >= 24) {
    const remainingDays = Math.ceil(remainingHours / 24);
    return `Expires in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`;
  }

  if (remainingHours > 0) {
    return `Expires in ${remainingHours}h ${remainingMinutes}m`;
  }

  return `Expires in ${Math.max(remainingMinutes, 1)}m`;
}

function applyPendingApprovalToSections(
  sections: AdminEditorRecord["sections"],
  pendingApproval?: AdminPendingApproval | null,
) {
  if (!pendingApproval?.snapshot?.sections) {
    return sections.map((section) => ({
      key: section.definition.key,
      label: section.definition.label,
      description: section.definition.description,
      fields: section.definition.fields,
      fieldRegistry: section.fieldRegistry,
      sourceValues: section.sourceValues,
      manualValues: section.manualValues,
      mode: section.mode,
      note: section.note,
      expiresAt: section.expiresAt,
      lastSourceRefreshAt: section.lastSourceRefreshAt,
      lastManualEditAt: section.lastManualEditAt,
      conflictStatus: section.conflictStatus,
    }));
  }

  return sections.map((section) => {
    const queuedSection = pendingApproval.snapshot.sections?.[section.definition.key];
    return {
      key: section.definition.key,
      label: section.definition.label,
      description: section.definition.description,
      fields: section.definition.fields,
      fieldRegistry: section.fieldRegistry,
      sourceValues: section.sourceValues,
      manualValues: queuedSection?.values
        ? { ...section.manualValues, ...queuedSection.values }
        : section.manualValues,
      mode: queuedSection?.mode ?? section.mode,
      note: queuedSection?.note ?? section.note,
      expiresAt: queuedSection?.expiresAt ?? section.expiresAt,
      lastSourceRefreshAt: section.lastSourceRefreshAt,
      lastManualEditAt:
        queuedSection?.lastManualEditAt ?? pendingApproval.updatedAt ?? section.lastManualEditAt,
      conflictStatus: section.conflictStatus,
    };
  });
}

function parseStructuredRows(value: string, width: number) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((item) => item.trim());
      return Array.from({ length: width }, (_, index) => parts[index] ?? "");
    });
}

function stringifyStructuredRows(rows: string[][]) {
  return rows
    .map((row) => row.map((item) => item.trim()))
    .map((row) => {
      let lastMeaningfulIndex = -1;
      row.forEach((item, index) => {
        if (item) {
          lastMeaningfulIndex = index;
        }
      });
      return lastMeaningfulIndex >= 0 ? row.slice(0, lastMeaningfulIndex + 1) : [];
    })
    .filter((row) => row.length)
    .map((row) => row.join(" | "))
    .join("\n");
}

function updateStructuredRows(
  value: string,
  width: number,
  updater: (rows: string[][]) => string[][],
) {
  const rows = parseStructuredRows(value, width);
  return stringifyStructuredRows(updater(rows));
}

function getStructuredFieldConfig(fieldKey: string): StructuredFieldConfig | null {
  if (fieldKey === "bodyBlocksText" || fieldKey === "issueBodyBlocksText") {
    return {
      columns: [
        {
          key: "type",
          label: "Block type",
          type: "select",
          options: [
            { label: "Heading", value: "heading" },
            { label: "Paragraph", value: "paragraph" },
            { label: "Embed", value: "embed" },
            { label: "Callout", value: "callout" },
          ],
        },
        { key: "content", label: "Content", type: "textarea", placeholder: "Write the visible content here" },
        { key: "note", label: "Embed URL or note", placeholder: "Optional URL, label, or internal note" },
      ],
      addLabel: "Add content block",
      emptyTitle: "No content blocks yet",
      emptyDescription: "Add headings, paragraphs, embeds, and callouts in the order they should appear.",
    };
  }

  if (fieldKey === "modulesText") {
    return {
      columns: [{ key: "module", label: "Module title", placeholder: "Module name" }],
      addLabel: "Add module",
      emptyTitle: "No modules yet",
      emptyDescription: "Create the course modules in the order learners should see them.",
    };
  }

  if (fieldKey === "lessonPlanText") {
    return {
      columns: [
        { key: "title", label: "Lesson title", placeholder: "Lesson title" },
        { key: "format", label: "Format", placeholder: "Video, worksheet, live session" },
        { key: "duration", label: "Duration", placeholder: "12 min" },
        { key: "outcome", label: "Outcome", placeholder: "What the learner gets from it" },
      ],
      addLabel: "Add lesson",
      emptyTitle: "No lessons yet",
      emptyDescription: "Build the lesson plan inline, then drag the order with the move controls.",
    };
  }

  if (fieldKey === "lessonContentBlocksText") {
    return {
      columns: [
        { key: "lesson", label: "Lesson", placeholder: "Lesson slug or title" },
        {
          key: "type",
          label: "Block type",
          type: "select",
          options: [
            { label: "Paragraph", value: "paragraph" },
            { label: "Heading", value: "heading" },
            { label: "Embed", value: "embed" },
            { label: "Callout", value: "callout" },
            { label: "Download", value: "download" },
            { label: "External link", value: "external_link" },
          ],
        },
        { key: "content", label: "Content", type: "textarea", placeholder: "Visible content or embed URL" },
        { key: "note", label: "Note", placeholder: "Optional note or label" },
      ],
      addLabel: "Add lesson block",
      emptyTitle: "No lesson blocks yet",
      emptyDescription: "Use inline rows to shape lessons without editing a raw pipe-delimited textarea.",
    };
  }

  if (fieldKey === "sectionsText") {
    return {
      columns: [{ key: "section", label: "Issue section", placeholder: "Market setup" }],
      addLabel: "Add issue section",
      emptyTitle: "No issue sections yet",
      emptyDescription: "Add the newsletter sections in publishing order.",
    };
  }

  if (fieldKey === "agendaText") {
    return {
      columns: [{ key: "agenda", label: "Agenda item", placeholder: "What this webinar will cover" }],
      addLabel: "Add agenda item",
      emptyTitle: "No agenda items yet",
      emptyDescription: "Break the webinar into simple agenda points the user can scan quickly.",
    };
  }

  return null;
}

function getSectionFieldGroups(
  family: AdminFamilyKey,
  sectionKey: string,
  fields: AdminFieldDefinition[],
) {
  const configByFamilySection: Record<string, { essential: string[]; advanced?: string[] }> = {
    "stocks:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "stocks:market_snapshot": {
      essential: [
        "currentPrice",
        "dayChange",
        "snapshotAsOf",
        "marketCap",
        "week52High",
        "week52Low",
        "peRatio",
        "pbRatio",
      ],
      advanced: ["roe", "roce", "dividendYield", "debtEquity"],
    },
    "stocks:financial_metrics": {
      essential: ["revenueGrowth", "profitGrowth", "operatingMargin", "eps"],
      advanced: ["ebitdaMargin", "freeCashFlow", "netDebtToEbitda", "bookValue"],
    },
    "stocks:ownership_metrics": {
      essential: ["promoterHolding", "fiiHolding", "diiHolding", "publicHolding"],
    },
    "stocks:frontend_fields": {
      essential: [
        "summary",
        "thesis",
        "keyPointsText",
        "momentumLabel",
        "newsReadinessNote",
        "newsItemsText",
        "faqText",
      ],
      advanced: ["peerConfigText", "manualNotes"],
    },
    "mutual-funds:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "indices:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "etfs:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "ipos:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "pms:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "aif:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "sif:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "courses:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "webinars:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "learn:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "newsletter:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "research-articles:workflow": {
      essential: ["publishState", "assignedTo", "dueDate"],
      advanced: ["assignedBy"],
    },
    "learn:frontend_fields": {
      essential: ["summary", "bodyBlocksText", "keyTakeawaysText", "featuredLinksText"],
      advanced: ["body", "relatedRoutesText", "archiveNavigationText", "manualNotes"],
    },
    "research-articles:frontend_fields": {
      essential: ["summary", "bodyBlocksText", "keyTakeawaysText", "featuredLinksText"],
      advanced: ["body", "relatedRoutesText", "archiveNavigationText", "manualNotes"],
    },
    "newsletter:frontend_fields": {
      essential: ["summary", "objective", "sectionsText", "issueBodyBlocksText", "featuredLinksText"],
      advanced: ["archiveNavigationText", "linkedSurfacesText", "internalEditorialNote"],
    },
    "courses:identity": {
      essential: ["title", "slug", "subtitle", "shortDescription", "coverImage", "instructor", "category", "level"],
      advanced: ["fullDescription"],
    },
    "courses:structure": {
      essential: ["duration", "difficulty", "modulesText", "lessonPlanText", "outcomesText"],
      advanced: [
        "categoryTags",
        "format",
        "audience",
        "bundleFit",
        "priceAnchor",
        "lessonOrderingNote",
        "prerequisitesText",
        "deliverablesText",
      ],
    },
    "courses:lesson_content": {
      essential: [
        "lessonContentBlocksText",
        "youtubeEmbedUrl",
        "videoTitle",
        "resourceLinksText",
        "calloutNote",
        "previewLesson",
      ],
      advanced: ["externalLinksText", "quizPlaceholderFlag"],
    },
    "webinars:identity": {
      essential: ["title", "slug", "subtitle", "summary", "coverImage", "speakerHost"],
      advanced: ["format", "audience"],
    },
    "webinars:schedule_event": {
      essential: ["liveDateTime", "timezone", "eventStatus", "registrationStatus", "replayAvailable"],
      advanced: ["duration", "cadence", "nextSession", "formatStatus"],
    },
    "webinars:frontend_fields": {
      essential: [
        "description",
        "agendaText",
        "registrationLink",
        "replayLink",
        "youtubeReplayUrl",
        "replayPlan",
        "resourcesText",
      ],
      advanced: [
        "registrationMode",
        "registrationStepsText",
        "replayAssetsText",
        "outcomesText",
        "followUpRoutesText",
        "relatedCoursesText",
        "relatedLearnText",
        "relatedMarketRoutesText",
      ],
    },
  };

  const config = configByFamilySection[`${family}:${sectionKey}`];
  if (!config) {
    return {
      essentialFields: fields,
      advancedFields: [] as AdminFieldDefinition[],
    };
  }

  const byKey = new Map(fields.map((field) => [field.key, field]));
  const essentialFields = config.essential.map((key) => byKey.get(key)).filter(Boolean) as AdminFieldDefinition[];
  const advancedFields = (config.advanced ?? [])
    .map((key) => byKey.get(key))
    .filter(Boolean) as AdminFieldDefinition[];

  const assigned = new Set([...essentialFields, ...advancedFields].map((field) => field.key));
  const leftovers = fields.filter((field) => !assigned.has(field.key));

  return {
    essentialFields: [...essentialFields, ...leftovers],
    advancedFields,
  };
}

function buildComparisonFieldLookup(
  sections: Array<{
    key: string;
    label: string;
    fields: AdminFieldDefinition[];
  }>,
) {
  const lookup = new Map<string, { groupLabel: string; fieldLabel: string; displayLabel: string }>();

  sections.forEach((section) => {
    section.fields.forEach((field) => {
      const groupLabel = section.label;
      const fieldLabel = field.label;
      lookup.set(`${section.key}.${field.key}`, {
        groupLabel,
        fieldLabel,
        displayLabel: `${groupLabel} · ${fieldLabel}`,
      });
    });
  });

  return lookup;
}

function getPayloadComparisonRows(
  currentPayload: ReturnType<typeof buildComparablePayload>,
  previousPayload: ReturnType<typeof buildComparablePayload> | null,
  fieldLookup: Map<string, { groupLabel: string; fieldLabel: string; displayLabel: string }>,
) {
  if (!previousPayload) {
    return [];
  }

  const rows: ComparisonRow[] = [];

  const topLevelFields: Array<[string, string, string]> = [
    ["Title", currentPayload.title, previousPayload.title],
    ["Slug", currentPayload.slug, previousPayload.slug],
    ["Publish state", currentPayload.status, previousPayload.status],
    ["Assigned to", currentPayload.assignedTo ?? "", previousPayload.assignedTo ?? ""],
    ["Assigned by", currentPayload.assignedBy ?? "", previousPayload.assignedBy ?? ""],
    ["Due date", currentPayload.dueDate ?? "", previousPayload.dueDate ?? ""],
    ["Public route", currentPayload.publicHref ?? "", previousPayload.publicHref ?? ""],
    ["Scheduled publish", currentPayload.scheduledPublishAt ?? "", previousPayload.scheduledPublishAt ?? ""],
    ["Scheduled unpublish", currentPayload.scheduledUnpublishAt ?? "", previousPayload.scheduledUnpublishAt ?? ""],
  ];

  topLevelFields.forEach(([field, currentValue, previousValue]) => {
    if (currentValue !== previousValue) {
      rows.push({
        id: `record.${field}`,
        groupLabel: "Record",
        fieldLabel: field,
        displayLabel: field,
        currentValue,
        previousValue,
      });
    }
  });

  const sectionKeys = new Set([
    ...Object.keys(currentPayload.sections ?? {}),
    ...Object.keys(previousPayload.sections ?? {}),
  ]);

  sectionKeys.forEach((sectionKey) => {
    const currentValues = currentPayload.sections[sectionKey]?.values ?? {};
    const previousValues = previousPayload.sections[sectionKey]?.values ?? {};
    const fieldKeys = new Set([...Object.keys(currentValues), ...Object.keys(previousValues)]);

    fieldKeys.forEach((fieldKey) => {
      const currentValue = currentValues[fieldKey] ?? "";
      const previousValue = previousValues[fieldKey] ?? "";

      if (currentValue !== previousValue) {
        const descriptor = fieldLookup.get(`${sectionKey}.${fieldKey}`);
        rows.push({
          id: `${sectionKey}.${fieldKey}`,
          groupLabel: descriptor?.groupLabel ?? sectionKey.replace(/_/g, " "),
          fieldLabel: descriptor?.fieldLabel ?? fieldKey,
          displayLabel:
            descriptor?.displayLabel ?? `${sectionKey.replace(/_/g, " ")} · ${fieldKey}`,
          currentValue,
          previousValue,
        });
      }
    });
  });

  return rows;
}

function buildComparablePayload(payload: {
  title: string;
  slug: string;
  status: AdminPublishState;
  assignedTo?: string | null;
  assignedBy?: string | null;
  dueDate?: string | null;
  publicHref?: string | null;
  scheduledPublishAt?: string | null;
  scheduledUnpublishAt?: string | null;
  sections: Record<string, { values: Record<string, string> }>;
}) {
  return {
    title: payload.title,
    slug: payload.slug,
    status: payload.status,
    assignedTo: payload.assignedTo ?? "",
    assignedBy: payload.assignedBy ?? "",
    dueDate: payload.dueDate ?? "",
    publicHref: payload.publicHref ?? "",
    scheduledPublishAt: payload.scheduledPublishAt ?? "",
    scheduledUnpublishAt: payload.scheduledUnpublishAt ?? "",
    sections: payload.sections,
  };
}

function isMediaCapableField(field: AdminFieldDefinition) {
  const key = field.key.toLowerCase();
  const placeholder = String(field.placeholder ?? "").toLowerCase();

  return (
    key.includes("image") ||
    key.includes("thumbnail") ||
    key.includes("cover") ||
    placeholder.includes(".jpg") ||
    placeholder.includes(".jpeg") ||
    placeholder.includes(".png") ||
    placeholder.includes(".webp") ||
    placeholder.includes("image")
  );
}

function isDocumentAsset(asset: MediaAsset) {
  return asset.assetType === "document";
}

function sortSectionsForFamily(
  family: AdminFamilyKey,
  sections: ComputedEditorSection[],
) {
  const order = getSectionOrderForFamily(family);
  const ranks = new Map(order.map((key, index) => [key, index]));

  return [...sections].sort((left, right) => {
    const leftRank = ranks.get(left.key) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = ranks.get(right.key) ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.label.localeCompare(right.label);
  });
}

export function AdminRecordEditorClient({
  record,
  importHistory,
  revisions,
  versions,
  mediaAssets,
  activePreview,
  pendingApproval,
  stockImportInsights,
  currentUserEmail = "",
  permissions,
  isNew,
  creationSupport,
}: {
  record: AdminEditorRecord;
  importHistory: AdminManagedImportItem[];
  revisions: AdminRecordRevision[];
  versions: CmsRecordVersion[];
  mediaAssets: MediaAsset[];
  activePreview?: CmsPreviewSession | null;
  pendingApproval?: AdminPendingApproval | null;
  stockImportInsights?: AdminStockImportDetails | null;
  currentUserEmail?: string;
  permissions?: {
    canPublishContent: boolean;
    isAdmin: boolean;
  };
  isNew?: boolean;
  creationSupport?: NewRecordSupport;
}) {
  const router = useRouter();
  const canPublishContent = permissions?.canPublishContent ?? true;
  const isAdmin = permissions?.isAdmin ?? true;
  const [status, setStatus] = useState<AdminPublishState>(
    pendingApproval?.snapshot?.status ?? record.publishState,
  );
  const [sections, setSections] = useState<EditorSectionState[]>(
    applyPendingApprovalToSections(record.sections, pendingApproval),
  );
  const [banner, setBanner] = useState<
    { tone: "success" | "danger"; text: string; label?: string; detail?: string } | null
  >(null);
  const [latestPreview, setLatestPreview] = useState<CmsPreviewSession | null>(activePreview ?? null);
  const [latestPendingApproval, setLatestPendingApproval] = useState<AdminPendingApproval | null>(
    pendingApproval ?? null,
  );
  const [availableMediaAssets, setAvailableMediaAssets] = useState(mediaAssets);
  const [activeEditors, setActiveEditors] = useState(record.activeEditors);
  const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState(record.updatedAt ?? null);
  const [autoSaveMessage, setAutoSaveMessage] = useState<string>("Autosave runs every minute while you edit.");
  const [activeStockTab, setActiveStockTab] = useState<StockImportEditorTabKey>("basic_info");
  const [isPending, startTransition] = useTransition();
  const lastPersistedDraftSignatureRef = useRef<string | null>(null);
  const autoSaveIntervalRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const isStockEditor = record.family === "stocks";

  useEffect(() => {
    setLatestPreview(activePreview ?? null);
  }, [activePreview]);

  useEffect(() => {
    setLatestPendingApproval(pendingApproval ?? null);
    setStatus(pendingApproval?.snapshot?.status ?? record.publishState);
    setSections(applyPendingApprovalToSections(record.sections, pendingApproval));
  }, [pendingApproval, record.publishState, record.sections]);

  useEffect(() => {
    setActiveEditors(record.activeEditors);
  }, [record.activeEditors]);

  useEffect(() => {
    setActiveStockTab("basic_info");
  }, [record.id]);

  useEffect(() => {
    setAvailableMediaAssets(mediaAssets);
  }, [mediaAssets]);

  useEffect(() => {
    if (!currentUserEmail) {
      return;
    }

    let cancelled = false;

    async function syncLock(action: "heartbeat" | "release" = "heartbeat") {
      try {
        const response = await fetch("/api/admin/operator-console/editor-locks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            family: record.family,
            slug: record.slug,
          }),
          keepalive: action === "release",
        });
        const data = (await response.json().catch(() => null)) as
          | {
              locks?: AdminEditorRecord["activeEditors"];
            }
          | null;

        if (!cancelled && Array.isArray(data?.locks)) {
          setActiveEditors(data.locks);
        }
      } catch {
        // Keep editor access safe even if lock heartbeat fails.
      }
    }

    void syncLock();
    const intervalId = window.setInterval(() => {
      void syncLock();
    }, 30_000);

    const handleBeforeUnload = () => {
      void syncLock("release");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void syncLock("release");
    };
  }, [currentUserEmail, record.family, record.slug]);

  const documents = useMemo(() => {
    const documentSection = sections.find((section) => section.key === "documents_links");
    return parseDocuments(
      documentSection?.manualValues.documentLinksText ??
        documentSection?.sourceValues.documentLinksText ??
        "",
    );
  }, [sections]);

  const overrideActive = sections.some((section) => section.mode !== "auto_source");
  const lastUpdated = revisions[0]?.editedAt ?? record.sourceDate ?? "Awaiting first operator save";

  const computedSections = useMemo(
    () =>
      sections.map((section) => {
        const effective = computeEffectiveValues(
          section.sourceValues,
          section.manualValues,
          section.mode,
          section.lastSourceRefreshAt,
          section.lastManualEditAt,
        );

        return {
          ...section,
          effectiveValues: effective.values,
          liveSource: effective.liveSource,
          completeness: buildCompletenessSummary(section.fields, effective.values, section.label),
        };
      }),
    [sections],
  );

  const overrides = useMemo<OverrideRow[]>(
    () =>
      computedSections
        .filter((section) => !["imports_history", "revision_history"].includes(section.key))
        .flatMap((section) =>
          section.fields
            .filter((field) => {
              const fieldMeta = section.fieldRegistry.find((item) => item.key === field.key);
              return !(section.key === "publishing" && field.key === "publishState") && fieldMeta?.overrideCapable !== false;
            })
            .map((field) => ({
              sectionKey: section.key,
              sectionLabel: section.label,
              field,
              sourceValue: section.sourceValues[field.key] ?? "",
              manualValue: section.manualValues[field.key] ?? "",
              effectiveValue: section.effectiveValues[field.key] ?? "",
              mode: section.mode,
              lastSourceRefreshAt: section.lastSourceRefreshAt,
              lastManualEditAt: section.lastManualEditAt,
              conflictStatus: section.conflictStatus,
              liveSource: section.liveSource,
            })),
        ),
    [computedSections],
  );

  const sectionsByKey = Object.fromEntries(computedSections.map((section) => [section.key, section])) as Record<
    string,
    (typeof computedSections)[number] | undefined
  >;
  const orderedSections = useMemo(
    () => sortSectionsForFamily(record.family, computedSections),
    [computedSections, record.family],
  );
  const overallCompleteness = useMemo(() => {
    const trackedSections = computedSections.filter((section) => section.key !== "documents_links");
    const filledCount = trackedSections.reduce((sum, section) => sum + section.completeness.filledCount, 0);
    const totalCount = trackedSections.reduce((sum, section) => sum + section.completeness.totalCount, 0);
    const missingCritical = trackedSections.flatMap((section) => section.completeness.missingCritical);
    const missingImportant = trackedSections.flatMap((section) => section.completeness.missingImportant);

    return {
      filledCount,
      totalCount,
      percent: totalCount ? Math.round((filledCount / totalCount) * 100) : 100,
      missingCritical,
      missingImportant,
    };
  }, [computedSections]);
  const mainSections = orderedSections.filter(
    (section) =>
      !["documents_links", "imports_history", "revision_history"].includes(section.key) &&
      !advancedSectionKeys.has(section.key),
  );
  const documentsSection = sectionsByKey.documents_links;
  const advancedSections = orderedSections.filter((section) => advancedSectionKeys.has(section.key));
  const identitySection = sectionsByKey.identity;
  const publishingSection = sectionsByKey.publishing;
  const sourceSection = sectionsByKey.data_sources;
  const refreshSection = sectionsByKey.refresh_automation;
  const accessSection = sectionsByKey.access_control;
  const workflowSection = sectionsByKey.workflow;
  const currentSlug =
    identitySection?.manualValues.slug || identitySection?.sourceValues.slug || record.slug;
  const currentTitle =
    identitySection?.manualValues.companyName ||
    identitySection?.manualValues.fundName ||
    identitySection?.manualValues.name ||
    identitySection?.manualValues.title ||
    identitySection?.sourceValues.companyName ||
    identitySection?.sourceValues.fundName ||
    identitySection?.sourceValues.name ||
    identitySection?.sourceValues.title ||
    record.title;
  const currentPublicRoute =
    publishingSection?.manualValues.publicRoute ||
    publishingSection?.sourceValues.publicRoute ||
    record.publicHref ||
    "";
  const lastEditedRevision = revisions[0] ?? null;
  const loadedRecordSnapshotRef = useRef<{
    slug: string;
    title: string;
    publicRoute: string;
    symbol: string;
  } | null>(null);
  if (!loadedRecordSnapshotRef.current) {
    loadedRecordSnapshotRef.current = {
      slug: currentSlug,
      title: currentTitle,
      publicRoute: currentPublicRoute,
      symbol: record.symbol || "",
    };
  }
  const latestVersion = versions[0] ?? null;
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(latestVersion?.id ?? null);
  const scheduledPublishAt =
    publishingSection?.manualValues.scheduledPublishAt ||
    publishingSection?.sourceValues.scheduledPublishAt ||
    record.scheduledPublishAt ||
    null;
  const scheduledUnpublishAt =
    publishingSection?.manualValues.scheduledUnpublishAt ||
    publishingSection?.sourceValues.scheduledUnpublishAt ||
    record.scheduledUnpublishAt ||
    null;
  const assignedTo =
    workflowSection?.manualValues.assignedTo ||
    workflowSection?.sourceValues.assignedTo ||
    "";
  const assignedBy =
    workflowSection?.manualValues.assignedBy ||
    workflowSection?.sourceValues.assignedBy ||
    "";
  const dueDate =
    workflowSection?.manualValues.dueDate ||
    workflowSection?.sourceValues.dueDate ||
    null;
  const currentUserLock = activeEditors.find(
    (item) => item.editorEmail.toLowerCase() === currentUserEmail.toLowerCase(),
  );
  const otherEditors = activeEditors.filter(
    (item) => item.editorEmail.toLowerCase() !== currentUserEmail.toLowerCase(),
  );
  const liveContentHealthScore = Math.round(
    (overallCompleteness.percent +
      record.contentHealth.freshnessScore +
      record.contentHealth.sourceCoverageScore) /
      3,
  );

  function updateSection(
    sectionKey: string,
    updater: (section: EditorSectionState) => EditorSectionState,
  ) {
    setSections((current) =>
      current.map((section) => (section.key === sectionKey ? updater(section) : section)),
    );
  }

  function buildPayload(nextStatus: AdminPublishState) {
    return {
      recordId: record.id,
      originalSlug: record.slug,
      lastKnownUpdatedAt,
      family: record.family,
      slug: currentSlug,
      title: currentTitle,
      symbol:
        identitySection?.manualValues.symbol ||
        identitySection?.sourceValues.symbol ||
        record.symbol ||
        "",
      benchmarkMapping:
        identitySection?.manualValues.benchmarkIndexSlug ||
        identitySection?.manualValues.sectorIndexSlug ||
        identitySection?.manualValues.benchmark ||
        identitySection?.sourceValues.benchmarkIndexSlug ||
        identitySection?.sourceValues.sectorIndexSlug ||
        identitySection?.sourceValues.benchmark ||
        record.sourceState.sourceLabel,
      status: nextStatus,
      visibility:
        nextStatus === "published"
          ? "public"
          : nextStatus === "archived"
            ? "archived"
            : "private",
      scheduledPublishAt: canPublishContent ? scheduledPublishAt : null,
      scheduledUnpublishAt: canPublishContent ? scheduledUnpublishAt : null,
      publicHref: currentPublicRoute,
      canonicalRoute: currentPublicRoute || record.canonicalRoute || record.publicHref || "",
      sourceTable: record.sourceTable,
      sourceRowId: record.sourceRowId,
      sourceLabel:
        sourceSection?.manualValues.primarySourceCode ||
        sourceSection?.sourceValues.primarySourceCode ||
        record.sourceLabel,
      sourceDate:
        sourceSection?.manualValues.sourceUpdatedAt ||
        sourceSection?.sourceValues.sourceUpdatedAt ||
        record.sourceDate,
      sourceUrl:
        sourceSection?.manualValues.sourceUrl ||
        sourceSection?.sourceValues.sourceUrl ||
        record.sourceUrl,
      accessControl: accessSection
        ? {
            mode:
              (accessSection.manualValues.accessMode ||
                accessSection.sourceValues.accessMode ||
                record.accessControl.mode) as typeof record.accessControl.mode,
            allowedMembershipTiers: parseDelimitedValues(
              accessSection.manualValues.allowedMembershipTiers ||
                accessSection.sourceValues.allowedMembershipTiers,
            ),
            requireLogin:
              (accessSection.manualValues.requireLogin ||
                accessSection.sourceValues.requireLogin ||
                (record.accessControl.requireLogin ? "yes" : "no")) === "yes",
            showTeaserPublicly:
              (accessSection.manualValues.showTeaserPublicly ||
                accessSection.sourceValues.showTeaserPublicly ||
                (record.accessControl.showTeaserPublicly ? "yes" : "no")) === "yes",
            showLockedPreview:
              (accessSection.manualValues.showLockedPreview ||
                accessSection.sourceValues.showLockedPreview ||
                (record.accessControl.showLockedPreview ? "yes" : "no")) === "yes",
            ctaLabel:
              accessSection.manualValues.ctaLabel ||
              accessSection.sourceValues.ctaLabel ||
              record.accessControl.ctaLabel,
            ctaHref:
              accessSection.manualValues.ctaHref ||
              accessSection.sourceValues.ctaHref ||
              record.accessControl.ctaHref,
            internalNotes:
              accessSection.manualValues.internalNotes ||
              accessSection.sourceValues.internalNotes ||
              record.accessControl.internalNotes,
          }
        : record.accessControl,
      assignedTo: workflowSection?.manualValues.assignedTo || workflowSection?.sourceValues.assignedTo || null,
      assignedBy: workflowSection?.manualValues.assignedBy || workflowSection?.sourceValues.assignedBy || null,
      dueDate: workflowSection?.manualValues.dueDate || workflowSection?.sourceValues.dueDate || null,
      sections: Object.fromEntries(
        sections.map((section) => [
          section.key,
          {
            mode: section.mode,
            values: section.manualValues,
            note: section.note,
            lastManualEditAt: new Date().toISOString(),
            expiresAt: section.expiresAt,
          },
        ]),
      ),
      documents,
    };
  }

  function getCriticalFieldChanges() {
    const initial = loadedRecordSnapshotRef.current;
    if (!initial) {
      return [] as string[];
    }

    const changes: string[] = [];
    if (currentSlug !== initial.slug) {
      changes.push(`Slug: ${initial.slug} -> ${currentSlug}`);
    }
    if (currentPublicRoute !== initial.publicRoute) {
      changes.push(
        `Route: ${initial.publicRoute || "none"} -> ${currentPublicRoute || "none"}`,
      );
    }
    if (currentTitle !== initial.title) {
      changes.push(`Title: ${initial.title || "none"} -> ${currentTitle || "none"}`);
    }
    const currentSymbol =
      identitySection?.manualValues.symbol ||
      identitySection?.sourceValues.symbol ||
      record.symbol ||
      "";
    if (currentSymbol !== initial.symbol) {
      changes.push(`Symbol: ${initial.symbol || "none"} -> ${currentSymbol || "none"}`);
    }

    return changes;
  }

  const comparableCurrentPayload = useMemo(
    () => buildComparablePayload(buildPayload(status)),
    [status, sections, currentSlug, currentTitle, currentPublicRoute],
  );
  const comparisonFieldLookup = useMemo(
    () => buildComparisonFieldLookup(computedSections),
    [computedSections],
  );
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? latestVersion;
  const comparableSelectedVersionPayload = selectedVersion
    ? buildComparablePayload({
        title: selectedVersion.snapshot.title,
        slug: selectedVersion.snapshot.slug,
        status: selectedVersion.snapshot.status,
        assignedTo: selectedVersion.snapshot.assignedTo,
        assignedBy: selectedVersion.snapshot.assignedBy,
        dueDate: selectedVersion.snapshot.dueDate,
        publicHref: selectedVersion.snapshot.publicHref,
        scheduledPublishAt: selectedVersion.snapshot.scheduledPublishAt,
        scheduledUnpublishAt: selectedVersion.snapshot.scheduledUnpublishAt,
        sections: selectedVersion.snapshot.sections,
      })
    : null;
  const versionComparisonRows = useMemo(
    () =>
      getPayloadComparisonRows(
        comparableCurrentPayload,
        comparableSelectedVersionPayload,
        comparisonFieldLookup,
      ),
    [comparableCurrentPayload, comparableSelectedVersionPayload, comparisonFieldLookup],
  );
  const changedFieldsSinceLastVersion = useMemo(
    () => versionComparisonRows.map((row) => row.displayLabel),
    [versionComparisonRows],
  );
  const draftComparablePayload = useMemo(
    () => buildComparablePayload(buildPayload("draft")),
    [sections, currentSlug, currentTitle, currentPublicRoute],
  );
  const draftComparablePayloadSignature = useMemo(
    () => JSON.stringify(draftComparablePayload),
    [draftComparablePayload],
  );
  const lifecycleTimeline = useMemo(() => {
    const items: Array<{ id: string; label: string; note: string; at: string }> = [];

    if (record.createdAt) {
      items.push({
        id: "created",
        label: "Record created",
        note: "Initial CMS record was created.",
        at: record.createdAt,
      });
    }

    const scheduledPublishAt =
      publishingSection?.manualValues.scheduledPublishAt ||
      publishingSection?.sourceValues.scheduledPublishAt ||
      record.scheduledPublishAt;
    const scheduledUnpublishAt =
      publishingSection?.manualValues.scheduledUnpublishAt ||
      publishingSection?.sourceValues.scheduledUnpublishAt ||
      record.scheduledUnpublishAt;

    if (scheduledPublishAt) {
      items.push({
        id: "scheduled-publish",
        label: "Scheduled publish",
        note: "This record is queued to publish automatically at the scheduled time.",
        at: scheduledPublishAt,
      });
    }

    if (scheduledUnpublishAt) {
      items.push({
        id: "scheduled-unpublish",
        label: "Scheduled unpublish",
        note: "This record is queued to leave the live route at the scheduled time.",
        at: scheduledUnpublishAt,
      });
    }

    revisions.forEach((revision) => {
      items.push({
        id: revision.id,
        label: revision.action,
        note: revision.reason,
        at: revision.editedAt,
      });
    });

    return items.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
  }, [
    scheduledPublishAt,
    scheduledUnpublishAt,
    record.createdAt,
    revisions,
  ]);

  function restoreVersion(version: CmsRecordVersion) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Restore the saved version from ${formatTimelineDate(version.savedAt)} by ${version.savedBy}? This only replaces the draft in the editor until you save again.`,
      )
    ) {
      return;
    }

    setStatus(version.snapshot.status);
    setSections((current) =>
      current.map((section) => ({
        ...section,
        mode: version.snapshot.sections[section.key]?.mode ?? "auto_source",
        manualValues: version.snapshot.sections[section.key]?.values ?? {},
        note: version.snapshot.sections[section.key]?.note ?? "",
        expiresAt: version.snapshot.sections[section.key]?.expiresAt ?? null,
        lastManualEditAt: version.snapshot.sections[section.key]?.lastManualEditAt ?? section.lastManualEditAt,
      })),
    );
    setBanner({
      tone: "success",
      label: "Version loaded",
      text: `Restored ${formatTimelineDate(version.savedAt)} into the editor. Save to make this version live again.`,
    });
  }

  useEffect(() => {
    lastPersistedDraftSignatureRef.current = draftComparablePayloadSignature;
    setAutoSaveMessage("Autosave runs every minute while you edit.");
  }, [record.id, record.updatedAt, pendingApproval?.id, pendingApproval?.updatedAt]);

  function handlePreview() {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/operator-console/previews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(status)),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            previewUrl?: string;
            preview?: CmsPreviewSession;
          }
        | null;

      if (!response.ok || !data?.previewUrl) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not generate a preview right now.",
        });
        return;
      }

      setLatestPreview(data.preview ?? null);
      router.refresh();
      window.open(data.previewUrl, "_blank", "noopener,noreferrer");
      setBanner({
        tone: "success",
        label: "Preview ready",
        text: `Preview opened in a new tab. It stays separate from the live page and expires ${data.preview?.expiresAt ? formatTimelineDate(data.preview.expiresAt) : "automatically"}.`,
        detail: data.preview?.createdAt
          ? `Draft preview created ${formatAdminDateTime(data.preview.createdAt)} and remains separate from the live page.`
          : canPublishContent
            ? "Draft preview remains separate from live content until you save or publish."
            : "Draft preview remains separate from live content until an admin approves the queued change.",
      });
    });
  }

  async function persistRecord(
    nextStatus: AdminPublishState,
    options?: {
      skipConfirmation?: boolean;
      autosave?: boolean;
    },
  ) {
    const skipConfirmation = options?.skipConfirmation ?? false;
    const autosave = options?.autosave ?? false;

    if (autosave) {
      const minimumIdentityReady = Boolean(currentTitle.trim()) && Boolean(currentSlug.trim());
      if (!minimumIdentityReady) {
        setAutoSaveMessage("Autosave waits until the title and slug are filled.");
        return;
      }
      if (lastPersistedDraftSignatureRef.current === draftComparablePayloadSignature) {
        return;
      }
    }

    if (isPending || saveInFlightRef.current) {
      return;
    }

    if (!skipConfirmation) {
      setBanner(null);

      const criticalChanges = !isNew ? getCriticalFieldChanges() : [];
      if (
        criticalChanges.length &&
        typeof window !== "undefined" &&
        !window.confirm(
          `You are changing critical identity fields:\n\n${criticalChanges.map((item) => `- ${item}`).join("\n")}\n\nContinue saving this record?`,
        )
      ) {
        return;
      }

      if (
        nextStatus === "published" &&
        typeof window !== "undefined" &&
        !window.confirm(
          canPublishContent
            ? "Publish this record to the live route now?"
            : "Send this publish request to the admin approval queue?",
        )
      ) {
        return;
      }

      if (
        nextStatus === "archived" &&
        typeof window !== "undefined" &&
        !window.confirm(
          canPublishContent
            ? "Archive this record and remove it from the active publishing flow?"
            : "Send this archive request to the admin approval queue?",
        )
      ) {
        return;
      }
    }

    const payload = buildPayload(nextStatus);
    saveInFlightRef.current = true;

    try {
      const response = await fetch("/api/admin/operator-console/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            record?: { id?: string | null; updatedAt?: string | null };
            pendingApproval?: AdminPendingApproval;
            savedAt?: string;
            storageMode?: string;
            operation?: "saved" | "published" | "archived" | "submitted_for_approval";
          }
        | null;

      if (!response.ok || !data?.record) {
        if (autosave) {
          setAutoSaveMessage(
            data?.error ??
              (response.status === 409
                ? "Autosave paused because the record changed elsewhere. Refresh the editor."
                : "Autosave could not save the pending draft."),
          );
          return;
        }

        setBanner({
          tone: "danger",
          label: response.status === 409 ? "Refresh required" : "Save failed",
          text:
            data?.error ??
            (response.status === 409
              ? "This record was updated recently. Refresh before saving."
              : "Could not save this record right now."),
          detail:
            response.status === 409
              ? "Another save reached the backend after this page loaded. Refresh the editor to pull the latest record state before saving again."
              : undefined,
        });
        return;
      }

      setStatus(nextStatus);
      if (data.pendingApproval) {
        setLatestPendingApproval(data.pendingApproval);
      }
      setLastKnownUpdatedAt(data.record.updatedAt ?? new Date().toISOString());
      setSections((current) =>
        current.map((section) => ({
          ...section,
          lastManualEditAt: new Date().toISOString(),
        })),
      );
      lastPersistedDraftSignatureRef.current = draftComparablePayloadSignature;
      router.refresh();

      if (autosave) {
        setAutoSaveMessage(
          `Pending draft autosaved ${formatAdminDateTime(data.savedAt ?? data.record.updatedAt, "just now")}.`,
        );
        return;
      }

      setBanner({
        tone: "success",
        label:
          data?.operation === "submitted_for_approval"
            ? "Approval queued"
            : nextStatus === "published"
            ? "Published"
            : nextStatus === "archived"
              ? "Archived"
              : nextStatus === "ready_for_review"
                ? "Ready for review"
                : nextStatus === "needs_fix"
                  ? "Needs fix"
                  : "Saved",
        text:
          data?.operation === "submitted_for_approval"
            ? nextStatus === "published"
              ? "Publish request sent for admin approval."
              : nextStatus === "archived"
                ? "Archive request sent for admin approval."
                : "Editor changes saved into the approval queue."
            : nextStatus === "published"
            ? "Record saved and published."
            : nextStatus === "ready_for_review"
              ? "Record saved and moved to the review queue."
              : nextStatus === "needs_fix"
                ? "Record saved and marked as needs fix."
                : nextStatus === "archived"
                  ? "Record archived."
                  : "Draft saved.",
        detail:
          data?.operation === "submitted_for_approval"
            ? `Queued for admin review. ${formatAdminSavedState(data.savedAt ?? data.record.updatedAt)}`
            : `Saved through the current operator storage path. ${formatAdminSavedState(data.savedAt ?? data.record.updatedAt)}`,
      });
    } finally {
      saveInFlightRef.current = false;
    }
  }

  function handleSave(nextStatus: AdminPublishState) {
    startTransition(async () => {
      await persistRecord(nextStatus);
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (autoSaveIntervalRef.current) {
      window.clearInterval(autoSaveIntervalRef.current);
    }

    autoSaveIntervalRef.current = window.setInterval(() => {
      void persistRecord("draft", {
        skipConfirmation: true,
        autosave: true,
      });
    }, 60_000);

    return () => {
      if (autoSaveIntervalRef.current) {
        window.clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [draftComparablePayloadSignature, currentSlug, currentTitle, isPending]);

  return (
    <div className="space-y-3">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "primary" : "warning"} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <AdminBadge
              label={banner.label ?? (banner.tone === "success" ? "Saved" : "Error")}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </AdminCard>
      ) : null}

      {isNew && creationSupport ? (
        <AdminSectionCard
          title={`Create a new ${creationSupport.singularLabel}`}
          description="Choose whether you want to create this page manually or start from a CSV. New records save as drafts first, review-ready records still wait for admin approval, and nothing here goes live automatically."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white">
                Create manually
              </span>
              {creationSupport.importHref ? (
                <Link
                  href={creationSupport.importHref}
                  className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                >
                  Import from CSV
                </Link>
              ) : null}
              {creationSupport.templateHref ? (
                <a
                  href={creationSupport.templateHref}
                  className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                >
                  Download sample CSV
                </a>
              ) : null}
              {creationSupport.helpHref ? (
                <Link
                  href={creationSupport.helpHref}
                  className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                >
                  Open help
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isPending}
                className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Saving..." : canPublishContent ? "Save draft" : "Save pending draft"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("ready_for_review")}
                disabled={isPending}
                className="inline-flex h-8 items-center rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 text-[12px] font-medium text-[#b45309] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Send for review"}
              </button>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Draft</p>
                <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
                  Draft means the record is saved in the CMS editor, but the live page stays unchanged.
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Review</p>
                <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
                  Review means the content is ready for an editor or admin to check before the final approval step.
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Admin approval</p>
                <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
                  Admin approval is the final step. Imported rows and editor review requests never publish automatically.
                </p>
              </div>
            </div>
          </div>
        </AdminSectionCard>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <AdminCard className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <AdminBadge label={formatWorkflowStatus(status)} tone={getStatusTone(status)} />
              <AdminBadge
                label={record.sourcePresent ? "Uses source data" : "Manual page"}
                tone={record.sourcePresent ? "info" : "default"}
              />
              <AdminBadge
                label={overrideActive ? "Manual changes active" : "Source data live"}
                tone={overrideActive ? "warning" : "info"}
              />
              <AdminBadge label={record.visibility} tone={record.visibility === "public" ? "success" : "default"} />
              {isNew ? <AdminBadge label="New draft" tone="warning" /> : null}
            </div>
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-[#111827]">
                {currentTitle || "New record"}
              </h2>
              <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                Route:{" "}
                {currentPublicRoute ? (
                  <Link href={currentPublicRoute} {...getInternalLinkProps()} className="font-medium text-[#111827] underline">
                    {currentPublicRoute}
                  </Link>
                ) : (
                  "Will be assigned once the slug is saved."
                )}
              </p>
              <p className="mt-1 text-sm leading-5 text-[#6b7280]">
                Page data comes from: {record.sourceState.sourceLabel || "Manual only"} • Revisions {record.revisionCount}
              </p>
            </div>
          </AdminCard>

          <AdminCard tone="secondary" className="space-y-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
              Safe editing mode
            </p>
            <p className="text-[13px] leading-5 text-[#4b5563]">
              Read-only fields update from the connected source or workflow rules, warning badges mark page identity or live-page changes, and admin-only data panels stay lower in the editor so most people can focus on the page content first.
            </p>
          </AdminCard>

          <AdminCard
            tone={otherEditors.length ? "warning" : "compact"}
            className="space-y-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <AdminBadge
                label={otherEditors.length ? "Another editor is here" : "Editing presence active"}
                tone={otherEditors.length ? "warning" : "info"}
              />
              <p className="text-[13px] font-medium text-[#111827]">Editing presence</p>
            </div>
            <p className="text-[13px] leading-5 text-[#4b5563]">
              {otherEditors.length
                ? "Someone else is editing this page right now. Refresh before saving if you are working together."
                : currentUserLock
                  ? "You are the active editor for this page right now."
                  : "When someone opens this page, they will appear here automatically."}
            </p>
            {activeEditors.length ? (
              <div className="space-y-2">
                {activeEditors.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#111827]">
                        {item.editorEmail}
                        {item.editorEmail.toLowerCase() === currentUserEmail.toLowerCase()
                          ? " (You)"
                          : ""}
                      </p>
                      <AdminBadge
                        label={
                          item.editorEmail.toLowerCase() === currentUserEmail.toLowerCase()
                            ? "Current editor"
                            : "Also editing"
                        }
                        tone={
                          item.editorEmail.toLowerCase() === currentUserEmail.toLowerCase()
                            ? "info"
                            : "warning"
                        }
                      />
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                      Started {formatTimelineDate(item.startedAt)} • Last heartbeat {formatTimelineDate(item.lastHeartbeatAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </AdminCard>

          {isStockEditor ? (
            <AdminSectionCard
              title="Stock editor tabs"
              description="Basic Info keeps the normal CMS editor. The other tabs read the durable Yahoo import data, coverage reports, logs, and raw responses for this stock."
            >
              <div className="flex flex-wrap gap-2">
                {stockImportEditorTabs.map((tab) => {
                  const active = activeStockTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveStockTab(tab.key)}
                      className={`inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-medium transition ${
                        active
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[#d1d5db] bg-white text-[#111827] hover:bg-[#f9fafb]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </AdminSectionCard>
          ) : null}

          {!isStockEditor || activeStockTab === "basic_info" ? (
            <>
              {mainSections.map((section) =>
                renderSection(record.family, section, updateSection, availableMediaAssets, setAvailableMediaAssets, {
                  isAdmin,
                  status,
                  setStatus,
                  currentTitle,
                  currentPublicRoute,
                }),
              )}

              {renderSection(record.family, documentsSection, updateSection, availableMediaAssets, setAvailableMediaAssets, {
                isAdmin,
                status,
                setStatus,
                currentTitle,
                currentPublicRoute,
              })}

              <AdminAdvancedPanel
                title="Advanced source settings"
                description="Open this only when someone needs to adjust how the page uses source data, tracing, or refresh timing."
              >
                <div className="space-y-3">
                  {!isAdmin ? (
                    <AdminEmptyState
                      title="Admin-only source controls"
                      description="Content managers can edit the page safely without opening source mapping or automation internals. Ask an admin only when a source lane or refresh rule must change."
                    />
                  ) : advancedSections.length ? (
                    advancedSections.map((section) =>
                      renderSection(record.family, section, updateSection, availableMediaAssets, setAvailableMediaAssets, {
                        isAdmin,
                        status,
                        setStatus,
                        currentTitle,
                        currentPublicRoute,
                      }),
                    )
                  ) : (
                    <AdminEmptyState
                      title="No advanced source sections"
                      description="This record does not currently expose extra source or automation controls."
                    />
                  )}
                </div>
              </AdminAdvancedPanel>

              <AdminAdvancedPanel
                title="Manual source decisions"
                description="Open this only when an admin needs to decide whether source data or manual changes should win."
              >
                {!isAdmin ? (
                  <AdminEmptyState
                    title="Admin-only override controls"
                    description="Editors can change normal page fields directly. This deeper override table is reserved for admins making source-versus-manual decisions."
                  />
                ) : overrides.length ? (
                  <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white">
                    <table className="min-w-full text-left">
                      <thead className="bg-[#f9fafb]">
                        <tr>
                          {["Field", "Source Value", "Manual Value", "Mode", "Effective", "Freshness", "Controls"].map((column) => (
                            <th
                              key={column}
                              className="sticky top-[var(--admin-sticky-offset)] z-[20] border-b border-[#d1d5db] bg-[#f3f4f6] px-3 py-2 text-[12px] font-medium text-[#6b7280]"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e7eb]">
                        {overrides.map((item) => (
                          <tr key={`${item.sectionKey}-${item.field.key}`} className="align-top transition hover:bg-[#f9fafb]">
                            <td className="px-3 py-2 text-[13px] text-[#111827]">
                              <div className="space-y-0.5">
                                <p className="font-medium">{item.field.label}</p>
                                <p className="text-[12px] text-[#6b7280]">{item.sectionLabel}</p>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-[13px] text-[#111827]">
                              <FieldValuePreview value={item.sourceValue} />
                            </td>
                            <td className="px-3 py-2 text-[13px] text-[#111827]">
                              <FieldValuePreview value={item.manualValue} />
                            </td>
                            <td className="px-3 py-2">
                              <div className="space-y-1.5">
                                <AdminBadge label={getOverrideLabel(item.mode)} tone={getOverrideTone(item.mode)} />
                                <select
                                  value={item.mode}
                                  onChange={(event) =>
                                    updateSection(item.sectionKey, (current) => ({
                                      ...current,
                                      mode: event.target.value as AdminOverrideMode,
                                    }))
                                  }
                                  className="h-8 w-[126px] rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                                >
                                  {adminOverrideModeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-[13px] text-[#111827]">
                              <FieldValuePreview value={item.effectiveValue} />
                            </td>
                            <td className="px-3 py-2">
                              <div className="space-y-1.5">
                                <AdminBadge
                                  label={item.conflictStatus.replaceAll("_", " ")}
                                  tone={
                                    item.conflictStatus === "source_current"
                                      ? "success"
                                      : item.conflictStatus === "locked_manual_value" || item.conflictStatus === "import_conflict_needs_review"
                                        ? "danger"
                                        : "warning"
                                  }
                                />
                                <p className="text-[12px] leading-5 text-[#6b7280]">
                                  Source {item.lastSourceRefreshAt || "not refreshed"}
                                </p>
                                <p className="text-[12px] leading-5 text-[#6b7280]">
                                  Manual {item.lastManualEditAt || "not edited"}
                                </p>
                                <p className="text-[12px] leading-5 text-[#6b7280]">
                                  Live {item.liveSource}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSection(item.sectionKey, (current) => ({
                                      ...current,
                                      manualValues: {
                                        ...current.manualValues,
                                        [item.field.key]: current.sourceValues[item.field.key] ?? "",
                                      },
                                      mode:
                                        current.mode === "auto_source"
                                          ? "manual_override"
                                          : current.mode,
                                    }))
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                                >
                                  Copy source
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSection(item.sectionKey, (current) => {
                                      const nextManualValues = { ...current.manualValues };
                                      delete nextManualValues[item.field.key];
                                      return {
                                        ...current,
                                        manualValues: nextManualValues,
                                        mode: Object.keys(nextManualValues).length
                                          ? current.mode
                                          : "auto_source",
                                      };
                                    })
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[12px] font-medium text-[#6b7280]"
                                >
                                  Use source
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSection(item.sectionKey, (current) => ({
                                      ...current,
                                      mode: "manual_override",
                                    }))
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                                >
                                  Use manual
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSection(item.sectionKey, (current) => ({
                                      ...current,
                                      mode: "manual_until_next_refresh",
                                    }))
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-[#fffbeb] px-3 text-[12px] font-medium text-[#b45309]"
                                >
                                  Temp
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSection(item.sectionKey, (current) => ({
                                      ...current,
                                      mode: "manual_permanent_lock",
                                    }))
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 text-[12px] font-medium text-[#b91c1c]"
                                >
                                  Lock
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSection(item.sectionKey, (current) => {
                                      const nextManualValues = { ...current.manualValues };
                                      delete nextManualValues[item.field.key];
                                      return {
                                        ...current,
                                        manualValues: nextManualValues,
                                        mode: Object.keys(nextManualValues).length ? current.mode : "auto_source",
                                      };
                                    })
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[12px] font-medium text-[#6b7280]"
                                >
                                  Clear
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No override-capable fields"
                    description="Override rows will appear here once the editor has trackable frontend or source fields."
                  />
                )}
              </AdminAdvancedPanel>

              <AdminAdvancedPanel
                title="Import and revision history"
                description="Advanced operator trail for import review, revision confidence, and source-vs-manual follow-through."
              >
                <div className="space-y-3">
              <AdminSectionCard
                id="version-history"
                title="Version comparison"
                description="Compare the current editor state with any saved version, review changed fields clearly, and restore the selected version when needed."
              >
                {versions.length ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-2.5">
                        <p className="text-[13px] font-medium text-[#111827]">Saved versions</p>
                        <div className="space-y-2">
                          {versions.map((version) => {
                            const active = version.id === selectedVersion?.id;
                            return (
                              <button
                                key={version.id}
                                type="button"
                                onClick={() => setSelectedVersionId(version.id)}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                  active
                                    ? "border-[#0f172a] bg-white shadow-sm"
                                    : "border-[#d1d5db] bg-white hover:border-[#94a3b8]"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[12px] font-medium text-[#111827]">
                                    {formatTimelineDate(version.savedAt)}
                                  </p>
                                  <AdminBadge
                                    label={active ? "Comparing" : formatWorkflowStatus(version.status)}
                                    tone={active ? "info" : getStatusTone(version.status)}
                                  />
                                </div>
                                <p className="mt-1 text-[12px] text-[#6b7280]">
                                  Saved by {version.savedBy}
                                </p>
                                <p className="mt-1 text-[12px] text-[#6b7280]">
                                  {version.changedFields.length
                                    ? `${version.changedFields.length} changed field${version.changedFields.length === 1 ? "" : "s"}`
                                    : "No recorded field delta"}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {selectedVersion ? (
                          <>
                            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-[13px] font-medium text-[#111827]">
                                    Comparing with saved version
                                  </p>
                                  <p className="mt-1 text-[13px] text-[#6b7280]">
                                    {formatTimelineDate(selectedVersion.savedAt)} • Saved by {selectedVersion.savedBy} • {formatWorkflowStatus(selectedVersion.status)}
                                  </p>
                                  <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                                    Reverting restores this snapshot into the editor only. Live content stays unchanged until you save.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => restoreVersion(selectedVersion)}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                                >
                                  Revert to this version
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[13px] font-medium text-[#111827]">
                                Changed fields
                              </p>
                              {changedFieldsSinceLastVersion.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {changedFieldsSinceLastVersion.slice(0, 16).map((field) => (
                                    <AdminBadge key={field} label={field} tone="warning" />
                                  ))}
                                  {changedFieldsSinceLastVersion.length > 16 ? (
                                    <AdminBadge
                                      label={`+${changedFieldsSinceLastVersion.length - 16} more`}
                                      tone="default"
                                    />
                                  ) : null}
                                </div>
                              ) : (
                                <p className="text-[13px] text-[#6b7280]">
                                  The current editor state matches this saved version.
                                </p>
                              )}
                            </div>

                            {versionComparisonRows.length ? (
                              <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white">
                                <table className="min-w-full text-left">
                                  <thead className="bg-[#f9fafb]">
                                    <tr>
                                      {["Field", "Current draft", "Saved version"].map((column) => (
                                        <th
                                          key={column}
                                          className="border-b border-[#d1d5db] px-3 py-2 text-[12px] font-medium text-[#6b7280]"
                                        >
                                          {column}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#e5e7eb]">
                                    {versionComparisonRows.map((row) => (
                                      <tr key={row.id} className="align-top">
                                        <td className="px-3 py-2 text-[13px] font-medium text-[#111827]">
                                          <div className="space-y-0.5">
                                            <p>{row.fieldLabel}</p>
                                            <p className="text-[12px] font-normal text-[#6b7280]">
                                              {row.groupLabel}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <FieldValuePreview value={row.currentValue} />
                                        </td>
                                        <td className="px-3 py-2">
                                          <FieldValuePreview value={row.previousValue} />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No saved version yet"
                    description="Once this record is saved, the latest version snapshot and field comparison will appear here."
                  />
                )}
              </AdminSectionCard>

              <AdminSectionCard
                title="Imports / history"
                description="Recent import rows, review posture, and overwrite or conflict follow-through for this record."
              >
                {importHistory.length ? (
                  <AdminSimpleTable
                    columns={["Batch", "Status", "Source", "Ran at", "Note"]}
                    rows={importHistory.map((item) => [
                      item.batchLabel,
                      <AdminBadge
                        key={`${item.id}-status`}
                        label={item.status}
                        tone={
                          item.status === "applied"
                            ? "success"
                            : item.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                      />,
                      item.sourceLabel,
                      item.ranAt,
                      item.note || "No operator note yet.",
                    ])}
                  />
                ) : (
                  <AdminEmptyState
                    title="No import rows yet"
                    description="This record has not received a local operator import-review row yet."
                  />
                )}
              </AdminSectionCard>

              <AdminSectionCard
                title="Revision history"
                description="Recent operator actions for this record from the shared revision trail."
              >
                {revisions.length ? (
                  <div className="space-y-2">
                    {revisions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-[#111827]">{item.action}</p>
                          <AdminBadge
                            label={item.revisionState}
                            tone={
                              item.revisionState === "Published"
                                ? "success"
                                : item.revisionState === "Review ready"
                                  ? "warning"
                                  : "default"
                            }
                          />
                        </div>
                        <p className="mt-1 text-[13px] text-[#6b7280]">
                          {item.editor} • {item.editedAt}
                        </p>
                        <p className="mt-1 text-[13px] text-[#6b7280]">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No revisions captured yet"
                    description="Once this record is saved through the operator editor, its revision trail will appear here."
                  />
                )}
              </AdminSectionCard>
                </div>
              </AdminAdvancedPanel>
            </>
          ) : (
            <AdminStockImportTabs activeTab={activeStockTab} details={stockImportInsights ?? null} />
          )}
        </div>

        <div className="space-y-3 xl:sticky xl:top-[var(--admin-sticky-offset)] xl:self-start">
          <AdminSectionCard
            title="Content health"
            description="A simple quality score for completeness, freshness, source coverage, and dependency gaps."
          >
            <div className="space-y-2.5">
              <MetaRow
                label="Health score"
                value={
                  <AdminBadge
                    label={`${liveContentHealthScore}%`}
                    tone={
                      liveContentHealthScore >= 80
                        ? "success"
                        : liveContentHealthScore >= 55
                          ? "warning"
                          : "danger"
                    }
                  />
                }
              />
              <MetaRow
                label="Completeness"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {overallCompleteness.percent}%
                  </span>
                }
              />
              <MetaRow
                label="Freshness"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {record.contentHealth.freshnessScore}%
                  </span>
                }
              />
              <MetaRow
                label="Source coverage"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {record.contentHealth.sourceCoverageScore}%
                  </span>
                }
              />
              {record.contentHealth.dependencyWarnings.length ? (
                <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5">
                  <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#b45309]">
                    Dependency warnings
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {record.contentHealth.dependencyWarnings.map((warning) => (
                      <AdminBadge key={warning} label={warning} tone="warning" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-[12px] leading-5 text-[#4b5563]">
                    No dependency blockers are currently flagged for this record.
                  </p>
                </div>
              )}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Workflow and completeness"
            description="Track ownership, target date, and how close this record is to a content-manager-ready handoff."
          >
            <div className="space-y-2.5">
              <MetaRow
                label="Status"
                value={<AdminBadge label={formatWorkflowStatus(status)} tone={getStatusTone(status)} />}
              />
              <MetaRow
                label="Assigned to"
                value={<span className="text-[13px] font-medium text-[#111827]">{assignedTo || "Unassigned"}</span>}
              />
              <MetaRow
                label="Assigned by"
                value={<span className="text-[13px] font-medium text-[#111827]">{assignedBy || "Saved automatically"}</span>}
              />
              <MetaRow
                label="Due date"
                value={<span className="text-[13px] font-medium text-[#111827]">{formatTimelineDate(dueDate)}</span>}
              />
              <MetaRow
                label="Completeness"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {overallCompleteness.filledCount}/{overallCompleteness.totalCount} fields • {overallCompleteness.percent}%
                  </span>
                }
              />
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                  Missing critical
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#4b5563]">
                  {overallCompleteness.missingCritical.length
                    ? overallCompleteness.missingCritical.slice(0, 4).join(", ")
                    : "No critical gaps right now."}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                  Missing important
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#4b5563]">
                  {overallCompleteness.missingImportant.length
                    ? overallCompleteness.missingImportant.slice(0, 5).join(", ")
                    : "No important workflow gaps right now."}
                </p>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Status" description="What is live, who can see it, and whether the route is ready to publish.">
            <div className="space-y-2.5">
              <MetaRow label="Publish state" value={<AdminBadge label={formatWorkflowStatus(status)} tone={getStatusTone(status)} />} />
              <MetaRow
                label="Visibility"
                value={<span className="text-[13px] font-medium text-[#111827]">{currentPublicRoute ? "Public route assigned" : "Draft only"}</span>}
              />
              <MetaRow
                label="Access"
                value={<span className="text-[13px] font-medium text-[#111827]">{record.accessControl.mode.replaceAll("_", " ")}</span>}
              />
              <MetaRow
                label="Last updated"
                value={<span className="text-[13px] font-medium text-[#111827]">{formatTimelineDate(lastUpdated)}</span>}
              />
              <MetaRow
                label="Last edited by"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {lastEditedRevision
                      ? `${lastEditedRevision.editor} • ${formatTimelineDate(lastEditedRevision.editedAt)}`
                      : "Awaiting first edit"}
                  </span>
                }
              />
              <MetaRow
                label="Current slug"
                value={<span className="text-[13px] font-medium text-[#111827]">{currentSlug || "Awaiting slug"}</span>}
              />
              <MetaRow
                label="Scheduled publish"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {formatTimelineDate(scheduledPublishAt)}
                  </span>
                }
              />
              <MetaRow
                label="Scheduled unpublish"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {formatTimelineDate(scheduledUnpublishAt)}
                  </span>
                }
              />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Source and freshness" description="A simple summary of where the page data comes from and whether refresh is healthy.">
            <div className="space-y-2.5">
              <MetaRow
                label="Source mode"
                value={
                  <AdminBadge
                    label={overrideActive ? "Manual / override" : "Auto source"}
                    tone={overrideActive ? "warning" : "info"}
                  />
                }
              />
              <MetaRow
                label="Source label"
                value={<span className="text-[13px] font-medium text-[#111827]">{record.sourceLabel || "Awaiting source mapping"}</span>}
              />
              <MetaRow
                label="Freshness"
                value={<span className="text-[13px] font-medium capitalize text-[#111827]">{record.sourceState.freshnessState.replaceAll("_", " ")}</span>}
              />
              <MetaRow
                label="Last refresh"
                value={<span className="text-[13px] font-medium text-[#111827]">{formatAdminDateTime(record.sourceDate, "Awaiting source refresh")}</span>}
              />
              <MetaRow
                label="Next refresh"
                value={<span className="text-[13px] font-medium text-[#111827]">{formatAdminDateTime(record.refreshState.nextScheduledRunAt, "No run scheduled")}</span>}
              />
              <MetaRow
                label="Refresh lane"
                value={<span className="text-[13px] font-medium text-[#111827]">{record.refreshState.laneLabel}</span>}
              />
              <MetaRow
                label="Latest status"
                value={<span className="text-[13px] font-medium capitalize text-[#111827]">{record.refreshState.latestStatus.replaceAll("_", " ")}</span>}
              />
              <MetaRow
                label="Publish eligible"
                value={<span className="text-[13px] font-medium text-[#111827]">{record.publishEligible ? "Yes" : "Needs required fields"}</span>}
              />
              <MetaRow
                label="Dependency warnings"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {record.contentHealth.dependencyWarnings.length || "None"}
                  </span>
                }
              />
              <MetaRow
                label="Changes vs last version"
                value={
                  <span className="text-[13px] font-medium text-[#111827]">
                    {changedFieldsSinceLastVersion.length ? `${changedFieldsSinceLastVersion.length} changed` : "No unsaved difference"}
                  </span>
                }
              />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Actions" description="Primary operator actions for this record.">
            <div className="grid gap-1.5">
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                    Draft preview
                  </p>
                  <AdminBadge
                    label={latestPreview ? "Active preview" : "No active preview"}
                    tone={latestPreview ? "info" : "default"}
                  />
                </div>
                <p className="mt-2 text-[13px] text-[#111827]">
                  {latestPreview
                    ? `${formatRemainingTime(latestPreview.expiresAt)} • Latest preview by ${latestPreview.createdBy}`
                    : "Generate a draft preview when you want to review this record without touching the live page."}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                  Preview links are temporary and only the latest preview for this record stays active. Live content remains unchanged until you save or publish.
                </p>
                {latestPendingApproval ? (
                  <div className="mt-2 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[12px] leading-5 text-[#1d4ed8]">
                    Pending approval updated {formatAdminDateTime(latestPendingApproval.updatedAt)} by {latestPendingApproval.submittedByEmail}. Live content stays unchanged until an admin approves this queued change.
                  </div>
                ) : null}
                {latestPreview ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/preview/${latestPreview.token}`}
                      {...getInternalLinkProps()}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                    >
                      Open latest preview
                    </Link>
                    <span className="inline-flex h-8 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-[12px] text-[#6b7280]">
                      Expires {formatTimelineDate(latestPreview.expiresAt)}
                    </span>
                  </div>
                ) : null}
              </div>
              {currentPublicRoute ? (
                <Link
                  href={currentPublicRoute}
                  {...getInternalLinkProps()}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
                >
                  Open page
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handlePreview}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
              >
                {isPending ? "Preparing..." : "Preview draft"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
              >
                {isPending ? "Saving..." : canPublishContent ? "Save draft" : "Save pending draft"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("ready_for_review")}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 text-[13px] font-medium text-[#b45309]"
              >
                {isPending ? "Saving..." : "Send for review"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("needs_fix")}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 text-[13px] font-medium text-[#b91c1c]"
              >
                {isPending ? "Saving..." : "Mark needs fix"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("published")}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white"
              >
                {isPending ? (canPublishContent ? "Publishing..." : "Submitting...") : canPublishContent ? "Publish" : "Request publish"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("archived")}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] font-medium text-[#6b7280]"
              >
                {isPending ? (canPublishContent ? "Archiving..." : "Submitting...") : canPublishContent ? "Archive" : "Request archive"}
              </button>
              {!canPublishContent ? (
                <>
                  <p className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-[12px] leading-5 text-[#1d4ed8]">
                    {autoSaveMessage}
                  </p>
                  <p className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-[12px] leading-5 text-[#4b5563]">
                    Editors can save pending drafts and request status changes here, but live publish and archive only happen after admin approval.
                  </p>
                </>
              ) : null}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Lifecycle timeline"
            description="See when this record was created, when it is scheduled to go live or come down, and the latest status-changing operator actions."
          >
            <div className="space-y-2">
              {lifecycleTimeline.length ? (
                lifecycleTimeline.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#111827]">{item.label}</p>
                      <span className="text-[12px] text-[#6b7280]">
                        {formatTimelineDate(item.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-[#4b5563]">{item.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-[13px] leading-5 text-[#6b7280]">
                  The timeline will fill in as this record is saved, scheduled, and revised.
                </p>
              )}
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}

function renderSection(
  family: AdminFamilyKey,
  section: ComputedEditorSection | undefined,
  updateSection: (sectionKey: string, updater: (section: EditorSectionState) => EditorSectionState) => void,
  mediaAssets: MediaAsset[],
  onMediaAssetsChange: (assets: MediaAsset[]) => void,
  options: {
    isAdmin: boolean;
    status: AdminPublishState;
    setStatus: (value: AdminPublishState) => void;
    currentTitle: string;
    currentPublicRoute: string;
  },
) {
  if (!section) {
    return null;
  }

  const resolvedSection = section;
  const presentation = getSectionPresentation(family, resolvedSection.key);
  const visibleFields = resolvedSection.fields.filter(
    (field) => !(resolvedSection.key === "publishing" && field.key === "publishState"),
  );
  const sectionTemporarilyDisabled =
    family === "stocks" && resolvedSection.key === "documents_links";
  const { essentialFields, advancedFields } = getSectionFieldGroups(
    family,
    resolvedSection.key,
    visibleFields,
  );
  const seoPreview =
    resolvedSection.key === "seo"
      ? {
          metaTitle:
            getVisibleFieldValue(
              resolvedSection.sourceValues,
              resolvedSection.manualValues,
              resolvedSection.effectiveValues,
              "metaTitle",
            ) || options.currentTitle,
          metaDescription: getVisibleFieldValue(
            resolvedSection.sourceValues,
            resolvedSection.manualValues,
            resolvedSection.effectiveValues,
            "metaDescription",
          ),
          canonicalUrl:
            getVisibleFieldValue(
              resolvedSection.sourceValues,
              resolvedSection.manualValues,
              resolvedSection.effectiveValues,
              "canonicalUrl",
            ) || options.currentPublicRoute,
          noIndex:
            getVisibleFieldValue(
              resolvedSection.sourceValues,
              resolvedSection.manualValues,
              resolvedSection.effectiveValues,
              "noIndex",
            ) === "yes",
          noFollow:
            getVisibleFieldValue(
              resolvedSection.sourceValues,
              resolvedSection.manualValues,
              resolvedSection.effectiveValues,
              "noFollow",
            ) === "yes",
          sitemapInclude:
            getVisibleFieldValue(
              resolvedSection.sourceValues,
              resolvedSection.manualValues,
              resolvedSection.effectiveValues,
              "sitemapInclude",
            ) !== "no",
        }
      : null;

  function renderField(field: AdminFieldDefinition) {
    if (field.adminOnly && !options.isAdmin) {
      return null;
    }

    const fieldValue =
      field.key === "publishState"
        ? options.status
        : getVisibleFieldValue(
            resolvedSection.sourceValues,
            resolvedSection.manualValues,
            resolvedSection.effectiveValues,
            field.key,
          );

    return (
      <label
        key={`${resolvedSection.key}-${field.key}`}
        className={
          field.type === "textarea" ||
          field.type === "membership_tiers" ||
          field.type === "checklist" ||
          field.key === "documentLinksText" ||
          Boolean(getStructuredFieldConfig(field.key))
            ? "space-y-1 md:col-span-2 xl:col-span-3"
            : "space-y-1"
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-medium text-[#6b7280]">{field.label}</span>
          <AdminBadge
            label={field.priority ?? "optional"}
            tone={
              field.priority === "critical"
                ? "danger"
                : field.priority === "important"
                  ? "warning"
                  : "default"
            }
          />
          {field.readOnly ? <AdminBadge label="Read only" tone="default" /> : null}
          {field.adminOnly ? <AdminBadge label="Admin only" tone="info" /> : null}
          {field.warningText ? <AdminBadge label="Warning" tone="warning" /> : null}
        </div>
        {field.warningText ? (
          <p className="text-[12px] leading-5 text-[#6b7280]">{field.warningText}</p>
        ) : null}
        <FieldInput
          field={field}
          value={fieldValue}
          onChange={(value) =>
            updateSection(resolvedSection.key, (current) => {
              if (field.key === "publishState") {
                options.setStatus(value as AdminPublishState);
              }

              return {
                ...current,
                manualValues: {
                  ...current.manualValues,
                  [field.key]: value,
                },
                mode:
                  current.key === "workflow" || field.readOnly
                    ? current.mode
                    : current.mode === "auto_source"
                      ? "manual_override"
                      : current.mode,
              };
            })
          }
          disabled={sectionTemporarilyDisabled || field.readOnly || (field.adminOnly && !options.isAdmin)}
          mediaAssets={mediaAssets}
          onMediaAssetsChange={onMediaAssetsChange}
        />
      </label>
    );
  }

  return (
    <AdminSectionCard
      key={section.key}
      id={resolvedSection.key}
      title={presentation.title ?? resolvedSection.label}
      description={presentation.description ?? resolvedSection.description}
      collapsible={presentation.collapsedByDefault === true}
      defaultOpen={presentation.collapsedByDefault !== true}
    >
      <div className="space-y-2.5">
        {presentation.frontendSection ? (
          <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-[12px] leading-5 text-[#4b5563]">
            <span className="font-medium text-[#111827]">Public page section:</span> {presentation.frontendSection}
          </div>
        ) : null}
        {sectionTemporarilyDisabled ? (
          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-3 text-[13px] leading-6 text-[#92400e]">
            <p className="font-medium text-[#78350f]">Temporarily kept ready, but disabled for stock pages</p>
            <p className="mt-1">
              The stock document and trace-link workflow is staying collapsed until the team is ready to manage hosted files properly.
              Later this section will support uploading a document, naming it clearly, and serving it from the Riddra domain instead of pasting outside links.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge
                  label={`${resolvedSection.completeness.percent}% complete`}
                  tone={
                    resolvedSection.completeness.missingCritical.length
                      ? "danger"
                      : resolvedSection.completeness.missingImportant.length
                        ? "warning"
                        : "success"
                  }
                />
                <span className="text-[12px] text-[#4b5563]">
                  {resolvedSection.completeness.filledCount}/{resolvedSection.completeness.totalCount} tracked fields
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                Missing critical: {resolvedSection.completeness.missingCritical.length} • Missing important: {resolvedSection.completeness.missingImportant.length}
              </p>
            </div>
            {seoPreview ? (
              <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                    SEO preview
                  </p>
                  <AdminBadge label={seoPreview.noIndex ? "Noindex" : "Indexable"} tone={seoPreview.noIndex ? "warning" : "success"} />
                  <AdminBadge label={seoPreview.noFollow ? "Nofollow" : "Follow"} tone={seoPreview.noFollow ? "warning" : "success"} />
                  <AdminBadge
                    label={seoPreview.sitemapInclude ? "Included in sitemap" : "Excluded from sitemap"}
                    tone={seoPreview.sitemapInclude ? "info" : "default"}
                  />
                </div>
                <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-3">
                  <p className="text-[20px] leading-6 text-[#1a0dab]">
                    {seoPreview.metaTitle || options.currentTitle || "Untitled page"}
                  </p>
                  <p className="mt-1 text-[13px] text-[#188038]">
                    {seoPreview.canonicalUrl || options.currentPublicRoute || "Public route will be assigned after the slug is saved."}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-[#4d5156]">
                    {seoPreview.metaDescription || "Add a clear meta description to improve snippet quality and keep search signals intentional."}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="grid gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
              {essentialFields.map(renderField).filter(Boolean)}
            </div>
            {advancedFields.length ? (
              <details className="rounded-lg border border-[#d1d5db] bg-[#f8fafc]">
                <summary className="cursor-pointer list-none px-3 py-2 text-[12px] font-medium text-[#111827]">
                  More settings for this section
                </summary>
                <div className="border-t border-[#e5e7eb] px-3 py-3">
                  <div className="grid gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
                    {advancedFields.map(renderField).filter(Boolean)}
                  </div>
                </div>
              </details>
            ) : null}
          </>
        )}
      </div>
    </AdminSectionCard>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  disabled = false,
  mediaAssets,
  onMediaAssetsChange,
}: {
  field: AdminFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  mediaAssets: MediaAsset[];
  onMediaAssetsChange: (assets: MediaAsset[]) => void;
}) {
  if (field.type === "textarea") {
    return (
      <textarea
        rows={field.rows ?? 4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className="min-h-[72px] w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
      >
        <option value="">Select</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "membership_tiers") {
    const options = field.options ?? [];
    const selected = new Set(parseDelimitedValues(value));

    if (!options.length) {
      return (
        <div className="space-y-2">
          <div className="rounded-lg border border-dashed border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-[12px] leading-5 text-[#6b7280]">
            No membership tiers yet. Create one in `/admin/memberships`, or enter tier slugs manually for planning.
          </div>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="founder-club, investor-pro"
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
          />
        </div>
      );
    }

    return (
      <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2">
        <div className="grid gap-1.5">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-[13px] text-[#111827]">
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                disabled={disabled}
                onChange={(event) => {
                  const nextSelected = new Set(selected);
                  if (event.target.checked) {
                    nextSelected.add(option.value);
                  } else {
                    nextSelected.delete(option.value);
                  }
                  onChange(Array.from(nextSelected).join(", "));
                }}
                className="h-4 w-4 rounded border border-[#cbd5e1]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "checklist") {
    const options = field.options ?? [];
    const selected = new Set(parseDelimitedValues(value));

    return (
      <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-[13px] text-[#111827]">
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                disabled={disabled}
                onChange={(event) => {
                  const nextSelected = new Set(selected);
                  if (event.target.checked) {
                    nextSelected.add(option.value);
                  } else {
                    nextSelected.delete(option.value);
                  }
                  onChange(Array.from(nextSelected).join(", "));
                }}
                className="h-4 w-4 rounded border border-[#cbd5e1]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.key === "documentLinksText") {
    return <DocumentLinksFieldEditor value={value} onChange={onChange} mediaAssets={mediaAssets} disabled={disabled} />;
  }

  const structuredConfig = getStructuredFieldConfig(field.key);
  if (structuredConfig) {
    return (
      <StructuredFieldEditor
        value={value}
        onChange={onChange}
        columns={structuredConfig.columns}
        addLabel={structuredConfig.addLabel}
        emptyTitle={structuredConfig.emptyTitle}
        emptyDescription={structuredConfig.emptyDescription}
        disabled={disabled}
      />
    );
  }

  if (field.key === "eventStatus") {
    return <WebinarStatusEditor value={value} onChange={onChange} field={field} disabled={disabled} />;
  }

  if (isMediaCapableField(field)) {
    return (
      <MediaFieldEditor
        field={field}
        value={value}
        onChange={onChange}
        disabled={disabled}
        mediaAssets={mediaAssets}
        onMediaAssetsChange={onMediaAssetsChange}
      />
    );
  }

  const datalistId = field.options?.length ? `${field.key}-input-options` : null;
  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        list={datalistId ?? undefined}
        disabled={disabled}
        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
      />
      {datalistId ? (
        <datalist id={datalistId}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      ) : null}
    </>
  );
}

function MediaFieldEditor({
  field,
  value,
  onChange,
  disabled = false,
  mediaAssets,
  onMediaAssetsChange,
}: {
  field: AdminFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  mediaAssets: MediaAsset[];
  onMediaAssetsChange: (assets: MediaAsset[]) => void;
}) {
  const [activeMode, setActiveMode] = useState<"library" | "upload" | "manual">("library");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAltText, setUploadAltText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const imageAssets = useMemo(
    () => mediaAssets.filter((asset) => asset.assetType === "image"),
    [mediaAssets],
  );
  const selectedAsset = imageAssets.find((asset) => asset.url === value) ?? null;
  const normalizedQuery = libraryQuery.trim().toLowerCase();
  const filteredAssets = useMemo(() => {
    if (!normalizedQuery) {
      return imageAssets;
    }

    return imageAssets.filter((asset) =>
      [asset.title, asset.altText, asset.category, asset.fileName, asset.url]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [imageAssets, normalizedQuery]);
  const uploadCategory = field.key.toLowerCase().includes("og") ? "seo" : "content";

  function uploadImage() {
    if (!uploadFile) {
      setNotice({ tone: "danger", text: "Choose an image file before uploading." });
      return;
    }

    startTransition(async () => {
      setNotice(null);
      const formData = new FormData();
      formData.set("title", uploadTitle || uploadFile.name);
      formData.set("altText", uploadAltText);
      formData.set("category", uploadCategory);
      formData.set("file", uploadFile);

      const response = await fetch("/api/admin/media-library", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            asset?: MediaAsset;
            assets?: MediaAsset[];
          }
        | null;

      if (!response.ok || !data?.asset || !data.assets) {
        setNotice({
          tone: "danger",
          text: data?.error ?? "Could not upload the image right now.",
        });
        return;
      }

      onMediaAssetsChange(data.assets);
      onChange(data.asset.url);
      setUploadTitle("");
      setUploadAltText("");
      setUploadFile(null);
      setActiveMode("library");
      setNotice({
        tone: "success",
        text: "Image uploaded, saved to the media library, and selected for this field.",
      });
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-3">
        {value ? (
          <div className="space-y-3">
            <img
              src={value}
              alt={field.label}
              className="h-32 w-full rounded-md border border-[#d1d5db] object-cover"
            />
            <div className="space-y-1">
              <p className="text-[12px] font-medium text-[#111827]">
                {selectedAsset?.title || "Custom media URL"}
              </p>
              {selectedAsset ? (
                <p className="text-[12px] text-[#6b7280]">
                  {formatAssetCategory(selectedAsset.category)} • updated {formatTimelineDate(selectedAsset.updatedAt)}
                </p>
              ) : (
                <p className="text-[12px] text-[#6b7280]">
                  Manual image URL. You can replace it with a media-library image at any time.
                </p>
              )}
              <p className="truncate text-[12px] text-[#6b7280]">{value}</p>
            </div>
          </div>
        ) : (
          <p className="text-[12px] leading-5 text-[#6b7280]">
            No image selected yet. Upload one here, choose from the media library, or paste a direct image URL.
          </p>
        )}
      </div>

      {notice ? (
        <div
          className={`rounded-lg border px-3 py-2 text-[12px] leading-5 ${
            notice.tone === "success"
              ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#166534]"
              : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "library", label: "Choose from media library" },
          { key: "upload", label: "Upload image" },
          { key: "manual", label: "Paste image URL" },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setActiveMode(option.key as "library" | "upload" | "manual")}
            disabled={disabled}
            className={`inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-medium ${
              activeMode === option.key
                ? "border-[#0f172a] bg-[#0f172a] text-white"
                : "border-[#d1d5db] bg-white text-[#111827]"
            }`}
          >
            {option.label}
          </button>
        ))}
        <Link
          href="/admin/media-library"
          className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
        >
          Open media library
        </Link>
      </div>

      {activeMode === "library" ? (
        <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
              Reusable images
            </p>
            <span className="text-[12px] text-[#6b7280]">
              {imageAssets.length} image{imageAssets.length === 1 ? "" : "s"} available
            </span>
          </div>
          <input
            value={libraryQuery}
            onChange={(event) => setLibraryQuery(event.target.value)}
            placeholder="Search image title, filename, category, or URL"
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
          />
          {filteredAssets.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {filteredAssets.slice(0, 8).map((asset) => (
                <div
                  key={asset.id}
                  className={`rounded-lg border p-2 ${
                    asset.url === value ? "border-[#0f172a] bg-[#f8fafc]" : "border-[#e5e7eb] bg-white"
                  }`}
                >
                  <div className="flex gap-2">
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.title}
                      className="h-14 w-14 rounded-md border border-[#d1d5db] object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-[12px] font-medium text-[#111827]">{asset.title}</p>
                      <p className="text-[12px] text-[#6b7280]">
                        {formatAssetCategory(asset.category)} • {asset.sourceKind === "upload" ? "Upload" : "External"}
                      </p>
                      <button
                        type="button"
                        onClick={() => onChange(asset.url)}
                        disabled={disabled}
                        className="inline-flex h-7 items-center rounded-lg border border-[#d1d5db] bg-white px-2.5 text-[12px] font-medium text-[#111827]"
                      >
                        {asset.url === value ? "Selected" : "Use this image"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-[12px] leading-5 text-[#6b7280]">
              No matching images yet. Upload one here or open the media library to add reusable assets first.
            </div>
          )}
        </div>
      ) : null}

      {activeMode === "upload" ? (
        <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-white p-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
            Upload image for this field
          </p>
          <input
            value={uploadTitle}
            onChange={(event) => setUploadTitle(event.target.value)}
            placeholder={`${field.label} image title`}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
          />
          <input
            value={uploadAltText}
            onChange={(event) => setUploadAltText(event.target.value)}
            placeholder="Alt text for accessibility"
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
          />
          <input
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[#111827]"
          />
          {uploadFile ? (
            <p className="text-[12px] leading-5 text-[#6b7280]">
              Selected file: {uploadFile.name}
            </p>
          ) : null}
          <button
            type="button"
            onClick={uploadImage}
            disabled={disabled || isPending}
            className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Uploading..." : "Upload and use image"}
          </button>
        </div>
      ) : null}

      {activeMode === "manual" ? (
        <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-white p-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
            Manual image URL
          </p>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder || "https://example.com/image.jpg"}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
          />
          <p className="text-[12px] leading-5 text-[#6b7280]">
            Use this only when the image is already hosted elsewhere and you do not want it saved into the media library.
          </p>
        </div>
      ) : null}

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={disabled}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
        >
          Remove selected image
        </button>
      ) : null}
    </div>
  );
}

function StructuredFieldEditor({
  value,
  onChange,
  columns,
  addLabel,
  emptyTitle,
  emptyDescription,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  columns: StructuredColumn[];
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  disabled?: boolean;
}) {
  const rows = useMemo(() => parseStructuredRows(value, columns.length), [value, columns.length]);

  function patchRows(updater: (rows: string[][]) => string[][]) {
    onChange(updateStructuredRows(value, columns.length, updater));
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-3">
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="rounded-lg border border-[#e5e7eb] bg-white p-3">
              <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_88px]">
                <div className={`grid gap-2 ${columns.length > 2 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
                  {columns.map((column, columnIndex) => (
                    <div
                      key={`${rowIndex}-${column.key}`}
                      className={column.type === "textarea" ? "space-y-1 md:col-span-2 xl:col-span-2" : "space-y-1"}
                    >
                      <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                        {column.label}
                      </label>
                      {column.type === "select" ? (
                        <select
                          value={row[columnIndex] ?? ""}
                          disabled={disabled}
                          onChange={(event) =>
                            patchRows((current) =>
                              current.map((currentRow, currentIndex) =>
                                currentIndex === rowIndex
                                  ? currentRow.map((cell, cellIndex) =>
                                      cellIndex === columnIndex ? event.target.value : cell,
                                    )
                                  : currentRow,
                              ),
                            )
                          }
                          className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                        >
                          <option value="">Select</option>
                          {(column.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : column.type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={row[columnIndex] ?? ""}
                          disabled={disabled}
                          onChange={(event) =>
                            patchRows((current) =>
                              current.map((currentRow, currentIndex) =>
                                currentIndex === rowIndex
                                  ? currentRow.map((cell, cellIndex) =>
                                      cellIndex === columnIndex ? event.target.value : cell,
                                    )
                                  : currentRow,
                              ),
                            )
                          }
                          placeholder={column.placeholder}
                          className="min-h-[72px] w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                        />
                      ) : (
                        <input
                          value={row[columnIndex] ?? ""}
                          disabled={disabled}
                          onChange={(event) =>
                            patchRows((current) =>
                              current.map((currentRow, currentIndex) =>
                                currentIndex === rowIndex
                                  ? currentRow.map((cell, cellIndex) =>
                                      cellIndex === columnIndex ? event.target.value : cell,
                                    )
                                  : currentRow,
                              ),
                            )
                          }
                          placeholder={column.placeholder}
                          className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      patchRows((current) => {
                        if (rowIndex === 0) return current;
                        const next = [...current];
                        [next[rowIndex - 1], next[rowIndex]] = [next[rowIndex], next[rowIndex - 1]];
                        return next;
                      })
                    }
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      patchRows((current) => {
                        if (rowIndex === current.length - 1) return current;
                        const next = [...current];
                        [next[rowIndex], next[rowIndex + 1]] = [next[rowIndex + 1], next[rowIndex]];
                        return next;
                      })
                    }
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      patchRows((current) => current.filter((_, currentIndex) => currentIndex !== rowIndex))
                    }
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 text-[12px] font-medium text-[#b91c1c]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#d1d5db] bg-white px-3 py-3">
          <p className="text-[13px] font-medium text-[#111827]">{emptyTitle}</p>
          <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">{emptyDescription}</p>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          patchRows((current) => [...current, columns.map((column) => column.options?.[0]?.value ?? "")])
        }
        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white"
      >
        {addLabel}
      </button>
    </div>
  );
}

function DocumentLinksFieldEditor({
  value,
  onChange,
  mediaAssets,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  mediaAssets: MediaAsset[];
  disabled?: boolean;
}) {
  const rows = useMemo(() => parseStructuredRows(value, 4), [value]);
  const documentAssets = useMemo(
    () => mediaAssets.filter((asset) => isDocumentAsset(asset)),
    [mediaAssets],
  );
  const [selectedAssetId, setSelectedAssetId] = useState("");

  function patchRows(updater: (rows: string[][]) => string[][]) {
    onChange(updateStructuredRows(value, 4, updater));
  }

  function addAssetRow(assetId: string) {
    const asset = documentAssets.find((item) => item.id === assetId);
    if (!asset) {
      return;
    }

    const sourceLabel =
      asset.category && asset.category !== "document"
        ? `Media library • ${formatAssetCategory(asset.category)}`
        : "Media library";
    const sourceDate = asset.updatedAt || asset.uploadedAt || "";

    patchRows((current) => [
      ...current,
      [asset.title, asset.url, sourceLabel, sourceDate],
    ]);
    setSelectedAssetId("");
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-3">
      <div className="space-y-2">
        <p className="text-[12px] leading-5 text-[#4b5563]">
          Attach reusable documents from the media library or add a manual link row for anything not saved yet.
        </p>
        {documentAssets.length ? (
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={selectedAssetId}
              disabled={disabled}
              onChange={(event) => {
                setSelectedAssetId(event.target.value);
                if (event.target.value) {
                  addAssetRow(event.target.value);
                }
              }}
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb]"
            >
              <option value="">Add a document from the media library</option>
              {documentAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title} • {formatAssetCategory(asset.category)}
                </option>
              ))}
            </select>
            <span className="inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-[12px] text-[#6b7280]">
              {documentAssets.length} reusable docs
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#d1d5db] bg-white px-3 py-2 text-[12px] leading-5 text-[#6b7280]">
            No document assets are saved yet. Add one in `/admin/media-library`, or create a manual attachment row below.
          </div>
        )}
      </div>

      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row, rowIndex) => {
            const linkedAsset = documentAssets.find((asset) => asset.url === (row[1] ?? "")) ?? null;

            return (
              <div key={`document-row-${rowIndex}`} className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium text-[#111827]">
                        {row[0] || linkedAsset?.title || `Attachment ${rowIndex + 1}`}
                      </p>
                      <AdminBadge
                        label={linkedAsset ? "Library asset" : "Manual link"}
                        tone={linkedAsset ? "info" : "default"}
                      />
                      {linkedAsset ? (
                        <AdminBadge
                          label={formatAssetCategory(linkedAsset.category)}
                          tone="warning"
                        />
                      ) : null}
                    </div>
                    <p className="text-[12px] leading-5 text-[#6b7280]">
                      {row[1] || "No document URL yet"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      patchRows((current) => current.filter((_, currentIndex) => currentIndex !== rowIndex))
                    }
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[12px] font-medium text-[#6b7280]"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Label", row[0] ?? "", "Attachment label"],
                    ["URL", row[1] ?? "", "https://example.com/factsheet.pdf"],
                    ["Source", row[2] ?? "", "Media library or issuer"],
                    ["Date", row[3] ?? "", "2026-04-21"],
                  ].map(([label, cellValue, placeholder], columnIndex) => (
                    <div key={`${rowIndex}-${label}`} className="space-y-1">
                      <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                        {label}
                      </label>
                      <input
                        value={cellValue}
                        disabled={disabled}
                        onChange={(event) =>
                          patchRows((current) =>
                            current.map((currentRow, currentIndex) =>
                              currentIndex === rowIndex
                                ? currentRow.map((cell, cellIndex) =>
                                    cellIndex === columnIndex ? event.target.value : cell,
                                  )
                                : currentRow,
                            ),
                          )
                        }
                        placeholder={placeholder}
                        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                      />
                    </div>
                  ))}
                </div>

                {documentAssets.length ? (
                  <div className="mt-3">
                    <select
                      value=""
                      disabled={disabled}
                      onChange={(event) => {
                        const asset = documentAssets.find((item) => item.id === event.target.value);
                        if (!asset) {
                          return;
                        }

                        patchRows((current) =>
                          current.map((currentRow, currentIndex) =>
                            currentIndex === rowIndex
                              ? [
                                  asset.title,
                                  asset.url,
                                  asset.category && asset.category !== "document"
                                    ? `Media library • ${formatAssetCategory(asset.category)}`
                                    : "Media library",
                                  asset.updatedAt || asset.uploadedAt || "",
                                ]
                              : currentRow,
                          ),
                        );
                      }}
                      className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                    >
                      <option value="">Replace this row with a library document</option>
                      {documentAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title} • {formatAssetCategory(asset.category)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#d1d5db] bg-white px-3 py-3">
          <p className="text-[13px] font-medium text-[#111827]">No linked documents yet</p>
          <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">
            Add a library document above or create a manual row for a factsheet, disclosure, or resource link.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => patchRows((current) => [...current, ["", "", "", ""]])}
        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white"
      >
        Add manual document row
      </button>
    </div>
  );
}

function WebinarStatusEditor({
  value,
  onChange,
  field,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  field: AdminFieldDefinition;
  disabled?: boolean;
}) {
  const options = field.options ?? [];

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        {[
          ["upcoming", "Upcoming"],
          ["live", "Go live"],
          ["replay_only", "Move to replay"],
        ].map(([nextValue, label]) => (
          <button
            key={nextValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(nextValue)}
            className={`inline-flex h-8 items-center justify-center rounded-lg border px-3 text-[12px] font-medium ${
              value === nextValue
                ? "border-[#0f172a] bg-[#0f172a] text-white"
                : "border-[#d1d5db] bg-white text-[#111827]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[12px] leading-5 text-[#6b7280]">
        Use the quick actions to move the webinar from upcoming to live, then into replay mode once the session is done.
      </p>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eef0f4] pb-1.5 last:border-b-0 last:pb-0">
      <span className="text-[12px] text-[#6b7280]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function FieldValuePreview({ value }: { value: string }) {
  return (
    <div className="max-w-[220px] whitespace-pre-wrap break-words rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-2 text-[13px] leading-5 text-[#111827]">
      {value || <span className="text-[#6b7280]">Not set</span>}
    </div>
  );
}

function AdminAdvancedPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border border-[#d1d5db] bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-[14px] py-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
            <AdminBadge label="Advanced" tone="default" />
          </div>
          <p className="text-sm leading-5 text-[#4b5563]">{description}</p>
        </div>
        <span className="text-[12px] font-medium text-[#6b7280]">Show</span>
      </summary>
      <div className="border-t border-[#e5e7eb] p-[14px] pt-3">{children}</div>
    </details>
  );
}
