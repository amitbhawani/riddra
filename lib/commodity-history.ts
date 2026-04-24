import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type CommodityHistoryStore = {
  gold: GoldHistoryEntry[];
  silver: SilverHistoryEntry[];
};

type SupportedTool = "gold" | "silver";

export type GoldHistoryEntry = {
  date: string;
  gold24: number;
  gold22: number;
  gold18: number;
  xauusd: number;
  usdinr: number;
  source: string;
};

export type SilverHistoryEntry = {
  date: string;
  silver999: number;
  silver925: number;
  silver900: number;
  xagusd: number;
  usdinr: number;
  source: string;
};

const HISTORY_DAYS = 90;

function getHistoryPath() {
  return path.join(process.cwd(), "data", "commodity-history.json");
}

function getTodayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

async function readStore(): Promise<CommodityHistoryStore> {
  try {
    const content = await readFile(getHistoryPath(), "utf8");
    const parsed = JSON.parse(content) as Partial<CommodityHistoryStore>;
    return {
      gold: Array.isArray(parsed.gold) ? parsed.gold : [],
      silver: Array.isArray(parsed.silver) ? parsed.silver : [],
    };
  } catch {
    return { gold: [], silver: [] };
  }
}

async function writeStore(store: CommodityHistoryStore) {
  const target = getHistoryPath();
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(store, null, 2), "utf8");
}

function upsertEntry<T extends { date: string }>(entries: T[], entry: T, maxSize = HISTORY_DAYS) {
  const next = entries.filter((item) => item.date !== entry.date);
  next.push(entry);
  next.sort((left, right) => left.date.localeCompare(right.date));
  return next.slice(-maxSize);
}

export async function getCommodityHistory(tool: "gold", limit?: number): Promise<GoldHistoryEntry[]>;
export async function getCommodityHistory(tool: "silver", limit?: number): Promise<SilverHistoryEntry[]>;
export async function getCommodityHistory(tool: SupportedTool, limit = HISTORY_DAYS) {
  const store = await readStore();
  return store[tool].slice(-Math.max(1, limit));
}

export async function saveCommodityHistoryEntry(tool: SupportedTool, entry: GoldHistoryEntry | SilverHistoryEntry) {
  const store = await readStore();
  const nextStore: CommodityHistoryStore =
    tool === "gold"
      ? {
          ...store,
          gold: upsertEntry(store.gold, entry as GoldHistoryEntry),
        }
      : {
          ...store,
          silver: upsertEntry(store.silver, entry as SilverHistoryEntry),
        };

  await writeStore(nextStore);
}

export async function removeCommodityHistoryEntry(tool: SupportedTool, date: string) {
  const store = await readStore();
  const targetDate = date.trim();

  if (!targetDate) {
    throw new Error("Commodity history date is required.");
  }

  const nextEntries = store[tool].filter((item) => item.date !== targetDate);

  if (nextEntries.length === store[tool].length) {
    throw new Error(`Unknown ${tool} history entry for ${targetDate}.`);
  }

  const nextStore: CommodityHistoryStore =
    tool === "gold"
      ? {
          ...store,
          gold: nextEntries as GoldHistoryEntry[],
        }
      : {
          ...store,
          silver: nextEntries as SilverHistoryEntry[],
        };

  await writeStore(nextStore);
}

export function normalizeCommodityHistoryPayload(
  tool: SupportedTool,
  payload: Record<string, unknown>,
): GoldHistoryEntry | SilverHistoryEntry | null {
  const date = typeof payload.date === "string" && payload.date ? payload.date : getTodayIso();
  const source = typeof payload.source === "string" && payload.source ? payload.source : "Configured metals feed";

  if (tool === "gold") {
    const gold24 = Number(payload.gold24);
    const gold22 = Number(payload.gold22);
    const gold18 = Number(payload.gold18);
    const xauusd = Number(payload.xauusd);
    const usdinr = Number(payload.usdinr);

    if (![gold24, gold22, gold18, xauusd, usdinr].every(Number.isFinite)) {
      return null;
    }

    return { date, gold24, gold22, gold18, xauusd, usdinr, source };
  }

  const silver999 = Number(payload.silver999);
  const silver925 = Number(payload.silver925);
  const silver900 = Number(payload.silver900);
  const xagusd = Number(payload.xagusd);
  const usdinr = Number(payload.usdinr);

  if (![silver999, silver925, silver900, xagusd, usdinr].every(Number.isFinite)) {
    return null;
  }

  return { date, silver999, silver925, silver900, xagusd, usdinr, source };
}
