import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  adminFamilyMeta,
  type AdminEditorRecord,
  type AdminFamilyKey,
  type AdminListRow,
} from "@/lib/admin-content-schema";
import {
  getAdminFamilyRows,
  getAdminRecordEditorData,
} from "@/lib/admin-content-registry";
import {
  hasDurableCmsStateStore,
  listDurableAdminImportBatches,
  listDurableAdminImportRows,
  replaceDurableAdminImportRows,
  saveDurableAdminImportBatch,
} from "@/lib/cms-durable-state";
import { buildCsvTemplate, parseCsvText, type CsvRow } from "@/lib/csv-import";
import {
  assertAdminEmailValue,
  assertAdminHttpUrlValue,
  assertAdminRouteValue,
  assertAdminSlugValue,
  cleanAdminIsoOrNull,
  cleanAdminString,
} from "@/lib/admin-validation";
import {
  getAdminManagedRecord,
  getAdminOperatorStore,
  type AdminManagedImportItem,
  type SaveAdminRecordInput,
} from "@/lib/admin-operator-store";
import { saveAdminPendingApproval } from "@/lib/admin-approvals";
import { persistApprovedAdminRecordChange } from "@/lib/admin-record-workflow";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { canEditAdminFamily, hasProductUserCapability, type ProductUserCapability, type ProductUserRole } from "@/lib/product-permissions";

export const supportedAdminImportFamilies = [
  "stocks",
  "mutual-funds",
  "indices",
  "etfs",
  "pms",
  "aif",
  "sif",
] as const;

export type SupportedAdminImportFamily = (typeof supportedAdminImportFamilies)[number];
export type AdminImportMode = "create_new_only" | "update_existing_only" | "create_or_update";
export type AdminImportBatchStatus =
  | "preview_ready"
  | "completed"
  | "completed_with_errors"
  | "queued_for_approval"
  | "failed";
export type AdminImportRowStatus =
  | "valid"
  | "warning"
  | "failed"
  | "created"
  | "updated"
  | "skipped"
  | "queued_for_approval";
export type AdminImportOperation = "create" | "update" | "skip" | "queue_for_approval";

export type AdminImportFieldKey = string;

export type AdminImportFieldValueType =
  | "text"
  | "slug"
  | "route"
  | "url"
  | "url_or_path"
  | "date"
  | "email"
  | "publish_state"
  | "yes_no";

export type AdminImportFieldDefinition = {
  key: AdminImportFieldKey;
  label: string;
  required: boolean;
  description: string;
  example: string;
  aliases: string[];
  sectionKey: string;
  sectionLabel: string;
  valueType?: AdminImportFieldValueType;
  importOnly?: boolean;
  repeatedFieldFormat?: string | null;
};

export type AdminImportTemplateGroup = {
  key: string;
  label: string;
  description: string;
  fieldKeys: string[];
};

export type AdminImportRepeatedFieldHelp = {
  key: string;
  label: string;
  howToFormat: string;
  example: string;
};

export type AdminImportTemplate = {
  family: SupportedAdminImportFamily;
  label: string;
  singular: string;
  description: string;
  fileName: string;
  matchingHelp: string;
  importHelp: string[];
  requiredColumns: string[];
  optionalColumns: string[];
  fields: AdminImportFieldDefinition[];
  groups: AdminImportTemplateGroup[];
  repeatedFieldHelp: AdminImportRepeatedFieldHelp[];
  afterImportHelp: string[];
  sampleCsv: string;
};

export type AdminImportBatch = {
  id: string;
  family: SupportedAdminImportFamily;
  actorUserId: string | null;
  actorEmail: string;
  fileName: string;
  importMode: AdminImportMode;
  status: AdminImportBatchStatus;
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
  fieldMapping: Record<string, AdminImportFieldKey>;
  uploadedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminImportBatchRow = {
  id: string;
  batchId: string;
  rowNumber: number;
  identifier: string | null;
  title: string | null;
  slug: string | null;
  matchedRecordId: string | null;
  matchedSlug: string | null;
  operation: AdminImportOperation;
  status: AdminImportRowStatus;
  warnings: string[];
  errors: string[];
  payload: Record<AdminImportFieldKey, string>;
  resultNote: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminImportPreview = {
  family: SupportedAdminImportFamily;
  fileName: string;
  importMode: AdminImportMode;
  template: AdminImportTemplate;
  fieldMapping: Record<string, AdminImportFieldKey>;
  unmappedHeaders: string[];
  availableFields: Array<{ key: AdminImportFieldKey; label: string }>;
  rows: AdminImportBatchRow[];
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  canImport: boolean;
};

export type ExecuteAdminImportResult = {
  batch: AdminImportBatch;
  rows: AdminImportBatchRow[];
};

type ImportStore = {
  version: number;
  batches: AdminImportBatch[];
  rows: AdminImportBatchRow[];
  updatedAt: string | null;
};

const STORE_PATH = path.join(process.cwd(), "data", "admin-import-batches.json");
const STORE_VERSION = 1;

const publishStateValues = new Set(["draft", "ready_for_review", "needs_fix", "published", "archived"]);
const expectedModeValues = new Set<AdminImportMode>([
  "create_new_only",
  "update_existing_only",
  "create_or_update",
]);

let storeCache:
  | {
      mtimeMs: number;
      store: ImportStore;
    }
  | null = null;

type AdminImportBatchLike = {
  id?: string | null;
  family?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  fileName?: string | null;
  importMode?: string | null;
  status?: string | null;
  sourceKind?: string | null;
  storageMode?: string | null;
  totalRows?: number | string | null;
  validRows?: number | string | null;
  warningRows?: number | string | null;
  failedRows?: number | string | null;
  createdCount?: number | string | null;
  updatedCount?: number | string | null;
  queuedCount?: number | string | null;
  skippedCount?: number | string | null;
  failedCount?: number | string | null;
  summary?: string | null;
  fieldMapping?: Record<string, string> | null;
  uploadedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AdminImportBatchRowLike = Omit<
  Partial<AdminImportBatchRow>,
  "payload" | "operation" | "status"
> & {
  payload?: Record<string, unknown> | null;
  operation?: string | null;
  status?: string | null;
};

type AdminImportTemplateConfig = {
  description: string;
  matchingHelp: string;
  importHelp: string[];
  groups: Array<{
    key: string;
    label: string;
    description: string;
    fields: AdminImportFieldDefinition[];
  }>;
  repeatedFieldHelp: AdminImportRepeatedFieldHelp[];
  afterImportHelp: string[];
  sampleRow: Record<string, string>;
};

function createField(
  input: Omit<AdminImportFieldDefinition, "sectionKey" | "sectionLabel"> & {
    sectionKey: string;
    sectionLabel: string;
  },
): AdminImportFieldDefinition {
  return {
    valueType: "text",
    importOnly: false,
    repeatedFieldFormat: null,
    ...input,
  };
}

const stockImportTemplateConfig: AdminImportTemplateConfig = {
  description:
    "Import stock drafts with the same identity, workflow, editorial, SEO, publishing, and reference fields the stock editor already uses.",
  matchingHelp:
    "We match stocks by slug first, then symbol. Imports create or update draft editor records, not direct live pages.",
  importHelp: [
    "Use the sample CSV if you want the column names to match the stock editor labels your team already sees on screen.",
    "Imports save reviewable stock drafts into the normal editor so someone can open the record and continue working.",
    "Assigned to only sets the workflow owner for the draft. Import history still stays linked to the currently signed-in operator who uploaded the CSV.",
    "If a row matches an existing stock, the importer keeps any blank optional fields unchanged and only updates the fields you provided.",
  ],
  groups: [
    {
      key: "identity",
      label: "Hero / identity",
      description: "The company identity at the top of the stock editor.",
      fields: [
        createField({
          key: "companyName",
          label: "Company name",
          required: true,
          description: "The public company name shown in the editor header and page hero.",
          example: "Tata Motors",
          aliases: ["companyName", "company_name", "title", "name"],
          sectionKey: "identity",
          sectionLabel: "Hero / identity",
        }),
        createField({
          key: "slug",
          label: "Slug",
          required: true,
          description: "The stock page identifier. Use lowercase letters, numbers, and hyphens only.",
          example: "tata-motors",
          aliases: ["slug", "stock_slug", "page_slug"],
          sectionKey: "identity",
          sectionLabel: "Hero / identity",
          valueType: "slug",
        }),
        createField({
          key: "symbol",
          label: "Symbol",
          required: true,
          description: "The stock symbol already known in the system.",
          example: "TATAMOTORS",
          aliases: ["symbol", "ticker", "stock_symbol"],
          sectionKey: "identity",
          sectionLabel: "Hero / identity",
        }),
        createField({
          key: "sector",
          label: "Sector",
          required: false,
          description: "A plain-language sector label such as Auto or Banking.",
          example: "Auto",
          aliases: ["sector"],
          sectionKey: "identity",
          sectionLabel: "Hero / identity",
        }),
        createField({
          key: "sectorIndexSlug",
          label: "Benchmark / sector mapping",
          required: false,
          description: "The related sector or benchmark slug already known in the system.",
          example: "nifty_auto",
          aliases: ["sectorIndexSlug", "sector_index_slug", "benchmarkMapping", "benchmark_mapping", "benchmark"],
          sectionKey: "identity",
          sectionLabel: "Hero / identity",
        }),
      ],
    },
    {
      key: "workflow",
      label: "Workflow and assignment",
      description: "Status, owner, and deadline fields used by content managers.",
      fields: [
        createField({
          key: "publishState",
          label: "Content status",
          required: false,
          description: "Use draft, ready_for_review, or needs_fix. Published or archived values are converted back to draft during import.",
          example: "draft",
          aliases: ["publishState", "publish_state", "status", "workflow_status"],
          sectionKey: "workflow",
          sectionLabel: "Workflow and assignment",
          valueType: "publish_state",
        }),
        createField({
          key: "assignedTo",
          label: "Assigned to",
          required: false,
          description:
            "Workflow owner email for this draft. This does not change who the CSV import is attributed to in activity history.",
          example: "editor@example.com",
          aliases: ["assignedTo", "assigned_to", "assignee", "owner"],
          sectionKey: "workflow",
          sectionLabel: "Workflow and assignment",
          valueType: "email",
        }),
        createField({
          key: "dueDate",
          label: "Due date",
          required: false,
          description: "Target date for review or completion.",
          example: "2026-04-30",
          aliases: ["dueDate", "due_date", "target_date"],
          sectionKey: "workflow",
          sectionLabel: "Workflow and assignment",
          valueType: "date",
        }),
      ],
    },
    {
      key: "frontend_fields",
      label: "Performance, fundamentals, and support",
      description: "The stock editor section that controls public summary, facts, support blocks, and FAQs.",
      fields: [
        createField({
          key: "summary",
          label: "Summary",
          required: false,
          description: "Short public summary for the stock page.",
          example: "India-focused auto leader with EV and CV exposure.",
          aliases: ["summary", "short_description", "description"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
        }),
        createField({
          key: "thesis",
          label: "Editorial thesis",
          required: false,
          description: "The main editorial angle for why this stock matters.",
          example: "Recovery in domestic demand plus EV optionality supports the thesis.",
          aliases: ["thesis", "editorial_thesis"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
        }),
        createField({
          key: "momentumLabel",
          label: "Headline label",
          required: false,
          description: "A short label used near the top of the stock content block.",
          example: "Auto leader",
          aliases: ["momentumLabel", "headline_label", "headlineLabel"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
        }),
        createField({
          key: "keyPointsText",
          label: "Key points",
          required: false,
          description: "Short supporting bullets for the stock page.",
          example: "CV cycle support ;; EV launches improving visibility",
          aliases: ["keyPointsText", "key_points", "keypoints"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
          repeatedFieldFormat: "Use `;;` to separate points.",
        }),
        createField({
          key: "quickStatsText",
          label: "Quick stats",
          required: false,
          description: "Quick fact rows in `Label | Value` format.",
          example: "Market cap | Rs 2.8T ;; P/E | 21.4x",
          aliases: ["quickStatsText", "quick_stats", "stats"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "fundamentalsText",
          label: "Fundamentals",
          required: false,
          description: "Fundamental rows in `Label | Value | Note` format.",
          example: "Revenue | Rs 4.3L Cr | FY25 ;; EPS | 27.2 | FY25",
          aliases: ["fundamentalsText", "fundamentals"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "shareholdingText",
          label: "Shareholding",
          required: false,
          description: "Shareholding rows in `Label | Value | Note` format.",
          example: "Promoters | 46.4% | Mar 2026 ;; FIIs | 16.1% | Mar 2026",
          aliases: ["shareholdingText", "shareholding"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "peerConfigText",
          label: "Peer / related route configuration",
          required: false,
          description: "Peer rows in `Label | /stocks/slug | Why it belongs here` format.",
          example: "Maruti Suzuki | /stocks/maruti-suzuki | Passenger vehicle peer",
          aliases: ["peerConfigText", "peer_config", "related_routes"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "newsReadinessNote",
          label: "Latest news readiness / config",
          required: false,
          description: "Plain-language note about how the latest-news block should behave.",
          example: "News rows are ready, but keep the block focused on results and EV launches.",
          aliases: ["newsReadinessNote", "latest_news_config", "news_config"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
        }),
        createField({
          key: "newsItemsText",
          label: "News items",
          required: false,
          description: "News rows in `Title | Source | Type` format.",
          example: "Q4 results beat estimates | Mint | results ;; EV launch roadmap shared | CNBC-TV18 | product",
          aliases: ["newsItemsText", "news_items"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "faqText",
          label: "FAQ items",
          required: false,
          description: "FAQ rows in `Question | Answer` format.",
          example: "What drives this stock? | Auto demand, margins, and capital allocation.",
          aliases: ["faqText", "faqs", "faq_items"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "manualNotes",
          label: "Public editorial note",
          required: false,
          description: "An operator-controlled note shown on the page support blocks.",
          example: "Watch the domestic CV cycle and margin follow-through.",
          aliases: ["manualNotes", "public_editorial_note", "editorial_note"],
          sectionKey: "frontend_fields",
          sectionLabel: "Performance, fundamentals, and support",
        }),
      ],
    },
    {
      key: "seo",
      label: "SEO and sharing",
      description: "Search and sharing settings for the stock page.",
      fields: [
        createField({
          key: "metaTitle",
          label: "Meta title",
          required: false,
          description: "Search result title for the stock page.",
          example: "Tata Motors share price, thesis, fundamentals, and FAQs",
          aliases: ["metaTitle", "meta_title", "seo_title"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
        }),
        createField({
          key: "metaDescription",
          label: "Meta description",
          required: false,
          description: "Search result description for the stock page.",
          example: "Editorial overview of Tata Motors with key points, fundamentals, and peer context.",
          aliases: ["metaDescription", "meta_description", "seo_description"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
        }),
        createField({
          key: "ogImage",
          label: "OG image",
          required: false,
          description: "Use a media-library path or a full https URL.",
          example: "/media-library/stocks/tata-motors-og.jpg",
          aliases: ["ogImage", "og_image", "social_image"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
          valueType: "url_or_path",
        }),
        createField({
          key: "canonicalUrl",
          label: "Canonical URL",
          required: false,
          description: "Optional canonical URL for search engines.",
          example: "https://riddra.com/stocks/tata-motors",
          aliases: ["canonicalUrl", "canonical_url", "canonical"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
          valueType: "url",
        }),
        createField({
          key: "noIndex",
          label: "Noindex",
          required: false,
          description: "Use yes or no.",
          example: "no",
          aliases: ["noIndex", "no_index", "noindex"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
          valueType: "yes_no",
        }),
      ],
    },
    {
      key: "publishing",
      label: "Access and publishing",
      description: "Route and publishing controls for the stock page.",
      fields: [
        createField({
          key: "publicRoute",
          label: "Public route",
          required: false,
          description: "The route that opens the stock page. Leave blank to use the default family route.",
          example: "/stocks/tata-motors",
          aliases: ["publicRoute", "public_route", "publicHref", "route", "canonicalRoute"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
          valueType: "route",
        }),
        createField({
          key: "scheduledPublishAt",
          label: "Scheduled publish",
          required: false,
          description: "Optional automatic publish time.",
          example: "2026-05-01T09:00:00Z",
          aliases: ["scheduledPublishAt", "scheduled_publish_at", "publish_at"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
          valueType: "date",
        }),
        createField({
          key: "scheduledUnpublishAt",
          label: "Scheduled unpublish",
          required: false,
          description: "Optional automatic unpublish time.",
          example: "2026-05-31T18:00:00Z",
          aliases: ["scheduledUnpublishAt", "scheduled_unpublish_at", "unpublish_at"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
          valueType: "date",
        }),
        createField({
          key: "latestNewsReady",
          label: "Latest news ready",
          required: false,
          description: "Use yes or no.",
          example: "yes",
          aliases: ["latestNewsReady", "latest_news_ready"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
          valueType: "yes_no",
        }),
        createField({
          key: "publishNote",
          label: "Publish note",
          required: false,
          description: "Internal note about route readiness or review.",
          example: "Ready once the FAQ and peer rows are reviewed.",
          aliases: ["publishNote", "publish_note"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
        }),
      ],
    },
    {
      key: "documents_links",
      label: "Documents and references",
      description: "Traceable filing, factsheet, and reference links.",
      fields: [
        createField({
          key: "documentLinksText",
          label: "Document links",
          required: false,
          description: "Document rows in `Label | URL | Source label | Source date` format.",
          example: "Annual report | https://example.com/annual-report.pdf | Company filing | 2026-03-31",
          aliases: ["documentLinksText", "document_links", "documents"],
          sectionKey: "documents_links",
          sectionLabel: "Documents and references",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "fundamentalsSourceUrl",
          label: "Fundamentals source URL",
          required: false,
          description: "Supporting URL for the fundamentals block.",
          example: "https://example.com/fundamentals.pdf",
          aliases: ["fundamentalsSourceUrl", "fundamentals_source_url", "sourceUrl"],
          sectionKey: "documents_links",
          sectionLabel: "Documents and references",
          valueType: "url",
        }),
        createField({
          key: "shareholdingSourceUrl",
          label: "Shareholding source URL",
          required: false,
          description: "Supporting URL for the shareholding block.",
          example: "https://example.com/shareholding.pdf",
          aliases: ["shareholdingSourceUrl", "shareholding_source_url"],
          sectionKey: "documents_links",
          sectionLabel: "Documents and references",
          valueType: "url",
        }),
      ],
    },
  ],
  repeatedFieldHelp: [
    {
      key: "quickStatsText",
      label: "Quick stats",
      howToFormat: "Use `;;` between rows. Inside each row use `Label | Value`.",
      example: "Market cap | Rs 2.8T ;; P/E | 21.4x",
    },
    {
      key: "faqText",
      label: "FAQ items",
      howToFormat: "Use `;;` between rows. Inside each row use `Question | Answer`.",
      example: "What drives this stock? | Auto demand, margins, and capital allocation.",
    },
    {
      key: "documentLinksText",
      label: "Document links",
      howToFormat: "Use `;;` between rows. Inside each row use `Label | URL | Source label | Source date`.",
      example:
        "Annual report | https://example.com/annual-report.pdf | Company filing | 2026-03-31 ;; Investor presentation | https://example.com/presentation.pdf | Company filing | 2026-01-20",
    },
    {
      key: "newsItemsText",
      label: "News items",
      howToFormat: "Use `;;` between rows. Inside each row use `Title | Source | Type`.",
      example: "Q4 results beat estimates | Mint | results ;; EV launch roadmap shared | CNBC-TV18 | product",
    },
  ],
  afterImportHelp: [
    "The importer saves the row into the normal stock editor as a draft or review-ready record.",
    "Open the stock editor to check the imported sections and make any fixes.",
    "Editors can submit the imported stock for approval. Admins approve it from the approvals page.",
    "Nothing goes live from import alone. A separate publish decision is still required.",
  ],
  sampleRow: {
    companyName: "Import Test Stock",
    slug: "import-test-stock",
    symbol: "IMPTEST",
    sector: "Auto",
    sectorIndexSlug: "nifty_auto",
    publishState: "draft",
    assignedTo: "editor@example.com",
    dueDate: "2026-04-30",
    summary: "Imported stock summary for editor review.",
    thesis: "Commercial vehicle recovery plus EV optionality supports the draft thesis.",
    momentumLabel: "Auto leader",
    keyPointsText: "CV cycle support ;; EV launches improving visibility",
    quickStatsText: "Market cap | Rs 2.8T ;; P/E | 21.4x",
    fundamentalsText: "Revenue | Rs 4.3L Cr | FY25 ;; EPS | 27.2 | FY25",
    shareholdingText: "Promoters | 46.4% | Mar 2026 ;; FIIs | 16.1% | Mar 2026",
    peerConfigText: "Maruti Suzuki | /stocks/maruti-suzuki | Passenger vehicle peer",
    newsReadinessNote: "Keep the latest-news block focused on results and EV launches.",
    newsItemsText: "Q4 results beat estimates | Mint | results",
    faqText: "What drives this stock? | Auto demand, margins, and capital allocation.",
    manualNotes: "Watch domestic CV demand and margin follow-through.",
    metaTitle: "Import Test Stock share price, thesis, fundamentals, and FAQs",
    metaDescription: "Editorial overview of Import Test Stock with key points and support content.",
    ogImage: "/media-library/stocks/import-test-stock-og.jpg",
    canonicalUrl: "https://riddra.com/stocks/import-test-stock",
    noIndex: "no",
    publicRoute: "/stocks/import-test-stock",
    scheduledPublishAt: "",
    scheduledUnpublishAt: "",
    latestNewsReady: "yes",
    publishNote: "Ready once the imported FAQ and peer rows are reviewed.",
    documentLinksText:
      "Annual report | https://example.com/annual-report.pdf | Company filing | 2026-03-31",
    fundamentalsSourceUrl: "https://example.com/fundamentals.pdf",
    shareholdingSourceUrl: "https://example.com/shareholding.pdf",
  },
};

const fundImportTemplateConfig: AdminImportTemplateConfig = {
  description:
    "Import mutual-fund drafts with the same identity, workflow, editorial, SEO, publishing, and document fields the fund editor actually supports.",
  matchingHelp:
    "We match funds by slug first, then scheme code, then fund name. Imports create or update draft editor records, not direct live pages.",
  importHelp: [
    "Use the sample CSV if you want the field names to match the mutual-fund editor exactly.",
    "Scheme code is only used to match an existing fund. It does not appear as a normal editor field.",
    "Imports keep blank optional fields untouched on matched records so you can do partial fund updates safely.",
  ],
  groups: [
    {
      key: "identity",
      label: "Hero / fund identity",
      description: "The identity section at the top of the mutual-fund editor.",
      fields: [
        createField({
          key: "fundName",
          label: "Fund name",
          required: true,
          description: "The public fund name shown in the editor header and hero.",
          example: "HDFC Mid-Cap Opportunities Fund",
          aliases: ["fundName", "fund_name", "title", "name"],
          sectionKey: "identity",
          sectionLabel: "Hero / fund identity",
        }),
        createField({
          key: "slug",
          label: "Slug",
          required: true,
          description: "The mutual-fund page identifier. Use lowercase letters, numbers, and hyphens only.",
          example: "hdfc-mid-cap-opportunities",
          aliases: ["slug", "fund_slug", "page_slug"],
          sectionKey: "identity",
          sectionLabel: "Hero / fund identity",
          valueType: "slug",
        }),
        createField({
          key: "schemeCode",
          label: "Scheme code",
          required: false,
          description: "Matching helper for existing AMFI-style fund rows.",
          example: "140503",
          aliases: ["schemeCode", "scheme_code", "amfi_code"],
          sectionKey: "identity",
          sectionLabel: "Hero / fund identity",
          importOnly: true,
        }),
        createField({
          key: "category",
          label: "Category",
          required: false,
          description: "Category label used in the fund hero.",
          example: "Mid Cap Fund",
          aliases: ["category", "fund_category"],
          sectionKey: "identity",
          sectionLabel: "Hero / fund identity",
        }),
        createField({
          key: "benchmarkLabel",
          label: "Benchmark label",
          required: false,
          description: "Plain-language benchmark label shown in the hero.",
          example: "Nifty Midcap 150",
          aliases: ["benchmarkLabel", "benchmark_label", "benchmark"],
          sectionKey: "identity",
          sectionLabel: "Hero / fund identity",
        }),
        createField({
          key: "benchmarkIndexSlug",
          label: "Benchmark mapping",
          required: false,
          description: "Benchmark slug already known in the system.",
          example: "niftymidcap150",
          aliases: ["benchmarkIndexSlug", "benchmark_index_slug", "benchmarkMapping", "benchmark_mapping"],
          sectionKey: "identity",
          sectionLabel: "Hero / fund identity",
        }),
      ],
    },
    {
      key: "workflow",
      label: "Workflow and assignment",
      description: "Status, owner, and deadline fields used by content managers.",
      fields: [
        createField({
          key: "publishState",
          label: "Content status",
          required: false,
          description: "Use draft, ready_for_review, or needs_fix. Published or archived values are converted back to draft during import.",
          example: "draft",
          aliases: ["publishState", "publish_state", "status", "workflow_status"],
          sectionKey: "workflow",
          sectionLabel: "Workflow and assignment",
          valueType: "publish_state",
        }),
        createField({
          key: "assignedTo",
          label: "Assigned to",
          required: false,
          description: "Editor or reviewer email for this draft.",
          example: "editor@example.com",
          aliases: ["assignedTo", "assigned_to", "assignee", "owner"],
          sectionKey: "workflow",
          sectionLabel: "Workflow and assignment",
          valueType: "email",
        }),
        createField({
          key: "dueDate",
          label: "Due date",
          required: false,
          description: "Target date for review or completion.",
          example: "2026-04-30",
          aliases: ["dueDate", "due_date", "target_date"],
          sectionKey: "workflow",
          sectionLabel: "Workflow and assignment",
          valueType: "date",
        }),
      ],
    },
    {
      key: "frontend_fields",
      label: "Returns, holdings, and support",
      description: "The mutual-fund editor section that controls returns, manager context, holdings, allocation, and public support notes.",
      fields: [
        createField({
          key: "summary",
          label: "Summary",
          required: false,
          description: "Short public summary for the fund page.",
          example: "Mid-cap fund focused on growth-oriented businesses with active stock selection.",
          aliases: ["summary", "short_description", "description"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "angle",
          label: "Editorial angle",
          required: false,
          description: "Why this fund deserves an editorial page.",
          example: "Useful for investors who want active mid-cap exposure with benchmark-aware framing.",
          aliases: ["angle", "editorial_angle"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "riskLabel",
          label: "Risk label",
          required: false,
          description: "Short risk label shown near the top of the fund page.",
          example: "Moderate to high",
          aliases: ["riskLabel", "risk_label"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "aum",
          label: "AUM",
          required: false,
          description: "Fund size text as you want it displayed.",
          example: "Rs 78,000 Cr",
          aliases: ["aum"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "expenseRatio",
          label: "Expense ratio",
          required: false,
          description: "Expense ratio text as you want it displayed.",
          example: "0.78%",
          aliases: ["expenseRatio", "expense_ratio"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "returnsTableText",
          label: "Return ladder",
          required: false,
          description: "Return rows in `Window | Return` format.",
          example: "1Y | 22.4% ;; 3Y | 18.9%",
          aliases: ["returnsTableText", "returns_table", "return_ladder"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "keyPointsText",
          label: "Key points",
          required: false,
          description: "Short supporting bullets for the fund page.",
          example: "Mid-cap bias with benchmark-aware diversification ;; Suitable for long-term risk-taking investors",
          aliases: ["keyPointsText", "key_points"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
          repeatedFieldFormat: "Use `;;` to separate points.",
        }),
        createField({
          key: "holdingsText",
          label: "Holdings",
          required: false,
          description: "Holdings rows in `Holding | Sector | Weight` format.",
          example: "BSE | Capital Markets | 6.2% ;; Max Healthcare | Healthcare | 5.1%",
          aliases: ["holdingsText", "holdings"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "sectorAllocationText",
          label: "Sector allocation",
          required: false,
          description: "Sector rows in `Sector | Weight` format.",
          example: "Financial Services | 18.2% ;; Industrials | 14.6%",
          aliases: ["sectorAllocationText", "sector_allocation", "allocation"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "fundManagerName",
          label: "Fund manager",
          required: false,
          description: "Lead fund-manager name shown on the page.",
          example: "Anand Radhakrishnan",
          aliases: ["fundManagerName", "fund_manager_name", "manager_name"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "fundManagerSince",
          label: "Manager since",
          required: false,
          description: "When the current manager started.",
          example: "2020",
          aliases: ["fundManagerSince", "fund_manager_since"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "fundManagerExperience",
          label: "Manager experience",
          required: false,
          description: "Short manager-experience label.",
          example: "18 years",
          aliases: ["fundManagerExperience", "fund_manager_experience"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "fundManagerStyle",
          label: "Manager style",
          required: false,
          description: "Short description of manager style or process.",
          example: "Growth with quality bias",
          aliases: ["fundManagerStyle", "fund_manager_style", "manager_style"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
        createField({
          key: "manualNotes",
          label: "Public editorial note",
          required: false,
          description: "Operator-controlled note shown in the support content.",
          example: "Use this draft to add benchmark context and manager style before approval.",
          aliases: ["manualNotes", "public_editorial_note", "editorial_note"],
          sectionKey: "frontend_fields",
          sectionLabel: "Returns, holdings, and support",
        }),
      ],
    },
    {
      key: "seo",
      label: "SEO and sharing",
      description: "Search and sharing settings for the mutual-fund page.",
      fields: [
        createField({
          key: "metaTitle",
          label: "Meta title",
          required: false,
          description: "Search result title for the fund page.",
          example: "Import Test Mutual Fund returns, holdings, and manager context",
          aliases: ["metaTitle", "meta_title", "seo_title"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
        }),
        createField({
          key: "metaDescription",
          label: "Meta description",
          required: false,
          description: "Search result description for the fund page.",
          example: "Editorial overview of the fund with returns framing, holdings, and benchmark context.",
          aliases: ["metaDescription", "meta_description", "seo_description"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
        }),
        createField({
          key: "ogImage",
          label: "OG image",
          required: false,
          description: "Use a media-library path or a full https URL.",
          example: "/media-library/funds/import-test-mutual-fund-og.jpg",
          aliases: ["ogImage", "og_image", "social_image"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
          valueType: "url_or_path",
        }),
        createField({
          key: "canonicalUrl",
          label: "Canonical URL",
          required: false,
          description: "Optional canonical URL for search engines.",
          example: "https://riddra.com/mutual-funds/import-test-mutual-fund",
          aliases: ["canonicalUrl", "canonical_url", "canonical"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
          valueType: "url",
        }),
        createField({
          key: "noIndex",
          label: "Noindex",
          required: false,
          description: "Use yes or no.",
          example: "no",
          aliases: ["noIndex", "no_index", "noindex"],
          sectionKey: "seo",
          sectionLabel: "SEO and sharing",
          valueType: "yes_no",
        }),
      ],
    },
    {
      key: "publishing",
      label: "Access and publishing",
      description: "Route and publishing controls for the mutual-fund page.",
      fields: [
        createField({
          key: "publicRoute",
          label: "Public route",
          required: false,
          description: "The route that opens the mutual-fund page. Leave blank to use the default family route.",
          example: "/mutual-funds/import-test-mutual-fund",
          aliases: ["publicRoute", "public_route", "publicHref", "route", "canonicalRoute"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
          valueType: "route",
        }),
        createField({
          key: "scheduledPublishAt",
          label: "Scheduled publish",
          required: false,
          description: "Optional automatic publish time.",
          example: "2026-05-01T09:00:00Z",
          aliases: ["scheduledPublishAt", "scheduled_publish_at", "publish_at"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
          valueType: "date",
        }),
        createField({
          key: "scheduledUnpublishAt",
          label: "Scheduled unpublish",
          required: false,
          description: "Optional automatic unpublish time.",
          example: "2026-05-31T18:00:00Z",
          aliases: ["scheduledUnpublishAt", "scheduled_unpublish_at", "unpublish_at"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
          valueType: "date",
        }),
        createField({
          key: "publishNote",
          label: "Publish note",
          required: false,
          description: "Internal note about route readiness or review.",
          example: "Ready once the holdings and benchmark rows are reviewed.",
          aliases: ["publishNote", "publish_note"],
          sectionKey: "publishing",
          sectionLabel: "Access and publishing",
        }),
      ],
    },
    {
      key: "documents_links",
      label: "Documents and references",
      description: "Traceable factsheet, holdings, and supporting reference links.",
      fields: [
        createField({
          key: "documentLinksText",
          label: "Document links",
          required: false,
          description: "Document rows in `Label | URL | Source label | Source date` format.",
          example: "Factsheet PDF | https://example.com/factsheet.pdf | AMC factsheet | 2026-03-31",
          aliases: ["documentLinksText", "document_links", "documents"],
          sectionKey: "documents_links",
          sectionLabel: "Documents and references",
          repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
        }),
        createField({
          key: "factsheetUrl",
          label: "Factsheet URL",
          required: false,
          description: "Primary factsheet link for the fund.",
          example: "https://example.com/factsheet.pdf",
          aliases: ["factsheetUrl", "factsheet_url", "sourceUrl"],
          sectionKey: "documents_links",
          sectionLabel: "Documents and references",
          valueType: "url",
        }),
        createField({
          key: "holdingsReferenceUrl",
          label: "Holdings reference URL",
          required: false,
          description: "Reference link for the holdings block.",
          example: "https://example.com/holdings.pdf",
          aliases: ["holdingsReferenceUrl", "holdings_reference_url"],
          sectionKey: "documents_links",
          sectionLabel: "Documents and references",
          valueType: "url",
        }),
        createField({
          key: "allocationReferenceUrl",
          label: "Allocation reference URL",
          required: false,
          description: "Reference link for the sector-allocation block.",
          example: "https://example.com/allocation.pdf",
          aliases: ["allocationReferenceUrl", "allocation_reference_url"],
          sectionKey: "documents_links",
          sectionLabel: "Documents and references",
          valueType: "url",
        }),
      ],
    },
  ],
  repeatedFieldHelp: [
    {
      key: "returnsTableText",
      label: "Return ladder",
      howToFormat: "Use `;;` between rows. Inside each row use `Window | Return`.",
      example: "1Y | 22.4% ;; 3Y | 18.9%",
    },
    {
      key: "holdingsText",
      label: "Holdings",
      howToFormat: "Use `;;` between rows. Inside each row use `Holding | Sector | Weight`.",
      example: "BSE | Capital Markets | 6.2% ;; Max Healthcare | Healthcare | 5.1%",
    },
    {
      key: "sectorAllocationText",
      label: "Sector allocation",
      howToFormat: "Use `;;` between rows. Inside each row use `Sector | Weight`.",
      example: "Financial Services | 18.2% ;; Industrials | 14.6%",
    },
    {
      key: "documentLinksText",
      label: "Document links",
      howToFormat: "Use `;;` between rows. Inside each row use `Label | URL | Source label | Source date`.",
      example:
        "Factsheet PDF | https://example.com/factsheet.pdf | AMC factsheet | 2026-03-31 ;; Holdings PDF | https://example.com/holdings.pdf | Monthly holdings | 2026-03-31",
    },
  ],
  afterImportHelp: [
    "The importer saves the row into the normal mutual-fund editor as a draft or review-ready record.",
    "Open the fund editor to check the imported sections and make any fixes.",
    "Editors can submit the imported fund for approval. Admins approve it from the approvals page.",
    "Nothing goes live from import alone. A separate publish decision is still required.",
  ],
  sampleRow: {
    fundName: "Import Test Mutual Fund",
    slug: "import-test-mutual-fund",
    schemeCode: "140503",
    category: "Mid Cap Fund",
    benchmarkLabel: "Nifty Midcap 150",
    benchmarkIndexSlug: "niftymidcap150",
    publishState: "draft",
    assignedTo: "editor@example.com",
    dueDate: "2026-04-30",
    summary: "Imported fund summary for review.",
    angle: "Useful for investors who want active mid-cap exposure with benchmark-aware framing.",
    riskLabel: "Moderate to high",
    aum: "Rs 78,000 Cr",
    expenseRatio: "0.78%",
    returnsTableText: "1Y | 22.4% ;; 3Y | 18.9%",
    keyPointsText: "Mid-cap bias with benchmark-aware diversification ;; Suitable for long-term risk-taking investors",
    holdingsText: "BSE | Capital Markets | 6.2% ;; Max Healthcare | Healthcare | 5.1%",
    sectorAllocationText: "Financial Services | 18.2% ;; Industrials | 14.6%",
    fundManagerName: "Import Test Manager",
    fundManagerSince: "2020",
    fundManagerExperience: "18 years",
    fundManagerStyle: "Growth with quality bias",
    manualNotes: "Use this draft to add benchmark context and manager style before approval.",
    metaTitle: "Import Test Mutual Fund returns, holdings, and manager context",
    metaDescription: "Editorial overview of the fund with returns framing, holdings, and benchmark context.",
    ogImage: "/media-library/funds/import-test-mutual-fund-og.jpg",
    canonicalUrl: "https://riddra.com/mutual-funds/import-test-mutual-fund",
    noIndex: "no",
    publicRoute: "/mutual-funds/import-test-mutual-fund",
    scheduledPublishAt: "",
    scheduledUnpublishAt: "",
    publishNote: "Ready once the imported holdings and benchmark rows are reviewed.",
    documentLinksText:
      "Factsheet PDF | https://example.com/factsheet.pdf | AMC factsheet | 2026-03-31",
    factsheetUrl: "https://example.com/factsheet.pdf",
    holdingsReferenceUrl: "https://example.com/holdings.pdf",
    allocationReferenceUrl: "https://example.com/allocation.pdf",
  },
};

function buildGenericTemplateConfig(
  family: SupportedAdminImportFamily,
): AdminImportTemplateConfig {
  const familyLabel = adminFamilyMeta[family].singular;
  const nameKey =
    family === "indices"
      ? "title"
      : family === "etfs"
        ? "name"
        : "name";
  const benchmarkKey = family === "indices" ? "shortName" : "benchmark";
  const benchmarkLabel =
    family === "indices" ? "Short name" : family === "etfs" ? "Benchmark" : "Benchmark";

  return {
    description: `Import ${adminFamilyMeta[family].label.toLowerCase()} by CSV using the same draft-first CMS workflow as the editor.`,
    matchingHelp:
      family === "indices"
        ? "We match indices by slug."
        : family === "etfs"
          ? "We match ETFs by slug first, then symbol."
          : "We match products by slug first, then title.",
    importHelp: [
      "Download the sample CSV if you want the field names to match the editor path used for this family.",
      "Imports save drafts or review-ready records so someone can open the editor and continue from there.",
      "Leave optional columns blank if you do not need them yet.",
    ],
    groups: [
      {
        key: "identity",
        label: "Identity",
        description: "Main identifying fields for this family.",
        fields: [
          createField({
            key: nameKey,
            label: family === "indices" ? "Index name" : "Name",
            required: true,
            description: `The public ${familyLabel.toLowerCase()} name shown in the editor header.`,
            example: family === "indices" ? "Import Test Index" : `Import Test ${familyLabel}`,
            aliases: [nameKey, "title", "name"],
            sectionKey: "identity",
            sectionLabel: "Identity",
          }),
          createField({
            key: "slug",
            label: "Slug",
            required: true,
            description: "The page identifier for this record.",
            example: `import-test-${family === "indices" ? "index" : family.slice(0, -1)}`,
            aliases: ["slug", `${family}_slug`],
            sectionKey: "identity",
            sectionLabel: "Identity",
            valueType: "slug",
          }),
          ...(family === "etfs"
            ? [
                createField({
                  key: "symbol",
                  label: "Symbol",
                  required: false,
                  description: "Matching helper for ETF imports.",
                  example: "IMPETF",
                  aliases: ["symbol", "ticker"],
                  sectionKey: "identity",
                  sectionLabel: "Identity",
                  importOnly: true,
                }),
              ]
            : []),
          createField({
            key: benchmarkKey,
            label: benchmarkLabel,
            required: false,
            description: family === "indices" ? "Short public label for the index." : "Benchmark label shown in the editor.",
            example: family === "indices" ? "Nifty50" : "Nifty 50",
            aliases: [benchmarkKey, benchmarkLabel.toLowerCase().replace(/\s+/g, "_")],
            sectionKey: "identity",
            sectionLabel: "Identity",
          }),
        ],
      },
      {
        key: "workflow",
        label: "Workflow and assignment",
        description: "Status, owner, and deadline fields used by content managers.",
        fields: [
          createField({
            key: "publishState",
            label: "Content status",
            required: false,
            description: "Use draft, ready_for_review, or needs_fix. Published or archived values are converted back to draft during import.",
            example: "draft",
            aliases: ["publishState", "publish_state", "status"],
            sectionKey: "workflow",
            sectionLabel: "Workflow and assignment",
            valueType: "publish_state",
          }),
          createField({
            key: "assignedTo",
            label: "Assigned to",
            required: false,
            description: "Editor or reviewer email for this draft.",
            example: "editor@example.com",
            aliases: ["assignedTo", "assigned_to", "assignee"],
            sectionKey: "workflow",
            sectionLabel: "Workflow and assignment",
            valueType: "email",
          }),
          createField({
            key: "dueDate",
            label: "Due date",
            required: false,
            description: "Target date for review or completion.",
            example: "2026-04-30",
            aliases: ["dueDate", "due_date"],
            sectionKey: "workflow",
            sectionLabel: "Workflow and assignment",
            valueType: "date",
          }),
        ],
      },
      {
        key: "frontend_fields",
        label: "Main content",
        description: "Core public-facing content fields for this family.",
        fields: [
          createField({
            key: "summary",
            label: "Summary",
            required: false,
            description: "Short public summary for the page.",
            example: `Imported ${familyLabel.toLowerCase()} summary for review.`,
            aliases: ["summary", "description"],
            sectionKey: "frontend_fields",
            sectionLabel: "Main content",
          }),
          createField({
            key: family === "indices" ? "narrative" : "thesis",
            label: family === "indices" ? "Narrative" : "Thesis",
            required: false,
            description: family === "indices" ? "Primary public narrative for the index page." : "Primary editorial thesis for the page.",
            example: family === "indices" ? "Narrative for the imported index draft." : "Editorial thesis for the imported draft.",
            aliases: [family === "indices" ? "narrative" : "thesis", "angle"],
            sectionKey: "frontend_fields",
            sectionLabel: "Main content",
          }),
          createField({
            key: "documentLinksText",
            label: "Document links",
            required: false,
            description: "Document rows in `Label | URL | Source label | Source date` format.",
            example: "Reference note | https://example.com/reference.pdf | Internal desk | 2026-03-31",
            aliases: ["documentLinksText", "document_links", "documents"],
            sectionKey: "frontend_fields",
            sectionLabel: "Main content",
            repeatedFieldFormat: "Use `;;` between rows and `|` inside each row.",
          }),
        ],
      },
      {
        key: "seo",
        label: "SEO and sharing",
        description: "Search and sharing settings for this page.",
        fields: [
          createField({
            key: "metaTitle",
            label: "Meta title",
            required: false,
            description: "Search result title for the page.",
            example: `Import Test ${familyLabel} editorial overview`,
            aliases: ["metaTitle", "meta_title"],
            sectionKey: "seo",
            sectionLabel: "SEO and sharing",
          }),
          createField({
            key: "metaDescription",
            label: "Meta description",
            required: false,
            description: "Search result description for the page.",
            example: `Editorial overview of the imported ${familyLabel.toLowerCase()} draft.`,
            aliases: ["metaDescription", "meta_description"],
            sectionKey: "seo",
            sectionLabel: "SEO and sharing",
          }),
          createField({
            key: "canonicalUrl",
            label: "Canonical URL",
            required: false,
            description: "Optional canonical URL for search engines.",
            example: family === "indices" ? "https://riddra.com/import-test-index" : `https://riddra.com/${family}/import-test-${family.slice(0, -1)}`,
            aliases: ["canonicalUrl", "canonical_url", "canonical"],
            sectionKey: "seo",
            sectionLabel: "SEO and sharing",
            valueType: "url",
          }),
          createField({
            key: "noIndex",
            label: "Noindex",
            required: false,
            description: "Use yes or no.",
            example: "no",
            aliases: ["noIndex", "no_index", "noindex"],
            sectionKey: "seo",
            sectionLabel: "SEO and sharing",
            valueType: "yes_no",
          }),
        ],
      },
      {
        key: "publishing",
        label: "Publishing",
        description: "Route and publishing controls for this page.",
        fields: [
          createField({
            key: "publicRoute",
            label: "Public route",
            required: false,
            description: "The route that opens this page. Leave blank to use the default family route.",
            example: family === "indices" ? "/import-test-index" : `${adminFamilyMeta[family].routeBase}/import-test-${family.slice(0, -1)}`,
            aliases: ["publicRoute", "public_route", "publicHref", "route"],
            sectionKey: "publishing",
            sectionLabel: "Publishing",
            valueType: "route",
          }),
          createField({
            key: "publishNote",
            label: "Publish note",
            required: false,
            description: "Internal note about route readiness or review.",
            example: "Review the imported draft before publish.",
            aliases: ["publishNote", "publish_note"],
            sectionKey: "publishing",
            sectionLabel: "Publishing",
          }),
        ],
      },
    ],
    repeatedFieldHelp: [
      {
        key: "documentLinksText",
        label: "Document links",
        howToFormat: "Use `;;` between rows. Inside each row use `Label | URL | Source label | Source date`.",
        example: "Reference note | https://example.com/reference.pdf | Internal desk | 2026-03-31",
      },
    ],
    afterImportHelp: [
      "The importer saves the row into the normal editor as a draft or review-ready record.",
      "Open the editor to check the imported sections and make any fixes.",
      "Editors can submit imported drafts for approval. Admins approve them from the approvals page.",
      "Nothing goes live from import alone. A separate publish decision is still required.",
    ],
    sampleRow: {
      [nameKey]: family === "indices" ? "Import Test Index" : `Import Test ${familyLabel}`,
      slug: `import-test-${family === "indices" ? "index" : family.slice(0, -1)}`,
      ...(family === "etfs" ? { symbol: "IMPETF" } : {}),
      [benchmarkKey]: family === "indices" ? "Nifty50" : "Nifty 50",
      publishState: "draft",
      assignedTo: "editor@example.com",
      dueDate: "2026-04-30",
      summary: `Imported ${familyLabel.toLowerCase()} summary for review.`,
      [family === "indices" ? "narrative" : "thesis"]:
        family === "indices" ? "Narrative for the imported index draft." : "Editorial thesis for the imported draft.",
      documentLinksText:
        "Reference note | https://example.com/reference.pdf | Internal desk | 2026-03-31",
      metaTitle: `Import Test ${familyLabel} editorial overview`,
      metaDescription: `Editorial overview of the imported ${familyLabel.toLowerCase()} draft.`,
      canonicalUrl:
        family === "indices"
          ? "https://riddra.com/import-test-index"
          : `https://riddra.com${adminFamilyMeta[family].routeBase}/import-test-${family.slice(0, -1)}`,
      noIndex: "no",
      publicRoute:
        family === "indices"
          ? "/import-test-index"
          : `${adminFamilyMeta[family].routeBase}/import-test-${family.slice(0, -1)}`,
      publishNote: "Review the imported draft before publish.",
    },
  };
}

const templateConfigs: Record<SupportedAdminImportFamily, AdminImportTemplateConfig> = {
  stocks: stockImportTemplateConfig,
  "mutual-funds": fundImportTemplateConfig,
  indices: buildGenericTemplateConfig("indices"),
  etfs: buildGenericTemplateConfig("etfs"),
  pms: buildGenericTemplateConfig("pms"),
  aif: buildGenericTemplateConfig("aif"),
  sif: buildGenericTemplateConfig("sif"),
};

function normalizeHeaderKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getSupportedFamilyOrThrow(value: string): SupportedAdminImportFamily {
  if (supportedAdminImportFamilies.includes(value as SupportedAdminImportFamily)) {
    return value as SupportedAdminImportFamily;
  }

  throw new Error("Unsupported import family.");
}

function getTemplate(family: SupportedAdminImportFamily): AdminImportTemplate {
  const meta = adminFamilyMeta[family];
  const config = templateConfigs[family];
  const fields = config.groups.flatMap((group) =>
    group.fields.map((field) => ({
      ...field,
      sectionKey: group.key,
      sectionLabel: group.label,
    })),
  );
  const headers = fields.map((field) => field.label);
  const sampleCsv = buildCsvTemplate(
    headers,
    Object.fromEntries(
      fields.map((field) => [
        field.label,
        config.sampleRow[field.key] ?? "",
      ]),
    ),
  );

  return {
    family,
    label: meta.label,
    singular: meta.singular,
    description: config.description,
    fileName: `${family}-sample.csv`,
    matchingHelp: config.matchingHelp,
    importHelp: config.importHelp,
    requiredColumns: fields.filter((field) => field.required).map((field) => field.label),
    optionalColumns: fields.filter((field) => !field.required).map((field) => field.label),
    fields,
    groups: config.groups.map((group) => ({
      key: group.key,
      label: group.label,
      description: group.description,
      fieldKeys: group.fields.map((field) => field.key),
    })),
    repeatedFieldHelp: config.repeatedFieldHelp,
    afterImportHelp: config.afterImportHelp,
    sampleCsv,
  };
}

function getAllTemplates() {
  return supportedAdminImportFamilies.map((family) => getTemplate(family));
}

function getTemplateFieldMap(family: SupportedAdminImportFamily) {
  return new Map(
    getTemplate(family).fields.map((field) => [field.key, field] satisfies [string, AdminImportFieldDefinition]),
  );
}

function createEmptyPayloadForFamily(
  family: SupportedAdminImportFamily,
): Record<AdminImportFieldKey, string> {
  return Object.fromEntries(
    getTemplate(family).fields.map((field) => [field.key, ""]),
  ) as Record<AdminImportFieldKey, string>;
}

function getImportTitleValue(
  family: SupportedAdminImportFamily,
  payload: Record<AdminImportFieldKey, string>,
) {
  if (family === "stocks") {
    return cleanString(payload.companyName || payload.title, 240);
  }

  if (family === "mutual-funds") {
    return cleanString(payload.fundName || payload.title, 240);
  }

  return cleanString(payload.name || payload.title, 240);
}

function getImportBenchmarkValue(payload: Record<AdminImportFieldKey, string>) {
  return cleanString(
    payload.sectorIndexSlug ||
      payload.benchmarkIndexSlug ||
      payload.benchmarkMapping ||
      payload.benchmark,
    160,
  );
}

function normalizeImportPublishState(
  value: string,
  warnings: string[],
  errors: string[],
) {
  const normalized = cleanString(value, 80).toLowerCase();
  if (!normalized) {
    return "";
  }

  if (!publishStateValues.has(normalized)) {
    errors.push("Content status must be draft, ready_for_review, needs_fix, published, or archived.");
    return "";
  }

  if (normalized === "published" || normalized === "archived") {
    warnings.push(
      "Published and archived values are converted to draft during import so nothing goes live from the file alone.",
    );
    return "draft";
  }

  return normalized;
}

function resolveImportTargetStatus(
  value: string,
  fallbackStatus: SaveAdminRecordInput["status"],
): SaveAdminRecordInput["status"] {
  const normalized = cleanString(value, 80).toLowerCase();
  if (normalized === "ready_for_review" || normalized === "needs_fix" || normalized === "draft") {
    return normalized;
  }

  if (fallbackStatus === "ready_for_review" || fallbackStatus === "needs_fix") {
    return fallbackStatus;
  }

  return "draft";
}

function tryValidateYesNo(value: string, label: string, errors: string[]) {
  const normalized = cleanString(value, 16).toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "yes" || normalized === "no") {
    return normalized;
  }

  errors.push(`${label} must be yes or no.`);
  return "";
}

function tryValidateUrlOrPath(value: string, label: string, errors: string[]) {
  const normalized = cleanString(value, 800);
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return tryValidateHttpsUrl(normalized, label, errors);
}

function normalizeRepeatedFieldValue(
  family: SupportedAdminImportFamily,
  fieldKey: string,
  value: string,
) {
  const field = getTemplateFieldMap(family).get(fieldKey);
  const normalized = cleanString(value, 4000);
  if (!normalized) {
    return "";
  }

  if (!field?.repeatedFieldFormat) {
    return normalized;
  }

  return normalized
    .split(";;")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function getChangedFieldKeys(payload: Record<AdminImportFieldKey, string>) {
  return Object.entries(payload)
    .filter(([, value]) => cleanString(value))
    .map(([key]) => key);
}

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeBatch(
  value: AdminImportBatchLike,
  index: number,
): AdminImportBatch {
  const now = new Date().toISOString();
  const importMode = expectedModeValues.has(value.importMode as AdminImportMode)
    ? (value.importMode as AdminImportMode)
    : "create_or_update";
  const status = (
    [
      "preview_ready",
      "completed",
      "completed_with_errors",
      "queued_for_approval",
      "failed",
    ] as AdminImportBatchStatus[]
  ).includes(value.status as AdminImportBatchStatus)
    ? (value.status as AdminImportBatchStatus)
    : "completed";

  return {
    id: cleanString(value.id, 160) || `import_batch_${index + 1}_${randomUUID()}`,
    family: getSupportedFamilyOrThrow(cleanString(value.family, 120)),
    actorUserId: cleanString(value.actorUserId, 160) || null,
    actorEmail: cleanString(value.actorEmail, 240) || "Unknown",
    fileName: cleanString(value.fileName, 240) || "import.csv",
    importMode,
    status,
    sourceKind: "csv",
    storageMode: value.storageMode === "durable" ? "durable" : "fallback",
    totalRows: Number(value.totalRows) || 0,
    validRows: Number(value.validRows) || 0,
    warningRows: Number(value.warningRows) || 0,
    failedRows: Number(value.failedRows) || 0,
    createdCount: Number(value.createdCount) || 0,
    updatedCount: Number(value.updatedCount) || 0,
    queuedCount: Number(value.queuedCount) || 0,
    skippedCount: Number(value.skippedCount) || 0,
    failedCount: Number(value.failedCount) || 0,
    summary: cleanString(value.summary, 4000),
    fieldMapping:
      value.fieldMapping && typeof value.fieldMapping === "object"
        ? (value.fieldMapping as Record<string, AdminImportFieldKey>)
        : {},
    uploadedAt: cleanString(value.uploadedAt, 120) || now,
    completedAt: cleanString(value.completedAt, 120) || null,
    createdAt: cleanString(value.createdAt, 120) || now,
    updatedAt: cleanString(value.updatedAt, 120) || cleanString(value.completedAt, 120) || now,
  };
}

function normalizeBatchRow(
  value: AdminImportBatchRowLike,
  index: number,
  batchId: string,
): AdminImportBatchRow {
  const now = new Date().toISOString();
  const payload =
    value.payload && typeof value.payload === "object"
      ? Object.fromEntries(
          Object.entries(value.payload as Record<string, unknown>).map(([key, item]) => [
            key,
            cleanString(String(item ?? ""), 4000),
          ]),
        )
      : {};

  return {
    id: cleanString(value.id, 160) || `import_row_${index + 1}_${randomUUID()}`,
    batchId: cleanString(value.batchId, 160) || batchId,
    rowNumber: Number(value.rowNumber) || index + 1,
    identifier: cleanString(value.identifier, 240) || null,
    title: cleanString(value.title, 240) || null,
    slug: cleanString(value.slug, 160) || null,
    matchedRecordId: cleanString(value.matchedRecordId, 160) || null,
    matchedSlug: cleanString(value.matchedSlug, 160) || null,
    operation:
      value.operation === "create" ||
      value.operation === "update" ||
      value.operation === "skip" ||
      value.operation === "queue_for_approval"
        ? value.operation
        : "skip",
    status:
      value.status === "valid" ||
      value.status === "warning" ||
      value.status === "failed" ||
      value.status === "created" ||
      value.status === "updated" ||
      value.status === "skipped" ||
      value.status === "queued_for_approval"
        ? value.status
        : "failed",
    warnings: Array.isArray(value.warnings) ? value.warnings.map((item) => cleanString(item, 400)) : [],
    errors: Array.isArray(value.errors) ? value.errors.map((item) => cleanString(item, 400)) : [],
    payload: payload as Record<AdminImportFieldKey, string>,
    resultNote: cleanString(value.resultNote, 2000),
    createdAt: cleanString(value.createdAt, 120) || now,
    updatedAt: cleanString(value.updatedAt, 120) || now,
  };
}

function normalizeStore(parsed: Partial<ImportStore>): ImportStore {
  return {
    version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
    batches: Array.isArray(parsed.batches)
      ? parsed.batches.map((item, index) => normalizeBatch(item, index))
      : [],
    rows: Array.isArray(parsed.rows)
      ? parsed.rows.map((item, index) =>
          normalizeBatchRow(item, index, cleanString((item as Partial<AdminImportBatchRow>).batchId, 160)),
        )
      : [],
    updatedAt: cleanString(parsed.updatedAt, 120) || null,
  };
}

const EMPTY_STORE: ImportStore = {
  version: STORE_VERSION,
  batches: [],
  rows: [],
  updatedAt: null,
};

async function readFallbackStore() {
  if (!canUseFileFallback()) {
    return EMPTY_STORE;
  }

  try {
    const fileStats = await stat(STORE_PATH);
    if (storeCache && storeCache.mtimeMs === fileStats.mtimeMs) {
      return storeCache.store;
    }

    const parsed = JSON.parse(await readFile(STORE_PATH, "utf8")) as Partial<ImportStore>;
    const normalized = normalizeStore(parsed);
    storeCache = {
      mtimeMs: fileStats.mtimeMs,
      store: normalized,
    };
    return normalized;
  } catch {
    return EMPTY_STORE;
  }
}

async function writeFallbackStore(store: ImportStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Admin content import persistence"));
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

async function readImportStore() {
  const fallbackStore = await readFallbackStore();

  if (!hasDurableCmsStateStore()) {
    return fallbackStore;
  }

  const durableBatches = await listDurableAdminImportBatches();
  if (!durableBatches) {
    return fallbackStore;
  }

  const allRows = await Promise.all(
    durableBatches.map(async (batch) => ({
      batchId: batch.id,
      rows: (await listDurableAdminImportRows(batch.id)) ?? [],
    })),
  );

  return {
    version: STORE_VERSION,
    batches: durableBatches.map((batch, index) => normalizeBatch(batch, index)),
    rows: allRows.flatMap((entry) =>
      entry.rows.map((row, index) => normalizeBatchRow(row, index, entry.batchId)),
    ),
    updatedAt:
      durableBatches.map((batch) => batch.updatedAt).sort().at(-1) ?? fallbackStore.updatedAt,
  };
}

async function mirrorBatchToFallback(batch: AdminImportBatch, rows: AdminImportBatchRow[]) {
  if (!canUseFileFallback()) {
    return;
  }

  const fallbackStore = await readFallbackStore();
  const existingIndex = fallbackStore.batches.findIndex((item) => item.id === batch.id);
  const nextBatches =
    existingIndex >= 0
      ? fallbackStore.batches.map((item, index) => (index === existingIndex ? batch : item))
      : [batch, ...fallbackStore.batches];
  const nextRows = [
    ...fallbackStore.rows.filter((item) => item.batchId !== batch.id),
    ...rows,
  ];

  await writeFallbackStore({
    ...fallbackStore,
    batches: nextBatches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    rows: nextRows,
    updatedAt: batch.updatedAt,
  });
}

function getDefaultPublicRoute(family: SupportedAdminImportFamily, slug: string) {
  return family === "indices"
    ? `/${slug}`
    : `${adminFamilyMeta[family].routeBase}/${slug}`;
}

function getEditorFieldValue(
  record: AdminEditorRecord,
  fieldKey: string,
) {
  for (const section of record.sections) {
    if (section.definition.fields.some((field) => field.key === fieldKey)) {
      return section.effectiveValues[fieldKey] ?? section.manualValues[fieldKey] ?? "";
    }
  }

  return "";
}

function cloneSections(record: AdminEditorRecord): SaveAdminRecordInput["sections"] {
  return Object.fromEntries(
    record.sections.map((section) => [
      section.definition.key,
      {
        mode: section.mode,
        values: { ...section.manualValues },
        note: section.note,
        lastManualEditAt: section.lastManualEditAt,
        expiresAt: section.expiresAt,
      },
    ]),
  );
}

function buildSaveInputFromEditorRecord(
  editorRecord: AdminEditorRecord,
  overrides: Partial<SaveAdminRecordInput> = {},
): SaveAdminRecordInput {
  return {
    recordId: editorRecord.id,
    originalSlug: editorRecord.slug,
    lastKnownUpdatedAt: editorRecord.updatedAt,
    family: editorRecord.family,
    slug: editorRecord.slug,
    title: editorRecord.title,
    symbol: editorRecord.symbol,
    benchmarkMapping:
      getEditorFieldValue(editorRecord, "benchmarkIndexSlug") ||
      getEditorFieldValue(editorRecord, "sectorIndexSlug") ||
      getEditorFieldValue(editorRecord, "benchmark") ||
      null,
    status: editorRecord.publishState,
    visibility: editorRecord.visibility,
    publicHref: editorRecord.publicHref,
    canonicalRoute: editorRecord.canonicalRoute,
    sourceTable: editorRecord.sourceTable,
    sourceRowId: editorRecord.sourceRowId,
    sourceLabel: editorRecord.sourceLabel,
    sourceDate: editorRecord.sourceDate,
    sourceUrl: editorRecord.sourceUrl,
    accessControl: editorRecord.accessControl,
    assignedTo: getEditorFieldValue(editorRecord, "assignedTo") || null,
    assignedBy: getEditorFieldValue(editorRecord, "assignedBy") || null,
    dueDate: getEditorFieldValue(editorRecord, "dueDate") || null,
    scheduledPublishAt: getEditorFieldValue(editorRecord, "scheduledPublishAt") || null,
    scheduledUnpublishAt: getEditorFieldValue(editorRecord, "scheduledUnpublishAt") || null,
    sections: cloneSections(editorRecord),
    documents: [],
    imports: [],
    ...overrides,
  };
}

function applyEditorFieldValue(
  sections: SaveAdminRecordInput["sections"],
  editorRecord: AdminEditorRecord,
  fieldKeys: string[],
  value: string,
) {
  if (!cleanString(value, 4000)) {
    return;
  }

  for (const section of editorRecord.sections) {
    const matchedField = section.definition.fields.find((field) => fieldKeys.includes(field.key));
    if (!matchedField) {
      continue;
    }

    const nextSection = sections[section.definition.key];
    if (!nextSection) {
      continue;
    }

    nextSection.values[matchedField.key] = value;
    if (nextSection.mode === "auto_source") {
      nextSection.mode = "manual_override";
    }
    nextSection.lastManualEditAt = new Date().toISOString();
    break;
  }
}

function appendImportItem(
  existingItems: AdminManagedImportItem[] | undefined,
  input: {
    batchId: string;
    fileName: string;
    row: AdminImportBatchRow;
    status: AdminManagedImportItem["status"];
  },
) {
  const items = [...(existingItems ?? [])];
  const nextItem: AdminManagedImportItem = {
    id: `import_item_${input.batchId}_${input.row.rowNumber}`,
    batchLabel: `${input.fileName} • row ${input.row.rowNumber}`,
    status: input.status,
    sourceLabel: input.row.payload.sourceLabel || input.fileName,
    sourceUrl: input.row.payload.sourceUrl || "",
    sourceDate: input.row.payload.sourceDate || "",
    ranAt: new Date().toISOString(),
    note: input.row.resultNote,
    duplicateCandidate: input.row.matchedSlug || "",
    changedFields: Object.entries(input.row.payload)
      .filter(([, value]) => cleanString(value))
      .map(([key]) => key),
    sourceChangedAt: cleanAdminIsoOrNull(input.row.payload.sourceDate),
    liveValueState:
      input.status === "applied"
        ? "manual_live"
        : input.status === "pending_review"
          ? "import_conflict_needs_review"
          : "source_read_failed",
  };
  return [nextItem, ...items.filter((item) => item.id !== nextItem.id)].slice(0, 25);
}

function buildHeaderMapping(
  family: SupportedAdminImportFamily,
  headers: string[],
  inputMapping?: Record<string, AdminImportFieldKey>,
) {
  const template = getTemplate(family);
  const mapping: Record<string, AdminImportFieldKey> = {};
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const manual = inputMapping?.[header];
    if (manual && template.fields.some((field) => field.key === manual)) {
      mapping[header] = manual;
      continue;
    }

    const normalizedHeader = normalizeHeaderKey(header);
    const matchedField = template.fields.find((field) =>
      field.aliases.some((alias) => normalizeHeaderKey(alias) === normalizedHeader) ||
      normalizeHeaderKey(field.key) === normalizedHeader ||
      normalizeHeaderKey(field.label) === normalizedHeader,
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

function normalizeRowPayload(
  family: SupportedAdminImportFamily,
  headers: string[],
  row: CsvRow,
  fieldMapping: Record<string, AdminImportFieldKey>,
) {
  const payload = createEmptyPayloadForFamily(family);

  for (const header of headers) {
    const mappedKey = fieldMapping[header];
    if (!mappedKey) {
      continue;
    }
    payload[mappedKey] = cleanString(row[header], 4000);
  }

  return payload;
}

function tryValidateSlug(value: string, label: string, errors: string[]) {
  if (!cleanString(value, 160)) {
    return null;
  }

  try {
    return assertAdminSlugValue(value, label);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${label} is invalid.`);
    return null;
  }
}

function tryValidateHttpsUrl(value: string, label: string, errors: string[]) {
  if (!cleanString(value, 800)) {
    return "";
  }

  try {
    const next = assertAdminHttpUrlValue(value, label) ?? "";
    if (next && !next.startsWith("https://")) {
      errors.push(`${label} must begin with https://.`);
      return "";
    }
    return next;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${label} is invalid.`);
    return "";
  }
}

function tryValidateRoute(value: string, label: string, errors: string[]) {
  if (!cleanString(value, 400)) {
    return "";
  }

  try {
    return assertAdminRouteValue(value, label) ?? "";
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${label} is invalid.`);
    return "";
  }
}

function tryValidateDate(value: string, label: string, errors: string[]) {
  if (!cleanString(value, 120)) {
    return "";
  }

  const next = cleanAdminIsoOrNull(value);
  if (!next) {
    errors.push(`${label} must be a valid date.`);
    return "";
  }

  return next;
}

function tryValidateEmail(value: string, label: string, errors: string[]) {
  if (!cleanString(value, 240)) {
    return "";
  }

  try {
    return assertAdminEmailValue(value, label);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${label} is invalid.`);
    return "";
  }
}

function findMatchingRow(
  family: SupportedAdminImportFamily,
  payload: Record<AdminImportFieldKey, string>,
  familyRows: AdminListRow[],
  storeRecords: Awaited<ReturnType<typeof getAdminOperatorStore>>["records"],
) {
  const normalizedSlug = cleanString(payload.slug, 160).toLowerCase();
  const normalizedTitle = getImportTitleValue(family, payload).toLowerCase();
  const normalizedSymbol = cleanString(payload.symbol, 80).toLowerCase();
  const normalizedSchemeCode = cleanString(payload.schemeCode, 120).toLowerCase();

  const bySlug = normalizedSlug ? familyRows.find((row) => row.slug === normalizedSlug) ?? null : null;
  if (bySlug) {
    return bySlug;
  }

  if ((family === "stocks" || family === "etfs") && normalizedSymbol) {
    const bySymbol =
      familyRows.find((row) => cleanString(row.symbol, 80).toLowerCase() === normalizedSymbol) ?? null;
    if (bySymbol) {
      return bySymbol;
    }
  }

  if (family === "mutual-funds") {
    if (normalizedSchemeCode) {
      const bySchemeCode = storeRecords.find(
        (record) =>
          record.family === family &&
          cleanString(record.sourceRowId, 120).toLowerCase() === normalizedSchemeCode,
      );
      if (bySchemeCode) {
        return familyRows.find((row) => row.slug === bySchemeCode.slug) ?? null;
      }
    }

    if (normalizedTitle) {
      return familyRows.find((row) => row.title.trim().toLowerCase() === normalizedTitle) ?? null;
    }
  }

  if (["pms", "aif", "sif"].includes(family) && normalizedTitle) {
    return familyRows.find((row) => row.title.trim().toLowerCase() === normalizedTitle) ?? null;
  }

  return null;
}

function getRowIdentifier(payload: Record<AdminImportFieldKey, string>) {
  return (
    cleanString(payload.slug, 160) ||
    cleanString(payload.symbol, 80) ||
    cleanString(payload.schemeCode, 120) ||
    cleanString(payload.companyName, 240) ||
    cleanString(payload.fundName, 240) ||
    cleanString(payload.name, 240) ||
    cleanString(payload.title, 240) ||
    null
  );
}

function buildResultNote(
  operation: AdminImportOperation,
  status: AdminImportRowStatus,
  matchedTitle: string | null,
) {
  if (status === "failed") {
    return "This row could not be imported until the blocking issues are fixed.";
  }

  if (status === "warning") {
    return matchedTitle
      ? `We found ${matchedTitle} and can update it, but this row still needs a quick review.`
      : "This row can be imported, but it still needs a quick review.";
  }

  if (operation === "update") {
    return matchedTitle
      ? `We found ${matchedTitle} and can update it.`
      : "We found an existing record and can update it.";
  }

  if (operation === "create") {
    return "This row is ready to create a new record.";
  }

  if (operation === "queue_for_approval") {
    return "This row is ready to submit for approval.";
  }

  return "This row will be skipped.";
}

async function buildPreviewRows(input: {
  family: SupportedAdminImportFamily;
  parsedRows: CsvRow[];
  headers: string[];
  fieldMapping: Record<string, AdminImportFieldKey>;
  importMode: AdminImportMode;
}) {
  const store = await getAdminOperatorStore();
  const familyRows = await getAdminFamilyRows(input.family, store.records, {
    cacheKey: store.updatedAt,
  });
  const duplicateSlugCounter = new Map<string, number>();
  const templateFieldMap = getTemplateFieldMap(input.family);

  return input.parsedRows.map((row, index) => {
    const payload = normalizeRowPayload(input.family, input.headers, row, input.fieldMapping);
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFieldKeys = new Set(
      getTemplate(input.family).fields.filter((field) => field.required).map((field) => field.key),
    );

    for (const [fieldKey, field] of templateFieldMap.entries()) {
      const rawValue = payload[fieldKey] ?? "";
      switch (field.valueType) {
        case "slug":
          payload[fieldKey] = tryValidateSlug(rawValue, field.label, errors) ?? "";
          break;
        case "route":
          payload[fieldKey] = tryValidateRoute(rawValue, field.label, errors);
          break;
        case "url":
          payload[fieldKey] = tryValidateHttpsUrl(rawValue, field.label, errors);
          break;
        case "url_or_path":
          payload[fieldKey] = tryValidateUrlOrPath(rawValue, field.label, errors);
          break;
        case "date":
          payload[fieldKey] = tryValidateDate(rawValue, field.label, errors);
          break;
        case "email":
          payload[fieldKey] = tryValidateEmail(rawValue, field.label, errors);
          break;
        case "publish_state":
          payload[fieldKey] = normalizeImportPublishState(rawValue, warnings, errors);
          break;
        case "yes_no":
          payload[fieldKey] = tryValidateYesNo(rawValue, field.label, errors);
          break;
        default:
          payload[fieldKey] = cleanString(rawValue, 4000);
          break;
      }
    }

    const normalizedSlug = payload.slug;
    const title = getImportTitleValue(input.family, payload);

    if (normalizedSlug) {
      duplicateSlugCounter.set(normalizedSlug, (duplicateSlugCounter.get(normalizedSlug) ?? 0) + 1);
      if ((duplicateSlugCounter.get(normalizedSlug) ?? 0) > 1) {
        errors.push("This file contains the same slug more than once.");
      }
    }

    const matchedRow = findMatchingRow(input.family, payload, familyRows, store.records);

    if (input.importMode === "create_new_only" && matchedRow) {
      errors.push(`We found an existing ${adminFamilyMeta[input.family].singular.toLowerCase()} with this identifier already.`);
    }

    if (input.importMode === "update_existing_only" && !matchedRow) {
      errors.push("We could not find an existing record to update from this row.");
    }

    if (!matchedRow && !normalizedSlug && input.importMode !== "update_existing_only") {
      errors.push("New records need a slug so the system can create the page.");
    }

    if (!matchedRow && input.importMode !== "update_existing_only") {
      for (const fieldKey of requiredFieldKeys) {
        if (!cleanString(payload[fieldKey], 4000)) {
          const fieldLabel = templateFieldMap.get(fieldKey)?.label ?? fieldKey;
          errors.push(`${fieldLabel} is required for new rows.`);
        }
      }
    }

    if (!payload.summary && templateFieldMap.has("summary")) {
      warnings.push("Summary is blank. You can import the record now and finish the summary later.");
    }

    if (!payload.publicRoute && normalizedSlug) {
      payload.publicRoute = getDefaultPublicRoute(input.family, normalizedSlug);
      warnings.push("Public route was blank, so the default route will be used.");
    }

    const operation: AdminImportOperation =
      matchedRow ? "update" : errors.length ? "skip" : "create";

    const status: AdminImportRowStatus = errors.length
      ? "failed"
      : warnings.length
        ? "warning"
        : "valid";

    return normalizeBatchRow(
      {
        batchId: "preview",
        rowNumber: index + 1,
        identifier: getRowIdentifier(payload),
        title: title || matchedRow?.title || null,
        slug: normalizedSlug || matchedRow?.slug || null,
        matchedRecordId: null,
        matchedSlug: matchedRow?.slug ?? null,
        operation,
        status,
        warnings,
        errors,
        payload,
        resultNote: buildResultNote(operation, status, matchedRow?.title ?? null),
      },
      index,
      "preview",
    );
  });
}

export async function previewAdminImport(input: {
  family: SupportedAdminImportFamily;
  csvText: string;
  fileName: string;
  importMode: AdminImportMode;
  fieldMapping?: Record<string, AdminImportFieldKey>;
}): Promise<AdminImportPreview> {
  const family = getSupportedFamilyOrThrow(input.family);
  const template = getTemplate(family);
  const parsed = parseCsvText(input.csvText);
  const mappingResult = buildHeaderMapping(family, parsed.headers, input.fieldMapping);
  const rows = await buildPreviewRows({
    family,
    parsedRows: parsed.rows,
    headers: parsed.headers,
    fieldMapping: mappingResult.mapping,
    importMode: input.importMode,
  });
  const validRows = rows.filter((row) => row.status === "valid").length;
  const warningRows = rows.filter((row) => row.status === "warning").length;
  const failedRows = rows.filter((row) => row.status === "failed").length;

  return {
    family,
    fileName: cleanString(input.fileName, 240) || `${family}.csv`,
    importMode: input.importMode,
    template,
    fieldMapping: mappingResult.mapping,
    unmappedHeaders: mappingResult.unmappedHeaders,
    availableFields: template.fields.map((field) => ({ key: field.key, label: field.label })),
    rows,
    totalRows: rows.length,
    validRows,
    warningRows,
    failedRows,
    canImport: rows.some((row) => row.status !== "failed") && mappingResult.unmappedHeaders.length === 0,
  };
}

function getBatchStatus(
  role: ProductUserRole,
  createdCount: number,
  updatedCount: number,
  queuedCount: number,
  failedCount: number,
) {
  if (role !== "admin" && queuedCount > 0) {
    return failedCount > 0 ? "completed_with_errors" : "queued_for_approval";
  }

  if ((createdCount > 0 || updatedCount > 0) && failedCount === 0) {
    return "completed";
  }

  if (createdCount > 0 || updatedCount > 0 || queuedCount > 0) {
    return "completed_with_errors";
  }

  return "failed";
}

async function saveBatchWithRows(batch: AdminImportBatch, rows: AdminImportBatchRow[]) {
  if (hasDurableCmsStateStore()) {
    const durableBatch = await saveDurableAdminImportBatch({
      ...batch,
      storageMode: "durable",
    });
    if (durableBatch) {
      const durableRows =
        (await replaceDurableAdminImportRows(
          durableBatch.id,
          rows.map((row) => ({ ...row, batchId: durableBatch.id })),
        )) ?? [];
      const normalizedRows = durableRows.map((row, index) => normalizeBatchRow(row, index, durableBatch.id));
      const normalizedBatch = normalizeBatch(durableBatch, 0);
      await mirrorBatchToFallback(normalizedBatch, normalizedRows);
      return {
        batch: normalizedBatch,
        rows: normalizedRows,
      };
    }
  }

  const fallbackStore = await readFallbackStore();
  const existingIndex = fallbackStore.batches.findIndex((item) => item.id === batch.id);
  const nextBatches =
    existingIndex >= 0
      ? fallbackStore.batches.map((item, index) => (index === existingIndex ? batch : item))
      : [batch, ...fallbackStore.batches];
  const nextRows = [
    ...fallbackStore.rows.filter((item) => item.batchId !== batch.id),
    ...rows,
  ];
  await writeFallbackStore({
    ...fallbackStore,
    batches: nextBatches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    rows: nextRows,
    updatedAt: batch.updatedAt,
  });
  return {
    batch,
    rows,
  };
}

async function buildSaveInputForImportRow(
  family: SupportedAdminImportFamily,
  row: AdminImportBatchRow,
  batchId: string,
  fileName: string,
  actorEmail: string,
) {
  const targetSlug = row.matchedSlug || row.payload.slug;
  const existingRecord = targetSlug ? await getAdminManagedRecord(family, targetSlug) : null;
  const editorRecord = await getAdminRecordEditorData(
    family,
    targetSlug || row.payload.slug,
    existingRecord,
  );
  const resolvedSlug = row.payload.slug || row.matchedSlug || editorRecord.slug;
  const resolvedTitle = getImportTitleValue(family, row.payload) || row.title || editorRecord.title;
  const resolvedPublicRoute = row.payload.publicRoute || getDefaultPublicRoute(family, resolvedSlug);
  const resolvedStatus = resolveImportTargetStatus(
    row.payload.publishState,
    editorRecord.publishState,
  );
  const resolvedAssignedTo =
    cleanString(row.payload.assignedTo, 240) || getEditorFieldValue(editorRecord, "assignedTo") || null;
  const nextInput = buildSaveInputFromEditorRecord(editorRecord, {
    recordId: existingRecord?.id ?? null,
    originalSlug: existingRecord?.slug ?? row.matchedSlug ?? editorRecord.slug,
    slug: resolvedSlug,
    title: resolvedTitle,
    symbol: cleanString(row.payload.symbol, 80) || editorRecord.symbol || null,
    benchmarkMapping:
      getImportBenchmarkValue(row.payload) ||
      getEditorFieldValue(editorRecord, "benchmarkIndexSlug") ||
      getEditorFieldValue(editorRecord, "sectorIndexSlug") ||
      getEditorFieldValue(editorRecord, "benchmark") ||
      null,
    status: resolvedStatus,
    publicHref: resolvedPublicRoute,
    canonicalRoute: resolvedPublicRoute,
    sourceLabel: editorRecord.sourceLabel || fileName,
    sourceUrl: editorRecord.sourceUrl || null,
    sourceDate: editorRecord.sourceDate || null,
    sourceRowId:
      family === "mutual-funds"
        ? cleanString(row.payload.schemeCode, 160) || existingRecord?.sourceRowId || editorRecord.sourceRowId
        : existingRecord?.sourceRowId || editorRecord.sourceRowId,
    assignedTo: resolvedAssignedTo,
    assignedBy: resolvedAssignedTo ? actorEmail : getEditorFieldValue(editorRecord, "assignedBy") || null,
    dueDate: row.payload.dueDate || getEditorFieldValue(editorRecord, "dueDate") || null,
  });

  const editableKeys = new Set(
    editorRecord.sections.flatMap((section) => section.definition.fields.map((field) => field.key)),
  );

  for (const [fieldKey, rawValue] of Object.entries(row.payload)) {
    if (!editableKeys.has(fieldKey) || !cleanString(rawValue, 4000)) {
      continue;
    }

    const normalizedValue = normalizeRepeatedFieldValue(family, fieldKey, rawValue);
    applyEditorFieldValue(nextInput.sections, editorRecord, [fieldKey], normalizedValue);
  }

  applyEditorFieldValue(nextInput.sections, editorRecord, ["publicRoute"], resolvedPublicRoute);
  applyEditorFieldValue(nextInput.sections, editorRecord, ["publishState"], resolvedStatus);
  if (resolvedAssignedTo) {
    applyEditorFieldValue(nextInput.sections, editorRecord, ["assignedTo"], resolvedAssignedTo);
    applyEditorFieldValue(nextInput.sections, editorRecord, ["assignedBy"], actorEmail);
  }
  if (nextInput.dueDate) {
    applyEditorFieldValue(nextInput.sections, editorRecord, ["dueDate"], nextInput.dueDate);
  }

  nextInput.imports = appendImportItem(existingRecord?.imports, {
    batchId,
    fileName,
    row,
    status: "pending_review",
  });

  return nextInput;
}

export async function executeAdminImport(input: {
  role: ProductUserRole;
  capabilities: ProductUserCapability[] | null | undefined;
  actorUserId: string | null;
  actorEmail: string;
  family: SupportedAdminImportFamily;
  csvText: string;
  fileName: string;
  importMode: AdminImportMode;
  fieldMapping?: Record<string, AdminImportFieldKey>;
}) {
  const family = getSupportedFamilyOrThrow(input.family);
  if (!canEditAdminFamily(input.role, input.capabilities, family)) {
    throw new Error("You do not have permission to import this content family.");
  }

  const preview = await previewAdminImport({
    family,
    csvText: input.csvText,
    fileName: input.fileName,
    importMode: input.importMode,
    fieldMapping: input.fieldMapping,
  });

  if (preview.unmappedHeaders.length > 0) {
    throw new Error("This file still has column names that need to be mapped before import can continue.");
  }

  const batchId = `admin_import_${randomUUID()}`;
  const startedAt = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;
  let queuedCount = 0;
  let skippedCount = 0;
  let failedCount = preview.failedRows;
  const resultRows: AdminImportBatchRow[] = [];

  for (const row of preview.rows) {
    if (row.status === "failed") {
      resultRows.push(
        normalizeBatchRow(
          {
            ...row,
            batchId,
            status: "failed",
            operation: "skip",
          },
          row.rowNumber - 1,
          batchId,
        ),
      );
      continue;
    }

    try {
      const saveInput = await buildSaveInputForImportRow(
        family,
        row,
        batchId,
        preview.fileName,
        input.actorEmail,
      );
      if (input.role === "admin") {
        saveInput.imports = appendImportItem(saveInput.imports, {
          batchId,
          fileName: preview.fileName,
          row,
          status: "applied",
        });
        await persistApprovedAdminRecordChange({
          actorUserId: input.actorUserId ?? "local-admin",
          actorEmail: input.actorEmail,
          payload: saveInput,
          activityActorSource: "manual",
        });
        if (row.operation === "create") {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }
        resultRows.push(
          normalizeBatchRow(
            {
              ...row,
              batchId,
              status: row.operation === "create" ? "created" : "updated",
              resultNote:
                row.operation === "create"
                  ? "The system created this record from your file."
                  : "The system updated the existing record from your file.",
            },
            row.rowNumber - 1,
            batchId,
          ),
        );
      } else {
        const { saved } = await persistApprovedAdminRecordChange({
          actorUserId: input.actorUserId ?? "local-editor",
          actorEmail: input.actorEmail,
          payload: saveInput,
          activityActorSource: "manual",
        });

        await saveAdminPendingApproval({
          family,
          slug: saveInput.slug,
          title: saveInput.title,
          recordId: saved.id,
          submittedByUserId: input.actorUserId,
          submittedByEmail: input.actorEmail,
          actionType: "content_import",
          targetStatus: saveInput.status,
          summary:
            row.operation === "create"
              ? `Imported a new draft for ${saveInput.title} from ${preview.fileName} and sent it for approval.`
              : `Imported updates for ${saveInput.title} from ${preview.fileName} and sent them for approval.`,
          changedFields: getChangedFieldKeys(row.payload),
          snapshot: saveInput,
          baseRecordUpdatedAt: saved.updatedAt ?? null,
        });
        queuedCount += 1;
        resultRows.push(
          normalizeBatchRow(
            {
              ...row,
              batchId,
              operation: "queue_for_approval",
              status: "queued_for_approval",
              resultNote:
                row.operation === "create"
                  ? "Draft created in the editor and submitted for approval. It will not go live until an admin approves it."
                  : "Draft updated in the editor and submitted for approval. It will not go live until an admin approves it.",
            },
            row.rowNumber - 1,
            batchId,
          ),
        );
      }
    } catch (error) {
      failedCount += 1;
      resultRows.push(
        normalizeBatchRow(
          {
            ...row,
            batchId,
            operation: "skip",
            status: "failed",
            errors: [
              ...row.errors,
              error instanceof Error ? error.message : "This row could not be imported.",
            ],
            resultNote: "This row could not be imported because the save step failed.",
          },
          row.rowNumber - 1,
          batchId,
        ),
      );
    }
  }

  skippedCount += resultRows.filter((row) => row.status === "skipped").length;

  const batchStatus = getBatchStatus(
    input.role,
    createdCount,
    updatedCount,
    queuedCount,
    failedCount,
  );
  const batch = normalizeBatch(
    {
      id: batchId,
      family,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      fileName: preview.fileName,
      importMode: preview.importMode,
      status: batchStatus,
      sourceKind: "csv",
      storageMode: "fallback",
      totalRows: preview.totalRows,
      validRows: preview.validRows,
      warningRows: preview.warningRows,
      failedRows: preview.failedRows,
      createdCount,
      updatedCount,
      queuedCount,
      skippedCount,
      failedCount,
      summary:
        input.role === "admin"
          ? `Imported ${createdCount + updatedCount} ${adminFamilyMeta[family].label.toLowerCase()} row${createdCount + updatedCount === 1 ? "" : "s"} as draft record${createdCount + updatedCount === 1 ? "" : "s"} from ${preview.fileName}.`
          : `Saved ${queuedCount} ${adminFamilyMeta[family].label.toLowerCase()} draft row${queuedCount === 1 ? "" : "s"} from ${preview.fileName} and sent ${queuedCount === 1 ? "it" : "them"} for approval.`,
      fieldMapping: preview.fieldMapping,
      uploadedAt: startedAt,
      completedAt: new Date().toISOString(),
      createdAt: startedAt,
      updatedAt: new Date().toISOString(),
    },
    0,
  );

  const saved = await saveBatchWithRows(
    batch,
    resultRows.map((row, index) => normalizeBatchRow(row, index, batchId)),
  );

  await appendAdminActivityLog({
    actorUserId: input.role === "admin" ? input.actorUserId : input.actorUserId,
    actorEmail: input.actorEmail,
    actionType: input.role === "admin" ? "content.imported" : "content.import_submitted",
    targetType: "content_import_batch",
    targetId: saved.batch.id,
    targetFamily: family,
    targetSlug: null,
    summary: saved.batch.summary,
    metadata: {
      fileName: saved.batch.fileName,
      importMode: saved.batch.importMode,
      createdCount: saved.batch.createdCount,
      updatedCount: saved.batch.updatedCount,
      queuedCount: saved.batch.queuedCount,
      failedCount: saved.batch.failedCount,
    },
  });

  return saved;
}

export async function listAdminImportBatches(family?: SupportedAdminImportFamily | null) {
  const store = await readImportStore();
  return store.batches
    .filter((batch) => (!family ? true : batch.family === family))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getAdminImportBatchDetails(batchId: string) {
  const store = await readImportStore();
  const batch = store.batches.find((item) => item.id === cleanString(batchId, 160)) ?? null;
  if (!batch) {
    return null;
  }

  return {
    batch,
    rows: store.rows
      .filter((row) => row.batchId === batch.id)
      .sort((left, right) => left.rowNumber - right.rowNumber),
  };
}

export function getAdminImportTemplate(family: SupportedAdminImportFamily) {
  return getTemplate(family);
}

export function getAdminImportTemplates() {
  return getAllTemplates();
}

export function canUseAdminFamilyImport(
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
  family: SupportedAdminImportFamily,
) {
  return canEditAdminFamily(role, capabilities, family) || hasProductUserCapability(role, capabilities, "can_manage_imports");
}
