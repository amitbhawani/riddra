import { spawn } from "child_process";
import { access, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  formatIstTimestamp,
  isProcessAlive,
  readLocalDevRuntimeStore,
  updateLocalDevRuntimeStore,
} from "./local-dev-runtime-store.mjs";
import { normalizeNextArtifacts } from "./normalize-next-artifacts.mjs";

const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
const unstableIncludes = [".next/types/**/*.ts", ".next/dev/types/**/*.ts"];

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function stripDevTypesInclude() {
  if (!(await pathExists(tsconfigPath))) {
    return false;
  }

  const raw = await readFile(tsconfigPath, "utf8");
  const parsed = JSON.parse(raw);
  const include = Array.isArray(parsed.include) ? parsed.include : [];
  const nextInclude = include.filter((entry) => !unstableIncludes.includes(entry));

  if (nextInclude.length === include.length) {
    return false;
  }

  parsed.include = nextInclude;
  await writeFile(tsconfigPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return true;
}

async function normalizeTsconfig(reason) {
  try {
    const changed = await stripDevTypesInclude();
    if (changed) {
      console.log(`[dev-guard] removed unstable .next types includes from tsconfig.json (${reason})`);
    }
  } catch (error) {
    console.error(`[dev-guard] unable to normalize tsconfig.json during ${reason}`);
    console.error(error);
  }
}

async function main() {
  const existingRuntime = await readLocalDevRuntimeStore();
  if (
    existingRuntime.status === "running" &&
    existingRuntime.pid &&
    isProcessAlive(existingRuntime.pid) &&
    existingRuntime.cwd === process.cwd()
  ) {
    const activeUrl = existingRuntime.url ?? "http://localhost:3000";
    console.log(`[dev-guard] guarded dev server already running at ${activeUrl} (pid ${existingRuntime.pid}).`);
    console.log("[dev-guard] reuse the existing server instead of starting a duplicate instance.");
    return;
  }

  const operations = await normalizeNextArtifacts();
  if (operations.length > 0) {
    console.log(`[dev-guard] normalized ${operations.length} stale Next artifacts before dev startup`);
  }
  await normalizeTsconfig("preflight");

  const preferredBundler =
    process.env.RIDDRA_DEV_BUNDLER?.trim().toLowerCase() === "turbopack"
      ? "turbopack"
      : "webpack";
  const nextDevArgs = preferredBundler === "turbopack" ? ["dev"] : ["dev", "--webpack"];

  console.log(`[dev-guard] starting Next dev with ${preferredBundler}.`);

  const child = spawn("next", nextDevArgs, {
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  await updateLocalDevRuntimeStore((store) => ({
    ...store,
    status: "starting",
    pid: process.pid,
    childPid: child.pid ?? null,
    cwd: process.cwd(),
    url: null,
    startedAt: formatIstTimestamp(),
    lastReadyAt: null,
    stoppedAt: null,
    note: "Guarded local dev startup is in progress.",
  }));

  const relayStream = (stream, writer) => {
    if (!stream) {
      return;
    }

    stream.setEncoding("utf8");
    let buffer = "";

    const handleLine = (line) => {
      const localMatch = line.match(/- Local:\s+(http:\/\/[^\s]+)/);
      if (localMatch) {
        void updateLocalDevRuntimeStore((store) => ({
          ...store,
          pid: process.pid,
          childPid: child.pid ?? null,
          status: store.status === "running" ? "running" : "starting",
          url: localMatch[1],
          note: `Guarded local dev server is bound to ${localMatch[1]}.`,
        }));
      }

      if (line.includes("Ready in")) {
        void updateLocalDevRuntimeStore((store) => ({
          ...store,
          pid: process.pid,
          childPid: child.pid ?? null,
          status: "running",
          lastReadyAt: formatIstTimestamp(),
          note: `Guarded local dev server is ready on ${store.url ?? "the detected localhost URL"}.`,
        }));
      }
    };

    stream.on("data", (chunk) => {
      writer.write(chunk);
      buffer += chunk;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        handleLine(line);
      }
    });

    stream.on("end", () => {
      if (buffer.length > 0) {
        handleLine(buffer);
      }
    });
  };

  relayStream(child.stdout, process.stdout);
  relayStream(child.stderr, process.stderr);

  let shuttingDown = false;

  const stop = async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await normalizeTsconfig(`shutdown:${signal}`);
    await updateLocalDevRuntimeStore((store) => ({
      ...store,
      status: "stopping",
      note: `Guarded local dev server is stopping because of ${signal}.`,
    }));
    child.kill(signal);
  };

  process.on("SIGINT", () => {
    void stop("SIGINT");
  });
  process.on("SIGTERM", () => {
    void stop("SIGTERM");
  });

  child.on("exit", async (code, signal) => {
    await normalizeTsconfig("post-exit");
    await updateLocalDevRuntimeStore((store) => ({
      ...store,
      status: signal ? "stopped" : code === 0 ? "stopped" : "failed",
      pid: null,
      childPid: null,
      stoppedAt: formatIstTimestamp(),
      note: signal
        ? `Guarded local dev server stopped because of ${signal}.`
        : code === 0
          ? "Guarded local dev server exited normally."
          : `Guarded local dev server exited with code ${code ?? 1}.`,
    }));

    if (signal) {
      process.exit(signal === "SIGINT" ? 130 : 143);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("[dev-guard] unable to start stable dev server");
  console.error(error);
  process.exitCode = 1;
});
