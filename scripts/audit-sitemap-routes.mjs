import { readLocalDevRuntimeStore } from "./local-dev-runtime-store.mjs";

const RESPONSE_BUDGET_MS = 1_000;
const DOCUMENT_BUDGET_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 6;
const SUPPLEMENTAL_ROUTE_PATHS = ["/indices"];
const SITEMAP_PATH = "/sitemap.xml";
const CANDIDATE_BASE_URLS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
];
const ERROR_PATTERNS = [
  /Application error:/i,
  /Unhandled Runtime Error/i,
  /Minified React error/i,
  /data-next-error/i,
  /Internal Server Error/i,
];

function parseCliArgs(argv) {
  const parsed = {
    baseUrl: "",
    limit: Number.POSITIVE_INFINITY,
    concurrency: DEFAULT_CONCURRENCY,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    verbose: false,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      if (!parsed.baseUrl) {
        parsed.baseUrl = arg;
      }
      continue;
    }

    const [rawKey, rawValue = ""] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = rawValue.trim();

    if (key === "base" && value) {
      parsed.baseUrl = value;
      continue;
    }

    if (key === "limit") {
      const limit = Number(value);
      if (Number.isFinite(limit) && limit > 0) {
        parsed.limit = Math.trunc(limit);
      }
      continue;
    }

    if (key === "concurrency") {
      const concurrency = Number(value);
      if (Number.isFinite(concurrency) && concurrency > 0) {
        parsed.concurrency = Math.min(Math.trunc(concurrency), 24);
      }
      continue;
    }

    if (key === "timeout") {
      const timeoutMs = Number(value);
      if (Number.isFinite(timeoutMs) && timeoutMs >= 1_000) {
        parsed.timeoutMs = Math.trunc(timeoutMs);
      }
      continue;
    }

    if (key === "verbose") {
      parsed.verbose = value ? value !== "false" : true;
    }
  }

  return parsed;
}

async function fetchText(url, timeoutMs) {
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const responseMs = performance.now() - startedAt;
  const body = await response.text();
  const totalMs = performance.now() - startedAt;

  return {
    response,
    body,
    responseMs,
    totalMs,
  };
}

async function findHealthyBaseUrl(requestedBaseUrl, timeoutMs) {
  const runtime = await readLocalDevRuntimeStore();
  const runtimeUrl = typeof runtime.url === "string" ? runtime.url.trim() : "";
  const candidates = [
    requestedBaseUrl,
    runtimeUrl,
    ...CANDIDATE_BASE_URLS,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const url = new URL(SITEMAP_PATH, candidate).toString();
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        return candidate;
      }
    } catch {}
  }

  throw new Error(
    `Unable to find a healthy local base URL. Checked: ${candidates.join(", ") || "none"}.`,
  );
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseSitemapPaths(xml, baseUrl) {
  const urls = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g))
    .map((match) => decodeXmlEntities(match[1] ?? "").trim())
    .filter(Boolean);
  const routeSet = new Set(SUPPLEMENTAL_ROUTE_PATHS);

  for (const rawUrl of urls) {
    try {
      const parsedUrl = new URL(rawUrl);
      routeSet.add(`${parsedUrl.pathname}${parsedUrl.search}`);
    } catch {}
  }

  return Array.from(routeSet.values()).sort();
}

function inspectHtml(body) {
  const matchedPatterns = ERROR_PATTERNS.filter((pattern) => pattern.test(body)).map(
    (pattern) => pattern.source,
  );

  return {
    hasRenderError: matchedPatterns.length > 0,
    matchedPatterns,
  };
}

async function auditRoute(baseUrl, routePath, timeoutMs) {
  const url = new URL(routePath, baseUrl).toString();
  const startedAt = new Date().toISOString();

  try {
    const { response, body, responseMs, totalMs } = await fetchText(url, timeoutMs);
    const htmlInspection = inspectHtml(body);
    const statusOk = response.status >= 200 && response.status < 300;

    return {
      routePath,
      url,
      startedAt,
      status: response.status,
      responseMs,
      totalMs,
      statusOk,
      hasRenderError: htmlInspection.hasRenderError,
      matchedPatterns: htmlInspection.matchedPatterns,
      responseBudgetOk: responseMs <= RESPONSE_BUDGET_MS,
      documentBudgetOk: totalMs <= DOCUMENT_BUDGET_MS,
    };
  } catch (error) {
    return {
      routePath,
      url,
      startedAt,
      status: "ERR",
      responseMs: Number.POSITIVE_INFINITY,
      totalMs: Number.POSITIVE_INFINITY,
      statusOk: false,
      hasRenderError: true,
      matchedPatterns: [
        error instanceof Error ? error.message : String(error),
      ],
      responseBudgetOk: false,
      documentBudgetOk: false,
    };
  }
}

async function runWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

function printSummary(baseUrl, results, options) {
  const failingRoutes = results.filter(
    (result) =>
      !result.statusOk ||
      result.hasRenderError ||
      !result.responseBudgetOk ||
      !result.documentBudgetOk,
  );
  const responseBudgetMisses = results.filter((result) => !result.responseBudgetOk).length;
  const documentBudgetMisses = results.filter((result) => !result.documentBudgetOk).length;
  const renderErrors = results.filter((result) => result.hasRenderError).length;

  console.log(`Base URL: ${baseUrl}`);
  console.log(
    `Audited ${results.length} public routes. ${failingRoutes.length} need attention, ${responseBudgetMisses} missed the <1s response budget, ${documentBudgetMisses} missed the <2s document budget, ${renderErrors} showed render errors.`,
  );
  console.log("");

  const rowsToPrint = options.verbose
    ? results
    : failingRoutes.length > 0
      ? failingRoutes
      : results.slice(0, Math.min(results.length, 12));

  for (const result of rowsToPrint) {
    const statusLabel =
      result.statusOk &&
      !result.hasRenderError &&
      result.responseBudgetOk &&
      result.documentBudgetOk
        ? "PASS"
        : "FAIL";
    const markers = [
      `${String(result.status).padEnd(3)} ${result.routePath}`,
      `response=${Number.isFinite(result.responseMs) ? `${result.responseMs.toFixed(0)}ms` : "ERR"}`,
      `document=${Number.isFinite(result.totalMs) ? `${result.totalMs.toFixed(0)}ms` : "ERR"}`,
    ];

    if (result.matchedPatterns.length > 0) {
      markers.push(`flags=${result.matchedPatterns.join(",")}`);
    }

    console.log(`${statusLabel}  ${markers.join("  ")}`);
  }

  if (!options.verbose && failingRoutes.length === 0 && results.length > rowsToPrint.length) {
    console.log(`... ${results.length - rowsToPrint.length} additional passing routes omitted. Use --verbose to print all.`);
  }

  return failingRoutes.length === 0;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const baseUrl = options.baseUrl || (await findHealthyBaseUrl("", options.timeoutMs));
  const sitemapUrl = new URL(SITEMAP_PATH, baseUrl).toString();
  const { body: sitemapXml } = await fetchText(sitemapUrl, options.timeoutMs);
  const allRoutePaths = parseSitemapPaths(sitemapXml, baseUrl);
  const routePaths = allRoutePaths.slice(0, options.limit);

  if (routePaths.length === 0) {
    throw new Error(`No sitemap routes discovered from ${sitemapUrl}.`);
  }

  const results = await runWithConcurrency(
    routePaths,
    options.concurrency,
    async (routePath) => auditRoute(baseUrl, routePath, options.timeoutMs),
  );
  const passed = printSummary(baseUrl, results, options);

  if (!passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[sitemap-audit] unable to complete route audit");
  console.error(error);
  process.exitCode = 1;
});
