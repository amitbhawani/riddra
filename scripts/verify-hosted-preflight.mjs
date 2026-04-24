import { createClient } from "@supabase/supabase-js";

const CONFIG_BLOCKER = "config blocker";
const MIGRATION_BLOCKER = "migration blocker";
const BACKFILL_BLOCKER = "backfill blocker";
const RUNTIME_BLOCKER = "runtime blocker";

const EXACT_ENV_REQUIREMENTS = [
  { key: "RIDDRA_RUNTIME_MODE", expected: "hosted", blocker: RUNTIME_BLOCKER },
  { key: "RIDDRA_DURABLE_DATA_RUNTIME", expected: "hosted_db", blocker: RUNTIME_BLOCKER },
  { key: "LOCAL_AUTH_BYPASS", expected: "false", blocker: RUNTIME_BLOCKER },
  { key: "OPEN_ADMIN_ACCESS", expected: "false", blocker: RUNTIME_BLOCKER },
  { key: "DEV_PUBLISHABLE_FALLBACK", expected: "false", blocker: RUNTIME_BLOCKER },
];

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_LAUNCH_MODE",
  "MEILISEARCH_HOST",
  "MEILISEARCH_API_KEY",
  "MEILISEARCH_INDEX_PREFIX",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_PROJECT_REF",
  "MARKET_DATA_PROVIDER_URL",
  "MARKET_DATA_PROVIDER_TOKEN",
];

const OPTIONAL_SUPPORT_KEYS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "NEXT_PUBLIC_SUPPORT_EMAIL"];

const tableChecks = [
  {
    table: "benchmark_ohlcv_history",
    coverage: [
      { column: "index_slug", value: "nifty50", minRows: 252 },
      { column: "index_slug", value: "sensex", minRows: 252 },
      { column: "index_slug", value: "banknifty", minRows: 252 },
      { column: "index_slug", value: "finnifty", minRows: 252 },
      { column: "index_slug", value: "nifty100", minRows: 252 },
      { column: "index_slug", value: "niftymidcap150", minRows: 252 },
    ],
  },
  {
    table: "mutual_fund_nav_history",
    coverage: [
      { column: "fund_slug", value: "hdfc-mid-cap-opportunities", minRows: 252 },
      { column: "fund_slug", value: "sbi-bluechip-fund", minRows: 252 },
    ],
  },
  {
    table: "fund_factsheet_snapshots",
    coverage: [
      { column: "fund_slug", value: "hdfc-mid-cap-opportunities", minRows: 1 },
      { column: "fund_slug", value: "sbi-bluechip-fund", minRows: 1 },
    ],
  },
  {
    table: "fund_holding_snapshots",
    coverage: [
      { column: "fund_slug", value: "hdfc-mid-cap-opportunities", minRows: 1 },
      { column: "fund_slug", value: "sbi-bluechip-fund", minRows: 1 },
    ],
  },
  {
    table: "fund_sector_allocation_snapshots",
    coverage: [
      { column: "fund_slug", value: "hdfc-mid-cap-opportunities", minRows: 1 },
      { column: "fund_slug", value: "sbi-bluechip-fund", minRows: 1 },
    ],
  },
  {
    table: "stock_fundamental_snapshots",
    coverage: [
      { column: "stock_slug", value: "tata-motors", minRows: 1 },
      { column: "stock_slug", value: "infosys", minRows: 1 },
      { column: "stock_slug", value: "hdfc-bank", minRows: 1 },
      { column: "stock_slug", value: "reliance-industries", minRows: 1 },
    ],
  },
  {
    table: "stock_shareholding_snapshots",
    coverage: [
      { column: "stock_slug", value: "tata-motors", minRows: 1 },
      { column: "stock_slug", value: "infosys", minRows: 1 },
      { column: "stock_slug", value: "hdfc-bank", minRows: 1 },
      { column: "stock_slug", value: "reliance-industries", minRows: 1 },
    ],
  },
  {
    table: "sector_performance_snapshots",
    coverage: [
      { column: "sector_slug", value: "auto", minRows: 1 },
      { column: "sector_slug", value: "it-services", minRows: 1 },
      { column: "sector_slug", value: "banking", minRows: 1 },
      { column: "sector_slug", value: "consumer", minRows: 1 },
      { column: "sector_slug", value: "pharma", minRows: 1 },
      { column: "sector_slug", value: "energy", minRows: 1 },
    ],
  },
  {
    table: "index_component_weight_snapshots",
    coverage: [
      { column: "index_slug", value: "nifty50", minRows: 1 },
      { column: "index_slug", value: "sensex", minRows: 1 },
      { column: "index_slug", value: "banknifty", minRows: 1 },
      { column: "index_slug", value: "finnifty", minRows: 1 },
    ],
  },
];

const results = [];

function getEnv(key) {
  return process.env[key]?.trim() ?? "";
}

function addResult(type, target, status, details) {
  results.push({ type, target, status, details });
}

function normalizeBooleanLike(value) {
  return value.trim().toLowerCase();
}

function formatResult({ type, target, status, details }) {
  return `[${status}] ${type.toUpperCase()} :: ${target} :: ${details}`;
}

function printSection(title) {
  console.log(`\n${title}`);
}

async function checkEnvPresence() {
  printSection("Hosted preflight: config and runtime");

  for (const requirement of EXACT_ENV_REQUIREMENTS) {
    const actual = getEnv(requirement.key);

    if (!actual) {
      addResult(requirement.blocker, requirement.key, "FAIL", `missing, expected ${requirement.expected}`);
      continue;
    }

    if (normalizeBooleanLike(actual) !== requirement.expected) {
      addResult(requirement.blocker, requirement.key, "FAIL", `expected ${requirement.expected}, found ${actual}`);
      continue;
    }

    addResult("pass", requirement.key, "PASS", `exact value ${requirement.expected}`);
  }

  for (const key of REQUIRED_ENV_KEYS) {
    const actual = getEnv(key);

    if (!actual) {
      addResult(CONFIG_BLOCKER, key, "FAIL", "missing required hosted-proof env");
      continue;
    }

    addResult("pass", key, "PASS", "present");
  }

  const refreshSecret = getEnv("MARKET_DATA_REFRESH_SECRET");
  const cronSecret = getEnv("CRON_SECRET");

  if (!refreshSecret && !cronSecret) {
    addResult(CONFIG_BLOCKER, "MARKET_DATA_REFRESH_SECRET | CRON_SECRET", "FAIL", "one of these secrets must be present");
  } else {
    addResult("pass", "MARKET_DATA_REFRESH_SECRET | CRON_SECRET", "PASS", "at least one refresh secret is present");
  }

  const optionalSupportValues = OPTIONAL_SUPPORT_KEYS.map((key) => ({ key, value: getEnv(key) }));
  const supportEnabled = optionalSupportValues.some(({ value }) => Boolean(value));

  if (!supportEnabled) {
    addResult("pass", "optional email/support envs", "PASS", "skipped because email/support proof is not enabled");
    return;
  }

  for (const { key, value } of optionalSupportValues) {
    if (!value) {
      addResult(CONFIG_BLOCKER, key, "FAIL", "email/support proof appears enabled but this env is missing");
      continue;
    }

    addResult("pass", key, "PASS", "present");
  }
}

function canRunDbChecks() {
  return Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL") && getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

function getSupabaseAdminClient() {
  return createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isMissingRelationError(error) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return message.includes("relation") && message.includes("does not exist");
}

async function getCount(client, table, column, value) {
  const query = client.from(table).select("*", { count: "exact", head: true });
  const filtered = column && value ? query.eq(column, value) : query;
  const { count, error } = await filtered;
  return { count: count ?? 0, error };
}

async function checkTablesAndCoverage() {
  printSection("Hosted preflight: durable tables and hosted proof rows");

  if (!canRunDbChecks()) {
    addResult(CONFIG_BLOCKER, "hosted DB checks", "FAIL", "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
    return;
  }

  const client = getSupabaseAdminClient();

  for (const tableCheck of tableChecks) {
    const tableProbe = await getCount(client, tableCheck.table);

    if (tableProbe.error) {
      if (isMissingRelationError(tableProbe.error)) {
        addResult(MIGRATION_BLOCKER, tableCheck.table, "FAIL", "table is missing in hosted DB");
      } else {
        addResult(CONFIG_BLOCKER, tableCheck.table, "FAIL", `unable to read table: ${tableProbe.error.message}`);
      }

      continue;
    }

    addResult("pass", tableCheck.table, "PASS", `table reachable, total rows ${tableProbe.count}`);

    for (const coverage of tableCheck.coverage) {
      const entryProbe = await getCount(client, tableCheck.table, coverage.column, coverage.value);

      if (entryProbe.error) {
        if (isMissingRelationError(entryProbe.error)) {
          addResult(MIGRATION_BLOCKER, `${tableCheck.table}.${coverage.value}`, "FAIL", "table disappeared during coverage check");
        } else {
          addResult(CONFIG_BLOCKER, `${tableCheck.table}.${coverage.value}`, "FAIL", `unable to verify proof rows: ${entryProbe.error.message}`);
        }

        continue;
      }

      if (entryProbe.count < coverage.minRows) {
        addResult(
          BACKFILL_BLOCKER,
          `${tableCheck.table}.${coverage.value}`,
          "FAIL",
          `expected at least ${coverage.minRows} rows, found ${entryProbe.count}`,
        );
        continue;
      }

      addResult(
        "pass",
        `${tableCheck.table}.${coverage.value}`,
        "PASS",
        `found ${entryProbe.count} rows, minimum ${coverage.minRows}`,
      );
    }
  }
}

function printResults() {
  for (const result of results) {
    console.log(formatResult(result));
  }

  const blockerCounts = results.reduce(
    (accumulator, result) => {
      if (result.status !== "FAIL") {
        return accumulator;
      }

      if (result.type === CONFIG_BLOCKER) {
        accumulator.config += 1;
      } else if (result.type === MIGRATION_BLOCKER) {
        accumulator.migration += 1;
      } else if (result.type === BACKFILL_BLOCKER) {
        accumulator.backfill += 1;
      } else if (result.type === RUNTIME_BLOCKER) {
        accumulator.runtime += 1;
      }

      return accumulator;
    },
    { config: 0, migration: 0, backfill: 0, runtime: 0 },
  );

  printSection("Hosted preflight summary");
  console.log(`config blocker: ${blockerCounts.config}`);
  console.log(`migration blocker: ${blockerCounts.migration}`);
  console.log(`backfill blocker: ${blockerCounts.backfill}`);
  console.log(`runtime blocker: ${blockerCounts.runtime}`);

  const hasFailure = results.some((result) => result.status === "FAIL");

  if (hasFailure) {
    console.log("status: FAIL");
    process.exitCode = 1;
    return;
  }

  console.log("status: PASS");
}

await checkEnvPresence();
await checkTablesAndCoverage();
printResults();
