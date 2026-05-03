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

const { runYahooHistoricalOhlcvImport } = await import("../lib/yahoo-finance-import.ts");

const symbols = [
  "3MINDIA.NS",
  "21STCENMGM.NS",
  "AAATECH.NS",
  "360ONE.NS",
  "3PLAND.NS",
  "5PAISA.NS",
  "AAVAS.NS",
  "AARVI.NS",
  "AARTIDRUGS.NS",
  "63MOONS.NS",
  "AARON.NS",
  "20MICRONS.NS",
  "3IINFOLTD.NS",
  "AAREYDRUGS.NS",
  "ABCAPITAL.NS",
  "AARTIIND.NS",
  "AARTISURF.NS",
  "ABB.NS",
];

const results = [];

for (const yahooSymbol of symbols) {
  try {
    const result = await runYahooHistoricalOhlcvImport({
      yahooSymbol,
      period: "max",
      interval: "1d",
      duplicateMode: "skip_existing_dates",
      dryRun: true,
      actorEmail: "Codex Dry Run",
    });

    results.push({
      yahooSymbol,
      ok: true,
      jobStatus: result.jobStatus,
      insertedRows: result.insertedRows,
      skippedRows: result.skippedRows,
      updatedRows: result.updatedRows,
      mode: result.mode,
      warnings: result.warnings,
    });
  } catch (error) {
    results.push({
      yahooSymbol,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(JSON.stringify(results, null, 2));
