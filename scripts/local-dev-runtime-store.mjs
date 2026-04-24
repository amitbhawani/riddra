import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "data", "local-dev-runtime.json");

export function formatIstTimestamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("month")} ${getPart("day")}, ${getPart("year")} ${getPart("hour")}:${getPart("minute")} ${getPart("dayPeriod").toUpperCase()} IST`;
}

export function isProcessAlive(pid) {
  if (!pid || typeof pid !== "number") {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getDefaultStore() {
  return {
    version: 1,
    status: "idle",
    pid: null,
    childPid: null,
    cwd: process.cwd(),
    url: null,
    startedAt: null,
    lastReadyAt: null,
    lastHealthcheckAt: null,
    stoppedAt: null,
    note: "No guarded local dev runtime recorded yet.",
    routes: [],
  };
}

export async function readLocalDevRuntimeStore() {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    return {
      ...getDefaultStore(),
      ...JSON.parse(content),
    };
  } catch {
    return getDefaultStore();
  }
}

export async function writeLocalDevRuntimeStore(store) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return store;
}

export async function updateLocalDevRuntimeStore(mutator) {
  const store = await readLocalDevRuntimeStore();
  const nextStore = mutator(store);
  return writeLocalDevRuntimeStore(nextStore);
}
