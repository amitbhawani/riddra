import { access, readFile, readdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

const targets = [
  path.join(process.cwd(), ".next"),
  path.join(process.cwd(), ".next", "server"),
  path.join(process.cwd(), ".next", "types"),
  path.join(process.cwd(), ".next", "dev", "server"),
  path.join(process.cwd(), ".next", "dev", "types"),
];
const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
const devLockPath = path.join(process.cwd(), ".next", "dev", "lock");

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isProcessAlive(pid) {
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

function parseConflictName(name, isDirectory) {
  if (isDirectory) {
    const match = name.match(/^(.*) (\d+)$/);
    if (!match) return null;
    return {
      canonicalName: match[1],
      suffix: Number(match[2]),
    };
  }

  const match = name.match(/^(.*) (\d+)((\.[^.]+)+)$/);
  if (!match) return null;
  return {
    canonicalName: `${match[1]}${match[3]}`,
    suffix: Number(match[2]),
  };
}

async function removeEntry(targetPath, isDirectory, operations) {
  await rm(targetPath, { recursive: isDirectory, force: true });
  operations.push(`removed ${targetPath}`);
}

async function isEffectivelyEmptyDirectory(targetPath) {
  const entries = await readdir(targetPath);
  return entries.length === 0;
}

async function normalizeTarget(targetDirectory, operations) {
  if (!(await pathExists(targetDirectory))) {
    return;
  }

  const entries = await readdir(targetDirectory, { withFileTypes: true });
  const groups = new Map();

  for (const entry of entries) {
    const parsed = parseConflictName(entry.name, entry.isDirectory());
    if (!parsed) {
      continue;
    }

    const key = `${entry.isDirectory() ? "dir" : "file"}:${parsed.canonicalName}`;
    const existing = groups.get(key) ?? [];
    existing.push({
      name: entry.name,
      canonicalName: parsed.canonicalName,
      suffix: parsed.suffix,
      isDirectory: entry.isDirectory(),
    });
    groups.set(key, existing);
  }

  for (const group of groups.values()) {
    const sorted = [...group].sort((left, right) => right.suffix - left.suffix);
    const chosen = sorted[0];
    const canonicalPath = path.join(targetDirectory, chosen.canonicalName);
    const canonicalExists = await pathExists(canonicalPath);

    if (
      chosen.isDirectory &&
      canonicalExists &&
      (await isEffectivelyEmptyDirectory(canonicalPath))
    ) {
      await rm(canonicalPath, { recursive: true, force: true });
      operations.push(`removed empty canonical dir ${canonicalPath}`);
      await rename(path.join(targetDirectory, chosen.name), canonicalPath);
      operations.push(`renamed ${path.join(targetDirectory, chosen.name)} -> ${canonicalPath}`);
      for (const duplicate of sorted.slice(1)) {
        await removeEntry(
          path.join(targetDirectory, duplicate.name),
          duplicate.isDirectory,
          operations,
        );
      }
      continue;
    }

    if (!canonicalExists) {
      await rename(path.join(targetDirectory, chosen.name), canonicalPath);
      operations.push(`renamed ${path.join(targetDirectory, chosen.name)} -> ${canonicalPath}`);
    }

    for (const duplicate of canonicalExists ? sorted : sorted.slice(1)) {
      await removeEntry(
        path.join(targetDirectory, duplicate.name),
        duplicate.isDirectory,
        operations,
      );
    }
  }
}

async function normalizeTsconfigInclude(operations) {
  if (!(await pathExists(tsconfigPath))) {
    return;
  }

  const raw = await readFile(tsconfigPath, "utf8");
  const parsed = JSON.parse(raw);
  const include = Array.isArray(parsed.include) ? parsed.include : [];
  const nextInclude = include.filter(
    (entry) => entry !== ".next/types/**/*.ts" && entry !== ".next/dev/types/**/*.ts",
  );

  if (nextInclude.length === include.length) {
    return;
  }

  parsed.include = nextInclude;
  await writeFile(tsconfigPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  operations.push("removed unstable .next types includes from tsconfig.json");
}

async function normalizeStaleDevLock(operations) {
  if (!(await pathExists(devLockPath))) {
    return;
  }

  try {
    const raw = await readFile(devLockPath, "utf8");
    const parsed = JSON.parse(raw);

    if (isProcessAlive(parsed.pid)) {
      return;
    }

    await rm(devLockPath, { force: true });
    operations.push(`removed stale Next dev lock ${devLockPath}`);
  } catch {
    await rm(devLockPath, { force: true });
    operations.push(`removed unreadable Next dev lock ${devLockPath}`);
  }
}

export async function normalizeNextArtifacts() {
  const operations = [];

  await normalizeStaleDevLock(operations);

  for (const target of targets) {
    await normalizeTarget(target, operations);
  }

  await normalizeTsconfigInclude(operations);

  return operations;
}

async function main() {
  const operations = await normalizeNextArtifacts();

  if (operations.length === 0) {
    console.log("Next artifact normalization found no conflict-suffixed root artifacts or tsconfig cleanup needs.");
    return;
  }

  console.log(`Normalized ${operations.length} Next artifact conflicts.`);
  for (const operation of operations) {
    console.log(`- ${operation}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Unable to normalize Next build artifacts.");
    console.error(error);
    process.exitCode = 1;
  });
}
