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

const { prepareYahooDailySameDayCronJob, controlYahooStockBatchImportJob } = await import(
  "@/lib/yahoo-finance-batch-import"
);
const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");

const targetDate = process.env.CRON_SEED_TEST_TARGET_DATE?.trim() || "2099-01-01";
const actorEmail =
  process.env.CRON_SEED_TEST_ACTOR_EMAIL?.trim() || "Codex Cron Seed Validation";

async function main() {
  const startedAt = Date.now();
  const prepared = await prepareYahooDailySameDayCronJob({
    cronWindow: "retry",
    targetDate,
    actorEmail,
    actorUserId: null,
  });
  const durationMs = Date.now() - startedAt;

  const supabase = createSupabaseAdminClient();
  let seededItemRows = 0;
  let metadata = null;
  let status = null;

  if (prepared.jobId) {
    const { count, error: countError } = await supabase
      .from("stock_import_job_items")
      .select("*", { head: true, count: "exact" })
      .eq("job_id", prepared.jobId);

    if (countError) {
      throw countError;
    }

    seededItemRows = Number(count ?? 0) || 0;

    const { data, error: jobError } = await supabase
      .from("stock_import_jobs")
      .select("metadata,status")
      .eq("id", prepared.jobId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw jobError;
    }

    metadata = data?.metadata ?? null;
    status = data?.status ?? null;

    await controlYahooStockBatchImportJob({
      jobId: prepared.jobId,
      action: "stop",
      actorEmail,
    });
  }

  console.log(
    JSON.stringify(
      {
        targetDate,
        durationMs,
        mode: prepared.mode,
        created: prepared.created,
        reused: prepared.reused,
        jobId: prepared.jobId,
        requestedCount: prepared.requestedCount,
        totalEligibleStocks: prepared.totalEligibleStocks,
        seededItemCount: prepared.seededItemCount,
        remainingUnseededCount: prepared.remainingUnseededCount,
        nextSeedCursor: prepared.nextSeedCursor,
        nextPendingSymbol: prepared.nextPendingSymbol,
        seededItemRows,
        status,
        metadata,
      },
      null,
      2,
    ),
  );
}

await main();
