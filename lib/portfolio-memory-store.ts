import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { buildAccountUserKey } from "@/lib/account-identity";
import {
  canUseFileFallback,
  getFileFallbackDisabledMessage,
} from "@/lib/durable-data-runtime";
import { getDurableStockQuoteSnapshot } from "@/lib/market-data-durable-store";
import { sampleStocks } from "@/lib/mock-data";
import { importReviewItems, manualPortfolioFields, samplePortfolioHoldings } from "@/lib/portfolio";

export type PortfolioImportRun = {
  id: string;
  sourceLabel: string;
  sourceKind: "Broker export" | "Spreadsheet" | "Manual upload";
  fileName: string;
  importedRows: number;
  unresolvedRows: number;
  status: "Reviewed" | "Needs action" | "Ready to save";
  createdAt: string;
  initiatedBy: string;
  lastReconciledAt: string | null;
  lastReconciliationStatus: PortfolioReconciliationRecord["status"] | null;
  reconciliationDelta: string | null;
};

export type PortfolioReconciliationRecord = {
  id: string;
  fileName: string;
  sourceLabel: string;
  runCreatedAt: string;
  acceptedRows: number;
  manualReviewRows: number;
  pendingRows: number;
  holdingsAfter: number;
  status: "Confirmed" | "Needs follow-up";
  note: string;
  confirmedAt: string;
  unresolvedBefore: number;
  unresolvedAfter: number;
  resolvedDelta: number;
  checkpointKind: "First checkpoint" | "Follow-up checkpoint";
};

export type PortfolioImportReviewMemoryItem = {
  importedValue: string;
  suggestedMatch: string;
  issue: string;
  action: string;
  confidence: "High" | "Medium" | "Low";
  decisionState: "Pending" | "Accepted" | "Manual review";
};

export type PortfolioSnapshotMemoryItem = {
  symbol: string;
  assetName: string;
  quantity: string;
  avgCost: string;
  currentPrice: string;
  marketValue: string;
  pnl: string;
  weight: string;
};

export type ManualPortfolioDraft = {
  symbol: string;
  quantity: string;
  avgCost: string;
  portfolioTag: string;
  draftState: "Draft ready" | "Needs validation";
  updatedAt: string;
};

export type PortfolioActivityEntry = {
  id: string;
  scope: "portfolio" | "import_run" | "review_queue" | "manual_draft" | "reconciliation";
  title: string;
  detail: string;
  action: "Created" | "Updated" | "Removed" | "Cleared" | "Logged";
  timestamp: string;
};

type PortfolioMemoryRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  importRuns: PortfolioImportRun[];
  reconciliations: PortfolioReconciliationRecord[];
  reviewQueue: PortfolioImportReviewMemoryItem[];
  portfolioSnapshot: PortfolioSnapshotMemoryItem[];
  manualDraft: ManualPortfolioDraft;
  activityLog: PortfolioActivityEntry[];
};

type PortfolioMemoryStore = {
  version: number;
  accounts: PortfolioMemoryRecord[];
};

export type PortfolioMemory = {
  userKey: string;
  email: string;
  updatedAt: string;
  storageMode: "file_backed_preview" | "supabase_private_beta";
  importRuns: PortfolioImportRun[];
  reconciliations: PortfolioReconciliationRecord[];
  reviewQueue: PortfolioImportReviewMemoryItem[];
  portfolioSnapshot: PortfolioSnapshotMemoryItem[];
  manualDraft: ManualPortfolioDraft;
  activityLog: PortfolioActivityEntry[];
  summary: {
    importRuns: number;
    reconciliations: number;
    unresolvedRows: number;
    holdings: number;
    activityEntries: number;
  };
};

export type SaveManualPortfolioDraftInput = {
  symbol: string;
  quantity: string;
  avgCost: string;
  portfolioTag: string;
};

export type PortfolioReviewDecisionInput = {
  importedValue: string;
  issue: string;
  decisionState: PortfolioImportReviewMemoryItem["decisionState"];
};

export type AddPortfolioReviewItemInput = {
  importedValue: string;
  suggestedMatch: string;
  issue: string;
  action: string;
  confidence: PortfolioImportReviewMemoryItem["confidence"];
  decisionState: PortfolioImportReviewMemoryItem["decisionState"];
};

export type CreatePortfolioImportRunInput = {
  sourceLabel: string;
  fileName: string;
  importedRows: number;
  unresolvedRows: number;
  status: PortfolioImportRun["status"];
};

export type RemovePortfolioReviewItemInput = {
  importedValue: string;
  issue: string;
};

export type RemovePortfolioImportRunInput = {
  fileName: string;
  createdAt: string;
};

export type ConfirmPortfolioReconciliationInput = {
  fileName: string;
  createdAt: string;
  note: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "portfolio-memory.json");
const STORE_VERSION = 1;
const DURABLE_LANE = "portfolio" as const;
let portfolioMutationQueue = Promise.resolve();
const PORTFOLIO_MEMORY_FALLBACK_SCOPE = "Portfolio workspace";

const LEGACY_SEEDED_IMPORT_RUNS: Omit<
  PortfolioImportRun,
  "id" | "sourceKind" | "initiatedBy" | "lastReconciledAt" | "lastReconciliationStatus" | "reconciliationDelta"
>[] = [
  {
    sourceLabel: "Zerodha export",
    fileName: "zerodha-holdings-apr.csv",
    importedRows: 11,
    unresolvedRows: 2,
    status: "Needs action",
    createdAt: "2026-04-15T07:45:00.000Z",
  },
  {
    sourceLabel: "Manual spreadsheet",
    fileName: "family-account-review.csv",
    importedRows: 6,
    unresolvedRows: 0,
    status: "Reviewed",
    createdAt: "2026-04-12T11:20:00.000Z",
  },
];

const LEGACY_SEEDED_REVIEW_QUEUE: PortfolioImportReviewMemoryItem[] = importReviewItems.map((item, index) => ({
  ...item,
  confidence: index === 0 ? "High" : index === 1 ? "Medium" : "Low",
  decisionState: index === 0 ? "Accepted" : "Pending",
}));

const LEGACY_SEEDED_PORTFOLIO_SNAPSHOT: PortfolioSnapshotMemoryItem[] = samplePortfolioHoldings.map((item) => ({ ...item }));

const LEGACY_SEEDED_MANUAL_DRAFT: ManualPortfolioDraft = {
  symbol: "TATAMOTORS",
  quantity: "40",
  avgCost: "945",
  portfolioTag: manualPortfolioFields[3]?.placeholder ?? "Long term",
  draftState: "Draft ready",
  updatedAt: "2026-04-15T08:10:00.000Z",
};

const EMPTY_MANUAL_DRAFT: ManualPortfolioDraft = {
  symbol: "",
  quantity: "",
  avgCost: "",
  portfolioTag: "",
  draftState: "Needs validation",
  updatedAt: "",
};

const DEFAULT_STORE: PortfolioMemoryStore = {
  version: STORE_VERSION,
  accounts: [],
};

function formatCurrencyInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrencyInr(value: number) {
  const formatted = formatCurrencyInr(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

function formatWeightShare(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function toActivitySlug(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "entry";
}

function buildPortfolioActivityEntry(input: Omit<PortfolioActivityEntry, "id">): PortfolioActivityEntry {
  return {
    ...input,
    id: `${input.scope}-${toActivitySlug(input.title)}-${input.timestamp}`,
  };
}

function buildPortfolioImportRunId(fileName: string, createdAt: string) {
  return `import-run-${toActivitySlug(fileName)}-${createdAt}`;
}

function parseNumericField(value: string) {
  const parsed = Number(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeHoldingSymbol(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function buildHoldingFallbackName(symbol: string) {
  return symbol
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveHoldingIdentity(symbol: string, existingAssetName?: string) {
  const normalizedSymbol = normalizeHoldingSymbol(symbol);
  const slugGuess = normalizedSymbol.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const stockMatch =
    sampleStocks.find((item) => item.symbol.toUpperCase() === normalizedSymbol) ??
    sampleStocks.find((item) => item.slug === slugGuess) ??
    sampleStocks.find((item) => item.slug.replace(/-/g, "").toUpperCase() === normalizedSymbol) ??
    null;

  return {
    symbol: stockMatch?.symbol ?? normalizedSymbol,
    slug: stockMatch?.slug ?? slugGuess,
    assetName: stockMatch?.name ?? existingAssetName ?? buildHoldingFallbackName(normalizedSymbol),
  };
}

type SnapshotComputation = {
  symbol: string;
  assetName: string;
  quantity: string;
  avgCost: string;
  currentPriceValue: number | null;
  marketValueValue: number | null;
  pnlValue: number | null;
};

async function materializePortfolioSnapshot(items: PortfolioSnapshotMemoryItem[]) {
  const computations = await Promise.all(
    items.map(async (item): Promise<SnapshotComputation> => {
      const identity = resolveHoldingIdentity(item.symbol, item.assetName);
      const quantityValue = parseNumericField(item.quantity);
      const avgCostValue = parseNumericField(item.avgCost);
      const quote = identity.slug ? await getDurableStockQuoteSnapshot(identity.slug) : null;
      const marketValueValue =
        quote && quantityValue > 0 ? Number((quantityValue * quote.price).toFixed(2)) : null;
      const pnlValue =
        quote && quantityValue > 0 ? Number((marketValueValue! - quantityValue * avgCostValue).toFixed(2)) : null;

      return {
        symbol: identity.symbol,
        assetName: identity.assetName,
        quantity: item.quantity,
        avgCost: formatCurrencyInr(avgCostValue),
        currentPriceValue: quote ? quote.price : null,
        marketValueValue,
        pnlValue,
      };
    }),
  );

  const quotedTotalMarketValue = computations.reduce((sum, item) => sum + (item.marketValueValue ?? 0), 0);
  const canComputeWeight = quotedTotalMarketValue > 0 && computations.every((item) => item.marketValueValue !== null);

  return computations.map<PortfolioSnapshotMemoryItem>((item) => ({
    symbol: item.symbol,
    assetName: item.assetName,
    quantity: item.quantity,
    avgCost: item.avgCost,
    currentPrice:
      item.currentPriceValue === null ? "Awaiting live quote" : formatCurrencyInr(item.currentPriceValue),
    marketValue:
      item.marketValueValue === null ? "Awaiting live quote" : formatCurrencyInr(item.marketValueValue),
    pnl: item.pnlValue === null ? "Awaiting live quote" : formatSignedCurrencyInr(item.pnlValue),
    weight:
      canComputeWeight && item.marketValueValue !== null
        ? formatWeightShare(item.marketValueValue / quotedTotalMarketValue)
        : "Pending quote mix",
  }));
}

function inferPortfolioSourceKind(sourceLabel: string, fileName: string): PortfolioImportRun["sourceKind"] {
  const normalized = `${sourceLabel} ${fileName}`.toLowerCase();

  if (normalized.includes("zerodha") || normalized.includes("upstox") || normalized.includes("kite") || normalized.includes("broker")) {
    return "Broker export";
  }

  if (
    normalized.includes("sheet") ||
    normalized.includes("spreadsheet") ||
    normalized.endsWith(".xlsx") ||
    normalized.endsWith(".xls")
  ) {
    return "Spreadsheet";
  }

  return "Manual upload";
}

function normalizePortfolioImportRun(item: PortfolioImportRun, email: string): PortfolioImportRun {
  return {
    ...item,
    id: item.id || buildPortfolioImportRunId(item.fileName, item.createdAt),
    sourceKind: item.sourceKind ?? inferPortfolioSourceKind(item.sourceLabel, item.fileName),
    initiatedBy: item.initiatedBy ?? email,
    lastReconciledAt: item.lastReconciledAt ?? null,
    lastReconciliationStatus: item.lastReconciliationStatus ?? null,
    reconciliationDelta: item.reconciliationDelta ?? null,
  };
}

function appendPortfolioActivityLog(entries: PortfolioActivityEntry[], entry: PortfolioActivityEntry): PortfolioActivityEntry[] {
  return [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, 18);
}

function clonePortfolioReconciliationRecord(item: PortfolioReconciliationRecord): PortfolioReconciliationRecord {
  return {
    ...item,
    unresolvedBefore: item.unresolvedBefore ?? item.pendingRows,
    unresolvedAfter: item.unresolvedAfter ?? item.pendingRows,
    resolvedDelta: item.resolvedDelta ?? 0,
    checkpointKind: item.checkpointKind ?? "First checkpoint",
  };
}

function cloneRecord(record: PortfolioMemoryRecord): PortfolioMemoryRecord {
  return {
    ...record,
    importRuns: record.importRuns.map((item) => normalizePortfolioImportRun(item, record.email)),
    reconciliations: Array.isArray(record.reconciliations)
      ? record.reconciliations.map(clonePortfolioReconciliationRecord)
      : [],
    reviewQueue: record.reviewQueue.map((item) => ({ ...item })),
    portfolioSnapshot: record.portfolioSnapshot.map((item) => ({ ...item })),
    manualDraft: { ...record.manualDraft },
    activityLog: Array.isArray(record.activityLog) ? record.activityLog.map((item) => ({ ...item })) : [],
  };
}

function buildEmptyPortfolioRecord(user: Pick<User, "id" | "email">, updatedAt = new Date().toISOString()): PortfolioMemoryRecord {
  const email = user.email ?? `${user.id}@local-preview.riddra`;

  return {
    userKey: buildUserKey(user),
    email,
    updatedAt,
    importRuns: [],
    reconciliations: [],
    reviewQueue: [],
    portfolioSnapshot: [],
    manualDraft: {
      ...EMPTY_MANUAL_DRAFT,
      updatedAt,
    },
    activityLog: [
      buildPortfolioActivityEntry({
        scope: "portfolio",
        title: "Portfolio workspace initialized",
        detail: "This account starts with an empty persisted portfolio state until the user imports holdings or saves a manual draft.",
        action: "Logged",
        timestamp: updatedAt,
      }),
    ],
  };
}

function isLegacySeededPortfolioRecord(record: PortfolioMemoryRecord) {
  return (
    record.importRuns.length === LEGACY_SEEDED_IMPORT_RUNS.length &&
    record.reviewQueue.length === LEGACY_SEEDED_REVIEW_QUEUE.length &&
    record.portfolioSnapshot.length === LEGACY_SEEDED_PORTFOLIO_SNAPSHOT.length &&
    record.reconciliations.length === 0 &&
    record.manualDraft.symbol === LEGACY_SEEDED_MANUAL_DRAFT.symbol &&
    record.manualDraft.quantity === LEGACY_SEEDED_MANUAL_DRAFT.quantity &&
    record.manualDraft.avgCost === LEGACY_SEEDED_MANUAL_DRAFT.avgCost &&
    record.activityLog.some(
      (item) =>
        item.scope === "portfolio" &&
        item.detail ===
          "Seeded import runs, review queue, holdings snapshot, and manual draft were attached to the signed-in preview portfolio.",
    )
  );
}

function normalizeLegacySeededPortfolioRecord(record: PortfolioMemoryRecord): PortfolioMemoryRecord {
  const normalized = buildEmptyPortfolioRecord({ id: record.userKey, email: record.email }, new Date().toISOString());

  return {
    ...normalized,
    userKey: record.userKey,
    email: record.email,
    activityLog: [
      buildPortfolioActivityEntry({
        scope: "portfolio",
        title: "Legacy preview snapshot cleared",
        detail: "Seeded portfolio holdings were removed so this workspace now starts from real user data only.",
        action: "Cleared",
        timestamp: normalized.updatedAt,
      }),
      ...normalized.activityLog,
    ].slice(0, 18),
  };
}

function buildDefaultRecord(user: Pick<User, "id" | "email">): PortfolioMemoryRecord {
  return buildEmptyPortfolioRecord(user);
}

async function readStore(): Promise<PortfolioMemoryStore> {
  if (!canUseFileFallback()) {
    return DEFAULT_STORE;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<PortfolioMemoryStore>;

    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      accounts: Array.isArray(parsed.accounts)
        ? parsed.accounts.map((item) => cloneRecord(item as PortfolioMemoryRecord))
        : [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: PortfolioMemoryStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage(PORTFOLIO_MEMORY_FALLBACK_SCOPE));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function removePortfolioRecordFromFileStore(userKey: string) {
  const store = await readStore();

  if (!store.accounts.some((item) => item.userKey === userKey)) {
    return;
  }

  await writeStore({
    ...store,
    accounts: store.accounts.filter((item) => item.userKey !== userKey).map(cloneRecord),
  });
}

async function readDurablePortfolioRecord(userKey: string) {
  const payload = await readDurableAccountStateLane<PortfolioMemoryRecord>(userKey, DURABLE_LANE);
  return payload ? cloneRecord(payload) : null;
}

async function ensurePortfolioRecordInStore(store: PortfolioMemoryStore, user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const existing = store.accounts.find((item) => item.userKey === userKey);

  if (existing) {
    return { record: cloneRecord(existing), store };
  }

  const record = buildDefaultRecord(user);
  return {
    record: cloneRecord(record),
    store: {
      ...store,
      accounts: [...store.accounts, record],
    },
  };
}

async function ensurePortfolioRecord(user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const durableRecord = await readDurablePortfolioRecord(userKey);

  if (durableRecord) {
    if (isLegacySeededPortfolioRecord(durableRecord)) {
      const normalizedRecord = normalizeLegacySeededPortfolioRecord(durableRecord);
      const storageMode = await savePortfolioRecord(normalizedRecord);
      return {
        record: normalizedRecord,
        storageMode,
      };
    }

    return {
      record: durableRecord,
      storageMode: "supabase_private_beta" as const,
    };
  }

  if (!canUseFileFallback()) {
    return {
      record: buildDefaultRecord(user),
      storageMode: "supabase_private_beta" as const,
    };
  }

  const store = await readStore();
  const existing = store.accounts.find((item) => item.userKey === userKey);
  const baseRecord = existing ? cloneRecord(existing) : buildDefaultRecord(user);
  const normalizedRecord = isLegacySeededPortfolioRecord(baseRecord)
    ? normalizeLegacySeededPortfolioRecord(baseRecord)
    : baseRecord;
  const storageMode = await savePortfolioRecord(normalizedRecord);

  return {
    record: normalizedRecord,
    storageMode,
  };
}

async function savePortfolioRecord(record: PortfolioMemoryRecord): Promise<PortfolioMemory["storageMode"]> {
  const wroteDurableRecord = await writeDurableAccountStateLane(record.userKey, record.email, DURABLE_LANE, cloneRecord(record));

  if (wroteDurableRecord) {
    await removePortfolioRecordFromFileStore(record.userKey);
    return "supabase_private_beta";
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage(PORTFOLIO_MEMORY_FALLBACK_SCOPE));
  }

  const store = await readStore();
  const nextAccounts = store.accounts.some((item) => item.userKey === record.userKey)
    ? store.accounts.map((item) => (item.userKey === record.userKey ? cloneRecord(record) : cloneRecord(item)))
    : [...store.accounts.map(cloneRecord), cloneRecord(record)];

  await writeStore({
    ...store,
    accounts: nextAccounts,
  });

  return "file_backed_preview";
}

export async function getPortfolioMemory(user: Pick<User, "id" | "email">): Promise<PortfolioMemory> {
  const { record, storageMode } = await ensurePortfolioRecord(user);
  const unresolvedRows = record.importRuns.reduce((sum, item) => sum + item.unresolvedRows, 0);

  return {
    userKey: record.userKey,
    email: record.email,
    updatedAt: record.updatedAt,
    storageMode,
    importRuns: record.importRuns,
    reconciliations: record.reconciliations,
    reviewQueue: record.reviewQueue,
    portfolioSnapshot: record.portfolioSnapshot,
    manualDraft: record.manualDraft,
    activityLog: record.activityLog,
    summary: {
      importRuns: record.importRuns.length,
      reconciliations: record.reconciliations.length,
      unresolvedRows,
      holdings: record.portfolioSnapshot.length,
      activityEntries: record.activityLog.length,
    },
  };
}

export async function createPortfolioImportRun(
  user: Pick<User, "id" | "email">,
  input: CreatePortfolioImportRunInput,
): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const timestamp = new Date().toISOString();
    const nextRun: PortfolioImportRun = {
      id: buildPortfolioImportRunId(input.fileName.trim(), timestamp),
      sourceLabel: input.sourceLabel.trim(),
      sourceKind: inferPortfolioSourceKind(input.sourceLabel.trim(), input.fileName.trim()),
      fileName: input.fileName.trim(),
      importedRows: Math.max(0, input.importedRows),
      unresolvedRows: Math.max(0, input.unresolvedRows),
      status: input.status,
      createdAt: timestamp,
      initiatedBy: record.email,
      lastReconciledAt: null,
      lastReconciliationStatus: null,
      reconciliationDelta: null,
    };

    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      importRuns: [nextRun, ...record.importRuns].slice(0, 12),
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "import_run",
          title: nextRun.fileName,
          detail: `${nextRun.sourceLabel} · ${nextRun.importedRows} imported · ${nextRun.unresolvedRows} unresolved · ${nextRun.status}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}

export async function removePortfolioImportRun(
  user: Pick<User, "id" | "email">,
  input: RemovePortfolioImportRunInput,
): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const fileName = input.fileName.trim();
    const createdAt = input.createdAt.trim();

    if (!fileName || !createdAt) {
      throw new Error("Import run file name and timestamp are required.");
    }

    const removedRun = record.importRuns.find((item) => item.fileName === fileName && item.createdAt === createdAt);
    const nextImportRuns = record.importRuns.filter((item) => !(item.fileName === fileName && item.createdAt === createdAt));

    if (nextImportRuns.length === record.importRuns.length) {
      throw new Error(`Unknown import run: ${fileName}`);
    }

    const timestamp = new Date().toISOString();
    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      importRuns: nextImportRuns,
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "import_run",
          title: fileName,
          detail: removedRun
            ? `${removedRun.sourceLabel} · ${removedRun.importedRows} imported · ${removedRun.unresolvedRows} unresolved removed from import history.`
            : "Import run removed from portfolio history.",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}

export async function saveManualPortfolioDraft(
  user: Pick<User, "id" | "email">,
  input: SaveManualPortfolioDraftInput,
): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const timestamp = new Date().toISOString();
    const normalizedSymbol = normalizeHoldingSymbol(input.symbol);
    const quantityValue = parseNumericField(input.quantity);
    const avgCostValue = parseNumericField(input.avgCost);
    const isDraftReady =
      normalizedSymbol.length > 0 &&
      Number.isFinite(quantityValue) &&
      quantityValue > 0 &&
      Number.isFinite(avgCostValue) &&
      avgCostValue > 0;
    const nextSnapshot = isDraftReady
      ? await materializePortfolioSnapshot([
          ...record.portfolioSnapshot.filter((item) => normalizeHoldingSymbol(item.symbol) !== normalizedSymbol),
          {
            symbol: normalizedSymbol,
            assetName: resolveHoldingIdentity(normalizedSymbol).assetName,
            quantity: input.quantity.trim(),
            avgCost: input.avgCost.trim(),
            currentPrice: "Awaiting live quote",
            marketValue: "Awaiting live quote",
            pnl: "Awaiting live quote",
            weight: "Pending quote mix",
          },
        ])
      : record.portfolioSnapshot.map((item) => ({ ...item }));

    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      portfolioSnapshot: nextSnapshot,
      manualDraft: {
        symbol: normalizedSymbol,
        quantity: input.quantity.trim(),
        avgCost: input.avgCost.trim(),
        portfolioTag: input.portfolioTag.trim(),
        draftState: isDraftReady ? "Draft ready" : "Needs validation",
        updatedAt: timestamp,
      },
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "manual_draft",
          title: normalizedSymbol || "Manual portfolio draft",
          detail: isDraftReady
            ? `${input.quantity.trim() || "0"} shares @ ${input.avgCost.trim() || "0"} · ${input.portfolioTag.trim() || "Unassigned"} · holdings snapshot updated`
            : `${input.quantity.trim() || "0"} shares @ ${input.avgCost.trim() || "0"} · ${input.portfolioTag.trim() || "Unassigned"}`,
          action: "Updated",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}

export async function savePortfolioReviewDecision(
  user: Pick<User, "id" | "email">,
  input: PortfolioReviewDecisionInput,
): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const timestamp = new Date().toISOString();
    const nextReviewQueue = record.reviewQueue.map((item) =>
      item.importedValue === input.importedValue && item.issue === input.issue
        ? { ...item, decisionState: input.decisionState }
        : { ...item },
    );

    const unresolvedRows = nextReviewQueue.filter((item) => item.decisionState === "Pending").length;
    const nextImportRuns =
      record.importRuns.length === 0
        ? []
        : record.importRuns.map((run, index) =>
            index === 0
              ? {
                  ...run,
                  unresolvedRows,
                  status:
                    unresolvedRows === 0
                      ? ("Ready to save" as const)
                      : run.status === "Reviewed"
                        ? ("Reviewed" as const)
                        : ("Needs action" as const),
                }
              : { ...run },
          );

    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      reviewQueue: nextReviewQueue,
      importRuns: nextImportRuns,
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "review_queue",
          title: input.importedValue,
          detail: `${input.issue} · decision set to ${input.decisionState}`,
          action: "Updated",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}

export async function addPortfolioReviewItem(
  user: Pick<User, "id" | "email">,
  input: AddPortfolioReviewItemInput,
): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const timestamp = new Date().toISOString();
    const nextItem: PortfolioImportReviewMemoryItem = {
      importedValue: input.importedValue.trim(),
      suggestedMatch: input.suggestedMatch.trim(),
      issue: input.issue.trim(),
      action: input.action.trim(),
      confidence: input.confidence,
      decisionState: input.decisionState,
    };

    const nextReviewQueue = [
      nextItem,
      ...record.reviewQueue.filter(
        (item) => !(item.importedValue === nextItem.importedValue && item.issue === nextItem.issue),
      ),
    ].slice(0, 20);
    const unresolvedRows = nextReviewQueue.filter((item) => item.decisionState === "Pending").length;
    const nextImportRuns =
      record.importRuns.length === 0
        ? []
        : record.importRuns.map((run, index) =>
            index === 0
              ? {
                  ...run,
                  unresolvedRows,
                  status:
                    unresolvedRows === 0
                      ? ("Ready to save" as const)
                      : ("Needs action" as const),
                }
              : { ...run },
          );

    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      reviewQueue: nextReviewQueue,
      importRuns: nextImportRuns,
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "review_queue",
          title: nextItem.importedValue,
          detail: `${nextItem.issue} · ${nextItem.confidence} confidence · ${nextItem.decisionState}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}

export async function confirmPortfolioReconciliation(
  user: Pick<User, "id" | "email">,
  input: ConfirmPortfolioReconciliationInput,
): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const timestamp = new Date().toISOString();
    const fileName = input.fileName.trim();
    const createdAt = input.createdAt.trim();
    const targetRun = record.importRuns.find((item) => item.fileName === fileName && item.createdAt === createdAt);

    if (!fileName || !createdAt) {
      throw new Error("Import run file name and timestamp are required.");
    }

    if (!targetRun) {
      throw new Error(`Unknown import run: ${fileName}`);
    }

    const acceptedRows = record.reviewQueue.filter((item) => item.decisionState === "Accepted").length;
    const manualReviewRows = record.reviewQueue.filter((item) => item.decisionState === "Manual review").length;
    const pendingRows = record.reviewQueue.filter((item) => item.decisionState === "Pending").length;
    const previousCheckpoint = record.reconciliations.find(
      (item) => item.fileName === fileName && item.runCreatedAt === createdAt,
    );
    const unresolvedBefore = targetRun.unresolvedRows;
    const unresolvedAfter = pendingRows;
    const resolvedDelta = Math.max(0, unresolvedBefore - unresolvedAfter);
    const note =
      input.note.trim() ||
      (pendingRows === 0
        ? "User confirmed the current mismatch queue before the next portfolio save."
        : "User saved a reconciliation checkpoint while some mismatch rows still need follow-up.");

    const nextCheckpoint: PortfolioReconciliationRecord = {
      id: `reconciliation-${toActivitySlug(fileName)}-${timestamp}`,
      fileName,
      sourceLabel: targetRun.sourceLabel,
      runCreatedAt: targetRun.createdAt,
      acceptedRows,
      manualReviewRows,
      pendingRows,
      holdingsAfter: record.portfolioSnapshot.length,
      status: pendingRows === 0 ? "Confirmed" : "Needs follow-up",
      note,
      confirmedAt: timestamp,
      unresolvedBefore,
      unresolvedAfter,
      resolvedDelta,
      checkpointKind: previousCheckpoint ? "Follow-up checkpoint" : "First checkpoint",
    };

    const nextImportRuns = record.importRuns.map((run) =>
      run.fileName === fileName && run.createdAt === createdAt
        ? {
            ...run,
            unresolvedRows: pendingRows,
            status: pendingRows === 0 ? ("Reviewed" as const) : ("Needs action" as const),
            lastReconciledAt: timestamp,
            lastReconciliationStatus: nextCheckpoint.status,
            reconciliationDelta: `${unresolvedBefore} -> ${unresolvedAfter} unresolved`,
          }
        : { ...run },
    );

    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      importRuns: nextImportRuns,
      reconciliations: [nextCheckpoint, ...record.reconciliations.filter((item) => item.id !== nextCheckpoint.id)].slice(0, 12),
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "reconciliation",
          title: fileName,
          detail: `${acceptedRows} accepted · ${manualReviewRows} manual review · ${pendingRows} pending · resolved ${resolvedDelta} rows · ${note}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}

export async function clearManualPortfolioDraft(user: Pick<User, "id" | "email">): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const timestamp = new Date().toISOString();
    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      manualDraft: {
        symbol: "",
        quantity: "",
        avgCost: "",
        portfolioTag: "",
        draftState: "Needs validation",
        updatedAt: timestamp,
      },
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "manual_draft",
          title: record.manualDraft.symbol || "Manual portfolio draft",
          detail: "Manual draft cleared from the persisted portfolio workspace.",
          action: "Cleared",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}

export async function removePortfolioReviewItem(
  user: Pick<User, "id" | "email">,
  input: RemovePortfolioReviewItemInput,
): Promise<PortfolioMemory> {
  const mutation = portfolioMutationQueue.then(async () => {
    const { record } = await ensurePortfolioRecord(user);
    const timestamp = new Date().toISOString();
    const removedItem = record.reviewQueue.find(
      (item) => item.importedValue === input.importedValue && item.issue === input.issue,
    );
    const nextReviewQueue = record.reviewQueue.filter(
      (item) => !(item.importedValue === input.importedValue && item.issue === input.issue),
    );

    if (nextReviewQueue.length === record.reviewQueue.length) {
      throw new Error(`Unknown review row: ${input.importedValue}`);
    }

    const unresolvedRows = nextReviewQueue.filter((item) => item.decisionState === "Pending").length;
    const nextImportRuns = record.importRuns.map((run, index) =>
      index === 0
        ? {
            ...run,
            unresolvedRows,
            status: unresolvedRows === 0 ? ("Ready to save" as const) : ("Needs action" as const),
          }
        : { ...run },
    );

    const nextRecord: PortfolioMemoryRecord = {
      ...record,
      updatedAt: timestamp,
      reviewQueue: nextReviewQueue,
      importRuns: nextImportRuns,
      activityLog: appendPortfolioActivityLog(
        record.activityLog,
        buildPortfolioActivityEntry({
          scope: "review_queue",
          title: input.importedValue,
          detail: removedItem ? `${removedItem.issue} · removed from reconciliation queue` : "Removed from reconciliation queue",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await savePortfolioRecord(nextRecord);
  });

  portfolioMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getPortfolioMemory(user);
}
