import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type SearchQueryReviewStatus = "Open" | "In progress" | "Ready" | "Blocked";

export type SearchQueryReviewRow = {
  query: string;
  status: SearchQueryReviewStatus;
  owner: string;
  proposedAlias: string;
  proposedRoute: string;
  note: string;
  sourceZeroResultCount: number;
  updatedAt: string;
};

type SearchQueryReviewStore = {
  version: number;
  reviews: SearchQueryReviewRow[];
};

export type SearchQueryReviewMemory = {
  reviews: SearchQueryReviewRow[];
  summary: {
    totalReviews: number;
    openReviews: number;
    inProgressReviews: number;
    readyReviews: number;
    blockedReviews: number;
    totalZeroResultSignals: number;
  };
  rules: string[];
};

export type SaveSearchQueryReviewInput = {
  query: string;
  status: SearchQueryReviewStatus;
  owner: string;
  proposedAlias?: string;
  proposedRoute?: string;
  note: string;
  sourceZeroResultCount?: number;
};

export type RemoveSearchQueryReviewInput = {
  query: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "search-query-review-memory.json");
const STORE_VERSION = 1;
let searchQueryReviewMutationQueue = Promise.resolve();

async function readStore(): Promise<SearchQueryReviewStore | null> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as SearchQueryReviewStore;
  } catch {
    return null;
  }
}

async function writeStore(store: SearchQueryReviewStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function buildDefaultStore(): SearchQueryReviewStore {
  return {
    version: STORE_VERSION,
    reviews: [],
  };
}

async function ensureStore() {
  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store?.reviews) {
    return store;
  }

  const nextStore = buildDefaultStore();
  await writeStore(nextStore);
  return nextStore;
}

function sanitizeCount(value: number | undefined) {
  return Number.isFinite(value) && Number(value) >= 0 ? Math.round(Number(value)) : 0;
}

function toMemory(store: SearchQueryReviewStore): SearchQueryReviewMemory {
  return {
    reviews: [...store.reviews].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    summary: {
      totalReviews: store.reviews.length,
      openReviews: store.reviews.filter((item) => item.status === "Open").length,
      inProgressReviews: store.reviews.filter((item) => item.status === "In progress").length,
      readyReviews: store.reviews.filter((item) => item.status === "Ready").length,
      blockedReviews: store.reviews.filter((item) => item.status === "Blocked").length,
      totalZeroResultSignals: store.reviews.reduce((sum, item) => sum + item.sourceZeroResultCount, 0),
    },
    rules: [
      "Repeated zero-result and weak-result searches should turn into explicit review rows, not disappear inside analytics summaries.",
      "Every review row should name an owner and a likely alias or route fix so search-quality work becomes executable.",
      "Ready reviews should still stay visible until the underlying alias or index change is actually shipped.",
    ],
  };
}

export async function getSearchQueryReviewMemory(): Promise<SearchQueryReviewMemory> {
  const store = await ensureStore();
  return toMemory(store);
}

export async function saveSearchQueryReview(input: SaveSearchQueryReviewInput): Promise<SearchQueryReviewMemory> {
  const mutation = searchQueryReviewMutationQueue.then(async () => {
    const store = await ensureStore();
    const query = input.query.trim();

    if (!query) {
      throw new Error("Query is required.");
    }

    const nextRow: SearchQueryReviewRow = {
      query,
      status: input.status,
      owner: input.owner.trim() || "Search Truth Owner",
      proposedAlias: input.proposedAlias?.trim() || "",
      proposedRoute: input.proposedRoute?.trim() || "",
      note: input.note.trim(),
      sourceZeroResultCount: sanitizeCount(input.sourceZeroResultCount),
      updatedAt: new Date().toISOString(),
    };

    const nextStore: SearchQueryReviewStore = {
      ...store,
      reviews: [
        nextRow,
        ...store.reviews.filter((item) => item.query.toLowerCase() !== query.toLowerCase()),
      ],
    };

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  searchQueryReviewMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeSearchQueryReview(input: RemoveSearchQueryReviewInput): Promise<SearchQueryReviewMemory> {
  const mutation = searchQueryReviewMutationQueue.then(async () => {
    const store = await ensureStore();
    const query = input.query.trim();

    if (!query) {
      throw new Error("Query is required.");
    }

    if (!store.reviews.some((item) => item.query.toLowerCase() === query.toLowerCase())) {
      throw new Error(`Unknown search query review: ${query}`);
    }

    const nextStore: SearchQueryReviewStore = {
      ...store,
      reviews: store.reviews.filter((item) => item.query.toLowerCase() !== query.toLowerCase()),
    };

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  searchQueryReviewMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export function toSearchQueryReviewCsv(reviews: SearchQueryReviewRow[]) {
  const columns = [
    "query",
    "status",
    "owner",
    "proposed_alias",
    "proposed_route",
    "note",
    "source_zero_result_count",
    "updated_at",
  ];
  const dataRows = reviews.map((item) =>
    [
      item.query,
      item.status,
      item.owner,
      item.proposedAlias,
      item.proposedRoute,
      item.note,
      item.sourceZeroResultCount,
      item.updatedAt,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return `${columns.join(",")}\n${dataRows.join("\n")}\n`;
}
