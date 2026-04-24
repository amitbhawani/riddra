import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

function readDotEnvValue(name) {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${name}=`));

    if (!line) {
      return undefined;
    }

    const [, ...rest] = line.split("=");
    const value = rest.join("=").trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseHttpAddress(host) {
  try {
    const parsed = new URL(host);
    return parsed.host;
  } catch {
    return host.replace(/^https?:\/\//, "");
  }
}

const meilisearchBin = "/opt/homebrew/opt/meilisearch/bin/meilisearch";
const configuredHost =
  process.env.MEILISEARCH_HOST ??
  readDotEnvValue("MEILISEARCH_HOST") ??
  "http://127.0.0.1:7700";
const configuredApiKey =
  process.env.MEILISEARCH_API_KEY ??
  readDotEnvValue("MEILISEARCH_API_KEY") ??
  "local-meilisearch-master-key";
const dbPath = join(process.cwd(), ".meilisearch", "data-v1_42.ms");

mkdirSync(dirname(dbPath), { recursive: true });

const child = spawn(
  meilisearchBin,
  [
    "--http-addr",
    parseHttpAddress(configuredHost),
    "--master-key",
    configuredApiKey,
    "--db-path",
    dbPath,
    "--env",
    "development",
    "--no-analytics",
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
