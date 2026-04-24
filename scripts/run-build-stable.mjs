import { rm } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

import { isProcessAlive, readLocalDevRuntimeStore } from "./local-dev-runtime-store.mjs";
import { normalizeNextArtifacts } from "./normalize-next-artifacts.mjs";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ${args.join(" ")} exited because of ${signal}`));
        return;
      }

      resolve(code ?? 0);
    });
  });
}

async function removeStaleBuildArtifacts() {
  const runtime = await readLocalDevRuntimeStore();
  const trackedPid = runtime.childPid ?? runtime.pid;
  const guardedDevActive =
    runtime.status === "running" &&
    runtime.cwd === process.cwd() &&
    isProcessAlive(trackedPid);

  if (guardedDevActive) {
    console.log("[build-guard] local dev runtime is active; skipping destructive `.next/server` cleanup.");
    return;
  }

  const rootTarget = path.join(process.cwd(), ".next");

  await rm(rootTarget, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  console.log("[build-guard] removed stale `.next` before build.");
}

async function main() {
  const operations = await normalizeNextArtifacts();
  if (operations.length > 0) {
    console.log(`[build-guard] normalized ${operations.length} stale Next artifacts before build.`);
  }

  await removeStaleBuildArtifacts();

  const buildCode = await runCommand("next", ["build", "--webpack"]);
  if (buildCode !== 0) {
    process.exitCode = buildCode;
    return;
  }

  const normalizeCode = await runCommand("node", ["scripts/normalize-next-artifacts.mjs"]);
  if (normalizeCode !== 0) {
    process.exitCode = normalizeCode;
  }
}

main().catch((error) => {
  console.error("[build-guard] unable to complete stable build");
  console.error(error);
  process.exitCode = 1;
});
