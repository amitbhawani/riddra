import fs from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function resolveAliasCandidate(specifier) {
  if (!specifier.startsWith("@/")) {
    return null;
  }

  const relativePath = specifier.slice(2);
  const basePath = path.join(process.cwd(), relativePath);
  const directCandidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs"),
  ];

  return directCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolveNextPackageCandidate(specifier) {
  if (!specifier.startsWith("next/") || path.extname(specifier)) {
    return null;
  }

  try {
    return require.resolve(`${specifier}.js`);
  } catch {
    return null;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliasCandidate = resolveAliasCandidate(specifier);

    if (aliasCandidate) {
      return {
        shortCircuit: true,
        url: pathToFileURL(aliasCandidate).href,
      };
    }

    const nextPackageCandidate = resolveNextPackageCandidate(specifier);

    if (nextPackageCandidate) {
      return {
        shortCircuit: true,
        url: pathToFileURL(nextPackageCandidate).href,
      };
    }

    return nextResolve(specifier, context);
  },
});

function cleanString(value) {
  return String(value ?? "").trim();
}

function applyDailySameDayOnlyDefaults() {
  if (!cleanString(process.env.YAHOO_FINANCE_REQUESTS_PER_SECOND)) {
    process.env.YAHOO_FINANCE_REQUESTS_PER_SECOND = String(1 / 3);
  }
  if (!cleanString(process.env.YAHOO_FINANCE_MAX_CONCURRENT_WORKERS)) {
    process.env.YAHOO_FINANCE_MAX_CONCURRENT_WORKERS = "1";
  }
}

async function resolveDefaultDailySameDayOnlyTargetDate() {
  const { resolveIndianTradingDatePolicy } = await import("@/lib/stock-freshness-policy");
  return resolveIndianTradingDatePolicy().expectedTradingDate;
}

function parseArgs(argv) {
  const config = {
    stocks: [],
    jobId: "",
    mode: "daily_same_day_only",
    targetDate: "",
    force: false,
    dryRun: false,
    maxItemsPerRun: 0,
    actorEmail:
      cleanString(
        process.env.YAHOO_IMPORT_ACTOR_EMAIL ??
          process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
          "Yahoo Daily Update Script",
      ) || "Yahoo Daily Update Script",
  };

  for (const token of argv) {
    if (token.startsWith("--stocks=")) {
      config.stocks = cleanString(token.slice("--stocks=".length))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((symbol) => ({ yahooSymbol: symbol.toUpperCase() }));
      continue;
    }
    if (token.startsWith("--job-id=")) {
      config.jobId = cleanString(token.slice("--job-id=".length));
      continue;
    }
    if (token.startsWith("--mode=")) {
      const mode = cleanString(token.slice("--mode=".length)).toLowerCase();
      config.mode = mode === "daily_same_day_only" ? "daily_same_day_only" : "daily_chart_update";
      continue;
    }
    if (token.startsWith("--target-date=")) {
      config.targetDate = cleanString(token.slice("--target-date=".length));
      continue;
    }
    if (token === "--force" || token === "--force=true") {
      config.force = true;
      continue;
    }
    if (token === "--dry-run" || token === "--dry-run=true") {
      config.dryRun = true;
      continue;
    }
    if (token.startsWith("--force=")) {
      config.force = cleanString(token.slice("--force=".length)).toLowerCase() === "true";
      continue;
    }
    if (token.startsWith("--dry-run=")) {
      config.dryRun = cleanString(token.slice("--dry-run=".length)).toLowerCase() === "true";
      continue;
    }
    if (token.startsWith("--max-items=")) {
      config.maxItemsPerRun = Math.max(1, Number(token.slice("--max-items=".length)) || 50);
    }
  }

  return config;
}

async function main() {
  const {
    createYahooDailyChartUpdateJob,
    runYahooStockBatchImportUntilComplete,
    runYahooDailySameDayOnlyUntilComplete,
  } = await import("../lib/yahoo-finance-batch-import.ts");
  const config = parseArgs(process.argv.slice(2));

  if (config.mode === "daily_same_day_only") {
    applyDailySameDayOnlyDefaults();
    const targetDate = cleanString(config.targetDate, 40) || (await resolveDefaultDailySameDayOnlyTargetDate());
    const result = await runYahooDailySameDayOnlyUntilComplete({
      stocks: config.stocks,
      actorEmail: config.actorEmail,
      force: config.force,
      dryRun: config.dryRun,
      targetDate,
      maxItems: config.maxItemsPerRun > 0 ? config.maxItemsPerRun : undefined,
    });

    console.log(
      JSON.stringify(
        {
          mode: config.mode,
          result,
        },
        null,
        2,
      ),
    );
    return;
  }

  const created = config.jobId
    ? {
        jobId: config.jobId,
        resumedExistingJob: true,
      }
    : await createYahooDailyChartUpdateJob({
        stocks: config.stocks,
        actorEmail: config.actorEmail,
        force: config.force,
        dryRun: config.dryRun,
      });

  const result = await runYahooStockBatchImportUntilComplete({
    jobId: created.jobId,
    actorEmail: config.actorEmail,
    maxItemsPerRun: config.maxItemsPerRun > 0 ? config.maxItemsPerRun : 50,
  });

  console.log(
    JSON.stringify(
      {
        created,
        result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[import-yahoo-daily-update] failed", error);
  process.exitCode = 1;
});
