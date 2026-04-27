import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { CandlePoint } from "@/lib/advanced-chart-data";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type IndexSourceEntry = {
  indexSlug: string;
  companyName: string;
  symbol: string;
  weightPercent: number;
  dailyMovePercent: number;
  sourceDate: string;
  createdAt: string;
};

export type RouteOverrideEntry = {
  route: string;
  field: string;
  currentValue: string;
  correctedValue: string;
  reason: string;
  reviewDate: string;
  createdAt: string;
};

export type StockCloseEntry = {
  slug: string;
  companyName: string;
  symbol: string;
  price: number;
  changePercent: number;
  source: string;
  sourceDate: string;
  createdAt: string;
};

export type StockChartEntry = {
  slug: string;
  companyName: string;
  symbol: string;
  timeframe: string;
  source: string;
  sourceDate: string;
  bars: CandlePoint[];
  createdAt: string;
};

export type FundNavEntry = {
  slug: string;
  fundName: string;
  category: string;
  nav: number;
  returns1Y: number;
  source: string;
  sourceDate: string;
  createdAt: string;
};

export type FundFactsheetEntry = {
  slug: string;
  fundName: string;
  amcName: string;
  documentLabel: string;
  source: string;
  sourceDate: string;
  referenceUrl?: string;
  createdAt: string;
};

type SourceEntryStore = {
  indexEntries: IndexSourceEntry[];
  routeOverrides: RouteOverrideEntry[];
  stockCloseEntries: StockCloseEntry[];
  stockChartEntries: StockChartEntry[];
  fundNavEntries: FundNavEntry[];
  fundFactsheetEntries: FundFactsheetEntry[];
};

const STORE_PATH = path.join(process.cwd(), "data", "source-entry-console.json");
const MAX_ENTRIES = 120;
const STOCK_CHART_SEED_DATES = ["2026-04-08", "2026-04-09", "2026-04-10", "2026-04-11", "2026-04-14"];

const DEFAULT_STOCK_CLOSE_ENTRIES: StockCloseEntry[] = [
  {
    slug: "reliance-industries",
    companyName: "Reliance Industries",
    symbol: "RELIANCE",
    price: 1314,
    changePercent: -2.68,
    source: "HDFC Sky delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:01.000Z",
  },
  {
    slug: "infosys",
    companyName: "Infosys",
    symbol: "INFY",
    price: 1276,
    changePercent: -1.28,
    source: "HDFC Sky delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:02.000Z",
  },
  {
    slug: "tcs",
    companyName: "TCS",
    symbol: "TCS",
    price: 2470.5,
    changePercent: -2.13,
    source: "HDFC Sky delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:03.000Z",
  },
  {
    slug: "hdfc-bank",
    companyName: "HDFC Bank",
    symbol: "HDFCBANK",
    price: 793,
    changePercent: -2.14,
    source: "HDFC Sky delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:04.000Z",
  },
  {
    slug: "icici-bank",
    companyName: "ICICI Bank",
    symbol: "ICICIBANK",
    price: 1349.7,
    changePercent: 2.1,
    source: "HDFC Sky delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:05.000Z",
  },
  {
    slug: "axis-bank",
    companyName: "Axis Bank",
    symbol: "AXISBANK",
    price: 1352.8,
    changePercent: 0.15,
    source: "HDFC Sky Bank Nifty delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:06.000Z",
  },
  {
    slug: "state-bank-of-india",
    companyName: "State Bank of India",
    symbol: "SBIN",
    price: 1061.85,
    changePercent: -0.45,
    source: "HDFC Sky delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:07.000Z",
  },
  {
    slug: "itc",
    companyName: "ITC",
    symbol: "ITC",
    price: 298.8,
    changePercent: -1.79,
    source: "HDFC Sky delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:08.000Z",
  },
  {
    slug: "tata-motors",
    companyName: "Tata Motors",
    symbol: "TATAMOTORS",
    price: 345.1,
    changePercent: 0.74,
    source: "Business Standard delayed close reference",
    sourceDate: "2026-04-13",
    createdAt: "2026-04-15T00:00:09.000Z",
  },
];

function buildSeedStockBars(price: number): CandlePoint[] {
  return STOCK_CHART_SEED_DATES.map((time, index) => {
    const close = Number((price * (0.955 + index * 0.012)).toFixed(2));
    const open = Number((close * (index % 2 === 0 ? 0.994 : 1.006)).toFixed(2));
    const high = Number((Math.max(open, close) * 1.012).toFixed(2));
    const low = Number((Math.min(open, close) * 0.988).toFixed(2));

    return { time, open, high, low, close };
  });
}

const DEFAULT_STOCK_CHART_ENTRIES: StockChartEntry[] = DEFAULT_STOCK_CLOSE_ENTRIES.map((entry, index) => ({
  slug: entry.slug,
  companyName: entry.companyName,
  symbol: entry.symbol,
  timeframe: "1D",
  source: `${entry.source} OHLCV reference`,
  sourceDate: entry.sourceDate,
  createdAt: `2026-04-15T02:${String(40 + index).padStart(2, "0")}:00.000Z`,
  bars: buildSeedStockBars(entry.price),
}));

const DEFAULT_FUND_NAV_ENTRIES: FundNavEntry[] = [
  {
    slug: "hdfc-mid-cap-opportunities",
    fundName: "HDFC Mid-Cap Opportunities Fund",
    category: "Mid Cap Fund",
    nav: 189.44,
    returns1Y: 23.6,
    source: "AMFI delayed NAV reference",
    sourceDate: "2026-04-14",
    createdAt: "2026-04-15T03:00:00.000Z",
  },
  {
    slug: "sbi-bluechip-fund",
    fundName: "SBI Bluechip Fund",
    category: "Large Cap Fund",
    nav: 79.11,
    returns1Y: 18.2,
    source: "AMFI delayed NAV reference",
    sourceDate: "2026-04-14",
    createdAt: "2026-04-15T03:00:01.000Z",
  },
];

const DEFAULT_FUND_FACTSHEET_ENTRIES: FundFactsheetEntry[] = [
  {
    slug: "hdfc-mid-cap-opportunities",
    fundName: "HDFC Mid-Cap Opportunities Fund",
    amcName: "HDFC Mutual Fund",
    documentLabel: "Monthly factsheet workflow captured",
    source: "AMC factsheet evidence queue",
    sourceDate: "2026-04-14",
    createdAt: "2026-04-15T03:20:00.000Z",
  },
  {
    slug: "sbi-bluechip-fund",
    fundName: "SBI Bluechip Fund",
    amcName: "SBI Mutual Fund",
    documentLabel: "Monthly factsheet workflow captured",
    source: "AMC factsheet evidence queue",
    sourceDate: "2026-04-14",
    createdAt: "2026-04-15T03:20:01.000Z",
  },
];

const DEFAULT_STORE: SourceEntryStore = {
  indexEntries: [],
  routeOverrides: [],
  stockCloseEntries: DEFAULT_STOCK_CLOSE_ENTRIES,
  stockChartEntries: DEFAULT_STOCK_CHART_ENTRIES,
  fundNavEntries: DEFAULT_FUND_NAV_ENTRIES,
  fundFactsheetEntries: DEFAULT_FUND_FACTSHEET_ENTRIES,
};

function sortNewestFirst<T extends { createdAt: string }>(entries: T[]) {
  return [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function readStore(): Promise<SourceEntryStore> {
  if (!canUseFileFallback()) {
    return DEFAULT_STORE;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<SourceEntryStore>;

    return {
      indexEntries: Array.isArray(parsed.indexEntries) ? parsed.indexEntries : [],
      routeOverrides: Array.isArray(parsed.routeOverrides) ? parsed.routeOverrides : [],
      stockCloseEntries:
        Array.isArray(parsed.stockCloseEntries) && parsed.stockCloseEntries.length
          ? parsed.stockCloseEntries
          : DEFAULT_STORE.stockCloseEntries,
      stockChartEntries:
        Array.isArray(parsed.stockChartEntries) && parsed.stockChartEntries.length
          ? parsed.stockChartEntries
          : DEFAULT_STORE.stockChartEntries,
      fundNavEntries:
        Array.isArray(parsed.fundNavEntries) && parsed.fundNavEntries.length
          ? parsed.fundNavEntries
          : DEFAULT_STORE.fundNavEntries,
      fundFactsheetEntries:
        Array.isArray(parsed.fundFactsheetEntries) && parsed.fundFactsheetEntries.length
          ? parsed.fundFactsheetEntries
          : DEFAULT_STORE.fundFactsheetEntries,
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: SourceEntryStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Source entry console persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getSourceEntryStore() {
  const store = await readStore();

  return {
    indexEntries: sortNewestFirst(store.indexEntries).slice(0, 12),
    routeOverrides: sortNewestFirst(store.routeOverrides).slice(0, 12),
    stockCloseEntries: sortNewestFirst(store.stockCloseEntries).slice(0, 12),
    stockChartEntries: sortNewestFirst(store.stockChartEntries).slice(0, 12),
    fundNavEntries: sortNewestFirst(store.fundNavEntries).slice(0, 12),
    fundFactsheetEntries: sortNewestFirst(store.fundFactsheetEntries).slice(0, 12),
  };
}

export async function saveIndexSourceEntry(entry: Omit<IndexSourceEntry, "createdAt">) {
  const store = await readStore();
  const createdAt = new Date().toISOString();

  const nextStore: SourceEntryStore = {
    ...store,
    indexEntries: [
      {
        ...entry,
        createdAt,
      },
      ...store.indexEntries,
    ].slice(0, MAX_ENTRIES),
  };

  await writeStore(nextStore);
}

export async function saveRouteOverrideEntry(entry: Omit<RouteOverrideEntry, "createdAt">) {
  const store = await readStore();
  const createdAt = new Date().toISOString();

  const nextStore: SourceEntryStore = {
    ...store,
    routeOverrides: [
      {
        ...entry,
        createdAt,
      },
      ...store.routeOverrides,
    ].slice(0, MAX_ENTRIES),
  };

  await writeStore(nextStore);
}

export async function saveStockCloseEntry(entry: Omit<StockCloseEntry, "createdAt">) {
  const store = await readStore();
  const createdAt = new Date().toISOString();

  const nextStore: SourceEntryStore = {
    ...store,
    stockCloseEntries: [
      {
        ...entry,
        createdAt,
      },
      ...store.stockCloseEntries.filter((item) => item.slug !== entry.slug),
    ].slice(0, MAX_ENTRIES),
  };

  await writeStore(nextStore);
}

export async function saveStockChartEntry(entry: Omit<StockChartEntry, "createdAt">) {
  const store = await readStore();
  const createdAt = new Date().toISOString();

  const nextStore: SourceEntryStore = {
    ...store,
    stockChartEntries: [
      {
        ...entry,
        createdAt,
      },
      ...store.stockChartEntries.filter((item) => item.slug !== entry.slug),
    ].slice(0, MAX_ENTRIES),
  };

  await writeStore(nextStore);
}

export async function saveFundNavEntry(entry: Omit<FundNavEntry, "createdAt">) {
  const store = await readStore();
  const createdAt = new Date().toISOString();

  const nextStore: SourceEntryStore = {
    ...store,
    fundNavEntries: [
      {
        ...entry,
        createdAt,
      },
      ...store.fundNavEntries.filter((item) => item.slug !== entry.slug),
    ].slice(0, MAX_ENTRIES),
  };

  await writeStore(nextStore);
}

export async function saveFundFactsheetEntry(entry: Omit<FundFactsheetEntry, "createdAt">) {
  const store = await readStore();
  const createdAt = new Date().toISOString();

  const nextStore: SourceEntryStore = {
    ...store,
    fundFactsheetEntries: [
      {
        ...entry,
        createdAt,
      },
      ...store.fundFactsheetEntries.filter((item) => item.slug !== entry.slug),
    ].slice(0, MAX_ENTRIES),
  };

  await writeStore(nextStore);
}

export async function removeIndexSourceEntry(input: Pick<IndexSourceEntry, "createdAt" | "indexSlug" | "symbol">) {
  const store = await readStore();
  const nextEntries = store.indexEntries.filter(
    (item) =>
      !(
        item.createdAt === input.createdAt &&
        item.indexSlug === input.indexSlug &&
        item.symbol === input.symbol
      ),
  );

  if (nextEntries.length === store.indexEntries.length) {
    throw new Error("Unknown index entry.");
  }

  await writeStore({
    ...store,
    indexEntries: nextEntries,
  });
}

export async function removeRouteOverrideEntry(input: Pick<RouteOverrideEntry, "createdAt" | "route" | "field">) {
  const store = await readStore();
  const nextEntries = store.routeOverrides.filter(
    (item) =>
      !(
        item.createdAt === input.createdAt &&
        item.route === input.route &&
        item.field === input.field
      ),
  );

  if (nextEntries.length === store.routeOverrides.length) {
    throw new Error("Unknown route override entry.");
  }

  await writeStore({
    ...store,
    routeOverrides: nextEntries,
  });
}

export async function removeStockCloseEntry(input: Pick<StockCloseEntry, "slug">) {
  const store = await readStore();
  const nextEntries = store.stockCloseEntries.filter((item) => item.slug !== input.slug);

  if (nextEntries.length === store.stockCloseEntries.length) {
    throw new Error("Unknown stock close entry.");
  }

  await writeStore({
    ...store,
    stockCloseEntries: nextEntries,
  });
}

export async function removeStockChartEntry(input: Pick<StockChartEntry, "slug">) {
  const store = await readStore();
  const nextEntries = store.stockChartEntries.filter((item) => item.slug !== input.slug);

  if (nextEntries.length === store.stockChartEntries.length) {
    throw new Error("Unknown stock OHLCV entry.");
  }

  await writeStore({
    ...store,
    stockChartEntries: nextEntries,
  });
}

export async function removeFundNavEntry(input: Pick<FundNavEntry, "slug">) {
  const store = await readStore();
  const nextEntries = store.fundNavEntries.filter((item) => item.slug !== input.slug);

  if (nextEntries.length === store.fundNavEntries.length) {
    throw new Error("Unknown fund NAV entry.");
  }

  await writeStore({
    ...store,
    fundNavEntries: nextEntries,
  });
}

export async function removeFundFactsheetEntry(input: Pick<FundFactsheetEntry, "slug">) {
  const store = await readStore();
  const nextEntries = store.fundFactsheetEntries.filter((item) => item.slug !== input.slug);

  if (nextEntries.length === store.fundFactsheetEntries.length) {
    throw new Error("Unknown fund factsheet entry.");
  }

  await writeStore({
    ...store,
    fundFactsheetEntries: nextEntries,
  });
}
