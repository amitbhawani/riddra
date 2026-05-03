import { readFile } from "fs/promises";
import path from "path";

const workspaceRoot = process.cwd();

const requiredStaticRoutes = [
  "/",
  "/markets",
  "/markets/news",
  "/indices",
  "/nifty50",
  "/sensex",
  "/banknifty",
  "/finnifty",
  "/stocks",
];

const requiredDynamicSsgRoutes = [
  "/stocks/[slug]",
  "/stocks/[slug]/chart",
];

const auditedPageFiles = [
  { file: "app/page.tsx" },
  { file: "app/markets/page.tsx" },
  { file: "app/markets/news/page.tsx" },
  { file: "app/indices/page.tsx" },
  { file: "app/nifty50/page.tsx" },
  { file: "app/sensex/page.tsx" },
  { file: "app/banknifty/page.tsx" },
  { file: "app/finnifty/page.tsx" },
  { file: "app/stocks/page.tsx" },
  { file: "app/stocks/[slug]/page.tsx" },
];

const bannedSourcePatterns = [
  {
    label: "next/headers import",
    regex: /from\s+["']next\/headers["']/,
  },
  {
    label: "request headers() call",
    regex: /\bheaders\s*\(/,
  },
  {
    label: "request cookies() call",
    regex: /\bcookies\s*\(/,
  },
  {
    label: "draftMode() call",
    regex: /\bdraftMode\s*\(/,
  },
  {
    label: "server noStore() call",
    regex: /\b(?:unstable_)?noStore\s*\(/,
  },
  {
    label: "force-dynamic render mode",
    regex: /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/,
  },
  {
    label: "zero revalidate render mode",
    regex: /export\s+const\s+revalidate\s*=\s*0\b/,
  },
  {
    label: "server searchParams dependency",
    regex: /\bsearchParams\b/,
  },
];

async function readJson(filePath) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

function formatSourceLocation(filePath, source, index) {
  const line = source.slice(0, index).split("\n").length;
  return `${filePath}:${line}`;
}

async function checkPrerenderManifest() {
  const manifestPath = path.join(workspaceRoot, ".next", "prerender-manifest.json");
  const manifest = await readJson(manifestPath);
  const issues = [];

  for (const route of requiredStaticRoutes) {
    if (!manifest.routes?.[route]) {
      issues.push(`Missing required static prerender route: ${route}`);
    }
  }

  for (const route of requiredDynamicSsgRoutes) {
    if (!manifest.dynamicRoutes?.[route]) {
      issues.push(`Missing required prerendered dynamic route pattern: ${route}`);
    }
  }

  return issues;
}

async function checkCriticalPageSources() {
  const issues = [];

  for (const auditedFile of auditedPageFiles) {
    const relativeFile = auditedFile.file;
    const absoluteFile = path.join(workspaceRoot, relativeFile);
    const source = await readFile(absoluteFile, "utf8");

    for (const pattern of bannedSourcePatterns) {
      if (auditedFile.allowedPatterns?.includes(pattern.label)) {
        continue;
      }

      const match = pattern.regex.exec(source);

      if (match) {
        issues.push(
          `Critical public page uses ${pattern.label}: ${formatSourceLocation(relativeFile, source, match.index)}`,
        );
      }
    }
  }

  return issues;
}

async function main() {
  const [manifestIssues, sourceIssues] = await Promise.all([
    checkPrerenderManifest(),
    checkCriticalPageSources(),
  ]);
  const issues = [...manifestIssues, ...sourceIssues];

  if (issues.length > 0) {
    console.error("Public route discipline check failed.");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    `Public route discipline passed for ${requiredStaticRoutes.length} static routes, ${requiredDynamicSsgRoutes.length} dynamic SSG routes, and ${auditedPageFiles.length} critical source files.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
