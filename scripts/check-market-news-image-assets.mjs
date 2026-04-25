import { readFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const files = [
  "public/news-fallbacks/riddra-market-news.svg",
  "public/news-fallbacks/riddra-stock-news.svg",
  "public/news-fallbacks/riddra-mutual-fund-news.svg",
  "public/news-fallbacks/riddra-regulatory-news.svg",
  "public/news-fallbacks/riddra-ipo-news.svg",
];

let failed = false;

for (const relativePath of files) {
  const absolutePath = path.join(projectRoot, relativePath);

  try {
    await access(absolutePath, fsConstants.R_OK);
    const content = await readFile(absolutePath, "utf8");

    if (!content.includes("<svg") || !content.includes("Riddra")) {
      failed = true;
      console.error(`INVALID ${relativePath}`);
      continue;
    }

    console.log(`OK ${relativePath}`);
  } catch {
    failed = true;
    console.error(`MISSING ${relativePath}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
