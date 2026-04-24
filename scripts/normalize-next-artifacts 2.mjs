import { access, mkdir, readdir, rename, rm } from "fs/promises";
import path from "path";

const root = path.join(process.cwd(), ".next");
const numberedDirectoryPattern = / \d+$/;
const numberedFilePattern = / \d+(?=(\.[^.]+)+$)/;

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function mergeDirectory(source, target, operations) {
  await mkdir(target, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      if (await pathExists(targetPath)) {
        await mergeDirectory(sourcePath, targetPath, operations);
      } else {
        await rename(sourcePath, targetPath);
        operations.push(`moved dir ${sourcePath} -> ${targetPath}`);
      }
      continue;
    }

    if (await pathExists(targetPath)) {
      await rm(sourcePath, { force: true });
      operations.push(`removed duplicate file ${sourcePath}`);
      continue;
    }

    await rename(sourcePath, targetPath);
    operations.push(`moved file ${sourcePath} -> ${targetPath}`);
  }

  await rm(source, { recursive: true, force: true });
  operations.push(`removed merged dir ${source}`);
}

async function normalizeDirectory(directoryPath, operations) {
  const initialEntries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of initialEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    await normalizeDirectory(path.join(directoryPath, entry.name), operations);
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const normalizedName = entry.name.replace(numberedFilePattern, "");
    if (normalizedName === entry.name) {
      continue;
    }

    const sourcePath = path.join(directoryPath, entry.name);
    const targetPath = path.join(directoryPath, normalizedName);

    if (await pathExists(targetPath)) {
      await rm(sourcePath, { force: true });
      operations.push(`removed duplicate file ${sourcePath}`);
      continue;
    }

    await rename(sourcePath, targetPath);
    operations.push(`renamed file ${sourcePath} -> ${targetPath}`);
  }

  const refreshedEntries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of refreshedEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const normalizedName = entry.name.replace(numberedDirectoryPattern, "");
    if (normalizedName === entry.name) {
      continue;
    }

    const sourcePath = path.join(directoryPath, entry.name);
    const targetPath = path.join(directoryPath, normalizedName);

    if (await pathExists(targetPath)) {
      await mergeDirectory(sourcePath, targetPath, operations);
      continue;
    }

    await rename(sourcePath, targetPath);
    operations.push(`renamed dir ${sourcePath} -> ${targetPath}`);
  }
}

async function main() {
  if (!(await pathExists(root))) {
    console.log("No .next directory found, nothing to normalize.");
    return;
  }

  const operations = [];
  await normalizeDirectory(root, operations);

  if (operations.length === 0) {
    console.log("Next artifact normalization found no conflict-suffixed files.");
    return;
  }

  console.log(`Normalized ${operations.length} Next artifact conflicts.`);
  for (const operation of operations.slice(0, 25)) {
    console.log(`- ${operation}`);
  }

  if (operations.length > 25) {
    console.log(`- ...and ${operations.length - 25} more`);
  }
}

main().catch((error) => {
  console.error("Unable to normalize Next build artifacts.");
  console.error(error);
  process.exitCode = 1;
});
