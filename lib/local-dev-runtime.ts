import { readFile } from "fs/promises";
import path from "path";

export type LocalDevRuntimeRouteStatus = {
  route: string;
  url: string;
  status: string;
};

export type LocalDevRuntimeSnapshot = {
  version: number;
  status: string;
  pid: number | null;
  childPid: number | null;
  cwd: string;
  url: string | null;
  startedAt: string | null;
  lastReadyAt: string | null;
  lastHealthcheckAt: string | null;
  stoppedAt: string | null;
  note: string;
  routes: LocalDevRuntimeRouteStatus[];
};

const STORE_PATH = path.join(process.cwd(), "data", "local-dev-runtime.json");

const defaultSnapshot: LocalDevRuntimeSnapshot = {
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
  note: "No local operator runtime has been recorded yet.",
  routes: [],
};

export async function getLocalDevRuntimeSnapshot(): Promise<LocalDevRuntimeSnapshot> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    return {
      ...defaultSnapshot,
      ...(JSON.parse(content) as Partial<LocalDevRuntimeSnapshot>),
    };
  } catch {
    return defaultSnapshot;
  }
}
