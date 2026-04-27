import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";
import { sampleFunds, sampleIpos, sampleStocks } from "@/lib/mock-data";

export type ResearchArchiveAssetType = "stock" | "ipo" | "fund" | "wealth";

export type ResearchArchiveRecord = {
  id: string;
  assetType: ResearchArchiveAssetType;
  slug: string;
  title: string;
  family: string;
  sourceLabel: string;
  sourceType: "official_filing" | "results_watch" | "editorial_note" | "factsheet" | "event_history";
  publishedAt: string;
  continuityNote: string;
  pageTarget: string;
  status: "Archived" | "Queued";
};

export type SaveResearchArchiveRecordInput = {
  id: string;
  title: string;
  publishedAt: string;
  continuityNote: string;
  pageTarget: string;
  status: ResearchArchiveRecord["status"];
};

export type AddResearchArchiveRecordInput = {
  id: string;
  assetType: ResearchArchiveAssetType;
  slug: string;
  title: string;
  family: string;
  sourceLabel: string;
  sourceType: ResearchArchiveRecord["sourceType"];
  publishedAt: string;
  continuityNote: string;
  pageTarget: string;
  status: ResearchArchiveRecord["status"];
};

export type RemoveResearchArchiveRecordInput = {
  id: string;
};

export type UpsertAutomatedResearchArchiveRecordInput = {
  family: string;
  outcome: "Succeeded" | "Queued" | "Needs review";
  trigger: string;
  affectedRows: number;
  nextWindow: string;
  resultSummary: string;
  executedAt?: string;
};

type ResearchArchiveFamilyLane = {
  family: string;
  retainedRows: number;
  status: "Growing" | "Needs automation";
  note: string;
};

type ResearchArchiveStore = {
  version: number;
  records: ResearchArchiveRecord[];
  familyLanes: ResearchArchiveFamilyLane[];
};

type ResearchArchiveGlobalState = {
  updatedAt: string;
  records: ResearchArchiveRecord[];
  familyLanes: ResearchArchiveFamilyLane[];
};

export type ResearchArchiveMemory = {
  updatedAt: string;
  records: ResearchArchiveRecord[];
  familyLanes: ResearchArchiveFamilyLane[];
  summary: {
    trackedLanes: number;
    archivedRows: number;
    officialFilings: number;
    publicRouteTargets: number;
  };
  rules: string[];
};

const STORE_PATH = path.join(process.cwd(), "data", "research-archive-memory.json");
const STORE_VERSION = 1;
const DURABLE_GLOBAL_LANE = "research_archive" as const;
let researchArchiveMutationQueue = Promise.resolve();

const AUTOMATED_ARCHIVE_TEMPLATES = {
  "Results archive": {
    id: "ra_auto_results_archive",
    assetType: "wealth" as const,
    slug: "results-calendar",
    family: "Stocks and results memory",
    sourceLabel: "Archive refresh automation",
    sourceType: "results_watch" as const,
    pageTarget: "/reports/results-calendar",
    title: "Results archive automation",
  },
  "FII / DII archive": {
    id: "ra_auto_fii_dii_archive",
    assetType: "wealth" as const,
    slug: "fii-dii-activity",
    family: "Announcements and editorial notes",
    sourceLabel: "Archive refresh automation",
    sourceType: "event_history" as const,
    pageTarget: "/reports/fii-dii",
    title: "FII / DII archive automation",
  },
  "Fund factsheets and commentary": {
    id: "ra_auto_fund_factsheets",
    assetType: "fund" as const,
    slug: "fund-factsheet-archive",
    family: "Fund commentary memory",
    sourceLabel: "Archive refresh automation",
    sourceType: "factsheet" as const,
    pageTarget: "/mutual-funds",
    title: "Fund factsheet archive automation",
  },
  "IPO filings and lifecycle archive": {
    id: "ra_auto_ipo_lifecycle_archive",
    assetType: "ipo" as const,
    slug: "ipo-lifecycle",
    family: "IPO lifecycle memory",
    sourceLabel: "Archive refresh automation",
    sourceType: "official_filing" as const,
    pageTarget: "/ipo",
    title: "IPO lifecycle archive automation",
  },
} as const satisfies Record<
  string,
  {
    id: string;
    assetType: ResearchArchiveAssetType;
    slug: string;
    family: string;
    sourceLabel: string;
    sourceType: ResearchArchiveRecord["sourceType"];
    pageTarget: string;
    title: string;
  }
>;

function formatArchivePublishedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildDefaultRecords(): ResearchArchiveRecord[] {
  const stockRecords = sampleStocks.slice(0, 6).flatMap((stock, index) => [
    {
      id: `ra_stock_filing_${index + 1}`,
      assetType: "stock" as const,
      slug: stock.slug,
      title: `${stock.name} filings watch is staged for this route`,
      family: "Stocks and results memory",
      sourceLabel: "Official filings",
      sourceType: "official_filing" as const,
      publishedAt: `Apr ${15 - index}, 2026`,
      continuityNote: "Preserve official filings and annual documents as one route-level memory chain instead of replacing them with the latest summary block.",
      pageTarget: `/stocks/${stock.slug}`,
      status: "Archived" as const,
    },
    {
      id: `ra_stock_result_${index + 1}`,
      assetType: "stock" as const,
      slug: stock.slug,
      title: `${stock.name} event watch is ready for results-day continuity`,
      family: "Stocks and results memory",
      sourceLabel: "Results watch",
      sourceType: "results_watch" as const,
      publishedAt: `Apr ${14 - index}, 2026`,
      continuityNote: "Results, management commentary, and event volatility should accumulate here so the page can explain what changed over time.",
      pageTarget: `/stocks/${stock.slug}`,
      status: "Archived" as const,
    },
  ]);

  const ipoRecords = sampleIpos.slice(0, 3).map((ipo, index) => ({
    id: `ra_ipo_${index + 1}`,
    assetType: "ipo" as const,
    slug: ipo.slug,
    title: `${ipo.name} issue timeline and filing chain`,
    family: "IPO lifecycle memory",
    sourceLabel: "SEBI and issue documents",
    sourceType: "official_filing" as const,
    publishedAt: `Apr ${12 - index}, 2026`,
    continuityNote: "Issue discovery, subscription, allotment, listing, and post-listing handoff should stay as one connected archive.",
    pageTarget: `/ipo/${ipo.slug}`,
    status: "Archived" as const,
  }));

  const fundRecords = sampleFunds.slice(0, 3).map((fund, index) => ({
    id: `ra_fund_${index + 1}`,
    assetType: "fund" as const,
    slug: fund.slug,
    title: `${fund.name} factsheet evidence chain`,
    family: "Fund commentary memory",
    sourceLabel: "AMC factsheet evidence",
    sourceType: "factsheet" as const,
    publishedAt: `Apr ${9 - index}, 2026`,
    continuityNote: "Factsheet evidence, manager commentary, and allocation changes should remain attached to the same fund route over time.",
    pageTarget: `/mutual-funds/${fund.slug}`,
    status: "Queued" as const,
  }));

  return [...stockRecords, ...ipoRecords, ...fundRecords];
}

function buildDefaultFamilyLanes(records: ResearchArchiveRecord[]): ResearchArchiveFamilyLane[] {
  const families = [
    "Stocks and results memory",
    "IPO lifecycle memory",
    "Fund commentary memory",
    "Announcements and editorial notes",
  ];

  return families.map((family) => {
    const retainedRows = records.filter((item) => item.family === family).length;
    return {
      family,
      retainedRows,
      status: retainedRows > 0 ? ("Growing" as const) : ("Needs automation" as const),
      note:
        family === "Announcements and editorial notes"
          ? "Editorial announcements still need richer durable writes so they stop living only in page copy and admin summaries."
          : "This family now has persisted archive rows, but recurring automation and structured enrichment still need to take over from seeded memory.",
    };
  });
}

async function buildDefaultStore(): Promise<ResearchArchiveStore> {
  const records = buildDefaultRecords();
  return {
    version: STORE_VERSION,
    records,
    familyLanes: buildDefaultFamilyLanes(records),
  };
}

async function readStore(): Promise<ResearchArchiveStore | null> {
  if (!canUseFileFallback()) {
    return await buildDefaultStore();
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<ResearchArchiveStore>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      records: Array.isArray(parsed.records) ? (parsed.records as ResearchArchiveRecord[]).map((record) => ({ ...record })) : [],
      familyLanes: Array.isArray(parsed.familyLanes)
        ? (parsed.familyLanes as ResearchArchiveFamilyLane[]).map((lane) => ({ ...lane }))
        : [],
    };
  } catch {
    return null;
  }
}

async function writeStore(store: ResearchArchiveStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Research archive persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableResearchArchiveState() {
  const payload = await readDurableGlobalStateLane<ResearchArchiveGlobalState>(DURABLE_GLOBAL_LANE);
  if (!payload) {
    return null;
  }

  return {
    updatedAt: payload.updatedAt,
    records: (payload.records ?? []).map((record) => ({ ...record })),
    familyLanes: (payload.familyLanes ?? []).map((lane) => ({ ...lane })),
  };
}

async function writeDurableResearchArchiveState(store: ResearchArchiveStore) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    records: store.records.map((record) => ({ ...record })),
    familyLanes: store.familyLanes.map((lane) => ({ ...lane })),
  });
}

async function persistStore(store: ResearchArchiveStore) {
  const wroteDurableState = await writeDurableResearchArchiveState(store);

  if (wroteDurableState) {
    if (canUseFileFallback()) {
      await writeStore(store);
    }
    return;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Research archive persistence"));
  }

  await writeStore(store);
}

async function ensureStore() {
  const store = await readStore();
  const durableState = await readDurableResearchArchiveState();

  if (durableState) {
    return {
      version: store?.version ?? STORE_VERSION,
      records: durableState.records,
      familyLanes: durableState.familyLanes,
    };
  }

  if (!canUseFileFallback()) {
    return buildDefaultStore();
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store?.records?.length) {
    await writeDurableResearchArchiveState(store);
    return store;
  }

  const nextStore = await buildDefaultStore();
  await persistStore(nextStore);
  return nextStore;
}

export async function getResearchArchiveMemory(): Promise<ResearchArchiveMemory> {
  const store = await ensureStore();

  return {
    updatedAt: new Date().toISOString(),
    records: store.records,
    familyLanes: store.familyLanes,
    summary: {
      trackedLanes: store.familyLanes.length,
      archivedRows: store.records.length,
      officialFilings: store.records.filter((item) => item.sourceType === "official_filing").length,
      publicRouteTargets: new Set(store.records.map((item) => item.pageTarget)).size,
    },
    rules: [
      "Archive rows should stay tied to an asset slug, source label, continuity note, and public route target.",
      "Official filings, results memory, factsheet evidence, and editorial notes should coexist without collapsing into one generic timeline.",
      "Public routes should read archive-backed context so page depth improves through retained history, not only seeded copy.",
    ],
  };
}

export async function getStockResearchArchiveItems(slug: string) {
  const store = await ensureStore();
  return store.records.filter((item) => item.assetType === "stock" && item.slug === slug);
}

export async function saveResearchArchiveRecord(input: SaveResearchArchiveRecordInput): Promise<ResearchArchiveMemory> {
  const mutation = researchArchiveMutationQueue.then(async () => {
    const store = await ensureStore();
    let matchedRecord = false;

    const records = store.records.map((record) => {
      if (record.id !== input.id) {
        return record;
      }

      matchedRecord = true;
      return {
        ...record,
        title: input.title,
        publishedAt: input.publishedAt,
        continuityNote: input.continuityNote,
        pageTarget: input.pageTarget,
        status: input.status,
      };
    });

    if (!matchedRecord) {
      throw new Error(`Unknown research-archive record: ${input.id}`);
    }

    await persistStore({
      ...store,
      records,
      familyLanes: buildDefaultFamilyLanes(records),
    });

    return getResearchArchiveMemory();
  });

  researchArchiveMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addResearchArchiveRecord(input: AddResearchArchiveRecordInput): Promise<ResearchArchiveMemory> {
  const mutation = researchArchiveMutationQueue.then(async () => {
    const store = await ensureStore();
    const nextRecord: ResearchArchiveRecord = {
      id: input.id.trim(),
      assetType: input.assetType,
      slug: input.slug.trim(),
      title: input.title.trim(),
      family: input.family.trim(),
      sourceLabel: input.sourceLabel.trim(),
      sourceType: input.sourceType,
      publishedAt: input.publishedAt.trim(),
      continuityNote: input.continuityNote.trim(),
      pageTarget: input.pageTarget.trim(),
      status: input.status,
    };

    if (!nextRecord.id) {
      throw new Error("Research-archive record id is required.");
    }

    if (store.records.some((record) => record.id === nextRecord.id)) {
      throw new Error(`Research-archive record already exists: ${nextRecord.id}`);
    }

    const records = [nextRecord, ...store.records];

    await persistStore({
      ...store,
      records,
      familyLanes: buildDefaultFamilyLanes(records),
    });

    return getResearchArchiveMemory();
  });

  researchArchiveMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeResearchArchiveRecord(
  input: RemoveResearchArchiveRecordInput,
): Promise<ResearchArchiveMemory> {
  const mutation = researchArchiveMutationQueue.then(async () => {
    const store = await ensureStore();
    const id = input.id.trim();

    if (!id) {
      throw new Error("Research-archive record id is required.");
    }

    const records = store.records.filter((record) => record.id !== id);

    if (records.length === store.records.length) {
      throw new Error(`Unknown research-archive record: ${input.id}`);
    }

    await persistStore({
      ...store,
      records,
      familyLanes: buildDefaultFamilyLanes(records),
    });

    return getResearchArchiveMemory();
  });

  researchArchiveMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function upsertAutomatedResearchArchiveRecord(
  input: UpsertAutomatedResearchArchiveRecordInput,
): Promise<ResearchArchiveMemory> {
  const mutation = researchArchiveMutationQueue.then(async () => {
    const store = await ensureStore();
    const template = AUTOMATED_ARCHIVE_TEMPLATES[input.family as keyof typeof AUTOMATED_ARCHIVE_TEMPLATES];

    if (!template) {
      throw new Error(`Unknown archive automation family: ${input.family}`);
    }

    const executedAt = input.executedAt ?? new Date().toISOString();
    const record: ResearchArchiveRecord = {
      id: template.id,
      assetType: template.assetType,
      slug: template.slug,
      title:
        input.outcome === "Succeeded"
          ? `${template.title} completed`
          : input.outcome === "Needs review"
            ? `${template.title} needs review`
            : `${template.title} queued`,
      family: template.family,
      sourceLabel: template.sourceLabel,
      sourceType: template.sourceType,
      publishedAt: formatArchivePublishedAt(executedAt),
      continuityNote: `${input.resultSummary} Trigger: ${input.trigger}. Outcome: ${input.outcome}. Affected rows: ${input.affectedRows}. Next window: ${input.nextWindow}.`,
      pageTarget: template.pageTarget,
      status: input.outcome === "Succeeded" ? "Archived" : "Queued",
    };

    const records = [record, ...store.records.filter((existing) => existing.id !== record.id)];

    await persistStore({
      ...store,
      records,
      familyLanes: buildDefaultFamilyLanes(records),
    });

    return getResearchArchiveMemory();
  });

  researchArchiveMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
