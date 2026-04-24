import { createClient } from "@supabase/supabase-js";

const CONFIG_BLOCKER = "config blocker";
const MIGRATION_BLOCKER = "migration blocker";
const BACKFILL_BLOCKER = "backfill blocker";
const RUNTIME_BLOCKER = "runtime blocker";

const EXACT_RUNTIME_ENV = [
  { key: "RIDDRA_RUNTIME_MODE", expected: "hosted" },
  { key: "RIDDRA_DURABLE_DATA_RUNTIME", expected: "hosted_db" },
];

const REQUIRED_DB_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

const rowCountRequirements = [
  {
    table: "benchmark_ohlcv_history",
    label: "benchmark history",
    coverage: [
      { column: "index_slug", value: "nifty50", minRows: 252 },
      { column: "index_slug", value: "sensex", minRows: 252 },
      { column: "index_slug", value: "banknifty", minRows: 252 },
      { column: "index_slug", value: "finnifty", minRows: 252 },
    ],
  },
  {
    table: "mutual_fund_nav_history",
    label: "mutual-fund NAV history",
    coverage: [
      { column: "fund_slug", value: "hdfc-mid-cap-opportunities", minRows: 252 },
      { column: "fund_slug", value: "sbi-bluechip-fund", minRows: 252 },
    ],
  },
  {
    table: "fund_factsheet_snapshots",
    label: "fund factsheets",
    coverage: [
      { column: "fund_slug", value: "hdfc-mid-cap-opportunities", minRows: 1 },
      { column: "fund_slug", value: "sbi-bluechip-fund", minRows: 1 },
    ],
  },
  {
    table: "stock_fundamental_snapshots",
    label: "stock fundamentals",
    coverage: [
      { column: "stock_slug", value: "tata-motors", minRows: 1 },
      { column: "stock_slug", value: "infosys", minRows: 1 },
      { column: "stock_slug", value: "hdfc-bank", minRows: 1 },
      { column: "stock_slug", value: "reliance-industries", minRows: 1 },
    ],
  },
  {
    table: "stock_shareholding_snapshots",
    label: "stock shareholding",
    coverage: [
      { column: "stock_slug", value: "tata-motors", minRows: 1 },
      { column: "stock_slug", value: "infosys", minRows: 1 },
      { column: "stock_slug", value: "hdfc-bank", minRows: 1 },
      { column: "stock_slug", value: "reliance-industries", minRows: 1 },
    ],
  },
  {
    table: "sector_performance_snapshots",
    label: "sector performance",
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
    label: "index composition snapshots",
    coverage: [
      { column: "index_slug", value: "nifty50", minRows: 1 },
      { column: "index_slug", value: "sensex", minRows: 1 },
      { column: "index_slug", value: "banknifty", minRows: 1 },
      { column: "index_slug", value: "finnifty", minRows: 1 },
    ],
  },
];

const payloadRequirements = [
  {
    table: "fund_holding_snapshots",
    keyColumn: "fund_slug",
    orderColumn: "source_date",
    targets: [
      { value: "hdfc-mid-cap-opportunities", minimumPayloadLength: 5, label: "holdings rows" },
      { value: "sbi-bluechip-fund", minimumPayloadLength: 5, label: "holdings rows" },
    ],
  },
  {
    table: "fund_sector_allocation_snapshots",
    keyColumn: "fund_slug",
    orderColumn: "source_date",
    targets: [
      { value: "hdfc-mid-cap-opportunities", minimumPayloadLength: 5, label: "allocation sectors" },
      { value: "sbi-bluechip-fund", minimumPayloadLength: 5, label: "allocation sectors" },
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

function printSection(title) {
  console.log(`\n${title}`);
}

function formatResult(result) {
  return `[${result.status}] ${result.type.toUpperCase()} :: ${result.target} :: ${result.details}`;
}

function normalize(value) {
  return value.trim().toLowerCase();
}

function isMissingRelationError(error) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return text.includes("relation") && text.includes("does not exist");
}

function getClient() {
  return createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function checkRuntimeEnv() {
  printSection("Hosted backfill validator: runtime and DB access");

  for (const requirement of EXACT_RUNTIME_ENV) {
    const actual = getEnv(requirement.key);

    if (!actual) {
      addResult(RUNTIME_BLOCKER, requirement.key, "FAIL", `missing, expected ${requirement.expected}`);
      continue;
    }

    if (normalize(actual) !== requirement.expected) {
      addResult(RUNTIME_BLOCKER, requirement.key, "FAIL", `expected ${requirement.expected}, found ${actual}`);
      continue;
    }

    addResult("pass", requirement.key, "PASS", `exact value ${requirement.expected}`);
  }

  for (const key of REQUIRED_DB_ENV) {
    if (!getEnv(key)) {
      addResult(CONFIG_BLOCKER, key, "FAIL", "missing required DB access env");
      continue;
    }

    addResult("pass", key, "PASS", "present");
  }
}

async function getCount(client, table, column, value) {
  const query = client.from(table).select("*", { count: "exact", head: true });
  const filtered = column && value ? query.eq(column, value) : query;
  const { count, error } = await filtered;
  return { count: count ?? 0, error };
}

async function getLatestPayloadLength(client, table, keyColumn, value, orderColumn) {
  const { data, error } = await client
    .from(table)
    .select("payload_json")
    .eq(keyColumn, value)
    .order(orderColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error, length: 0 };
  }

  const payload = data?.payload_json;
  const rows = Array.isArray(payload) ? payload : [];

  return { error: null, length: rows.length };
}

async function checkRowCountsAndPayloads() {
  printSection("Hosted backfill validator: durable lane coverage");

  if (!getEnv("NEXT_PUBLIC_SUPABASE_URL") || !getEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    addResult(CONFIG_BLOCKER, "hosted DB coverage checks", "FAIL", "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
    return;
  }

  const client = getClient();

  for (const requirement of rowCountRequirements) {
    const tableProbe = await getCount(client, requirement.table);

    if (tableProbe.error) {
      if (isMissingRelationError(tableProbe.error)) {
        addResult(MIGRATION_BLOCKER, requirement.table, "FAIL", "table is missing in hosted DB");
      } else {
        addResult(CONFIG_BLOCKER, requirement.table, "FAIL", `unable to read table: ${tableProbe.error.message}`);
      }
      continue;
    }

    addResult("pass", requirement.table, "PASS", `${requirement.label} table reachable, total rows ${tableProbe.count}`);

    for (const coverage of requirement.coverage) {
      const probe = await getCount(client, requirement.table, coverage.column, coverage.value);

      if (probe.error) {
        if (isMissingRelationError(probe.error)) {
          addResult(MIGRATION_BLOCKER, `${requirement.table}.${coverage.value}`, "FAIL", "table missing during coverage check");
        } else {
          addResult(CONFIG_BLOCKER, `${requirement.table}.${coverage.value}`, "FAIL", `coverage query failed: ${probe.error.message}`);
        }
        continue;
      }

      if (probe.count < coverage.minRows) {
        addResult(BACKFILL_BLOCKER, `${requirement.table}.${coverage.value}`, "FAIL", `expected at least ${coverage.minRows} rows, found ${probe.count}`);
        continue;
      }

      addResult("pass", `${requirement.table}.${coverage.value}`, "PASS", `found ${probe.count} rows, minimum ${coverage.minRows}`);
    }
  }

  for (const requirement of payloadRequirements) {
    const tableProbe = await getCount(client, requirement.table);

    if (tableProbe.error) {
      if (isMissingRelationError(tableProbe.error)) {
        addResult(MIGRATION_BLOCKER, requirement.table, "FAIL", "table is missing in hosted DB");
      } else {
        addResult(CONFIG_BLOCKER, requirement.table, "FAIL", `unable to read table: ${tableProbe.error.message}`);
      }
      continue;
    }

    addResult("pass", requirement.table, "PASS", `table reachable, total rows ${tableProbe.count}`);

    for (const target of requirement.targets) {
      const payloadProbe = await getLatestPayloadLength(
        client,
        requirement.table,
        requirement.keyColumn,
        target.value,
        requirement.orderColumn,
      );

      if (payloadProbe.error) {
        if (isMissingRelationError(payloadProbe.error)) {
          addResult(MIGRATION_BLOCKER, `${requirement.table}.${target.value}`, "FAIL", "table missing during payload check");
        } else {
          addResult(CONFIG_BLOCKER, `${requirement.table}.${target.value}`, "FAIL", `payload query failed: ${payloadProbe.error.message}`);
        }
        continue;
      }

      if (payloadProbe.length < target.minimumPayloadLength) {
        addResult(
          BACKFILL_BLOCKER,
          `${requirement.table}.${target.value}`,
          "FAIL",
          `expected at least ${target.minimumPayloadLength} ${target.label}, found ${payloadProbe.length}`,
        );
        continue;
      }

      addResult(
        "pass",
        `${requirement.table}.${target.value}`,
        "PASS",
        `latest snapshot has ${payloadProbe.length} ${target.label}, minimum ${target.minimumPayloadLength}`,
      );
    }
  }
}

function printSummary() {
  for (const result of results) {
    console.log(formatResult(result));
  }

  const summary = { config: 0, migration: 0, backfill: 0, runtime: 0 };

  for (const result of results) {
    if (result.status !== "FAIL") {
      continue;
    }

    if (result.type === CONFIG_BLOCKER) {
      summary.config += 1;
    } else if (result.type === MIGRATION_BLOCKER) {
      summary.migration += 1;
    } else if (result.type === BACKFILL_BLOCKER) {
      summary.backfill += 1;
    } else if (result.type === RUNTIME_BLOCKER) {
      summary.runtime += 1;
    }
  }

  printSection("Hosted backfill validator summary");
  console.log(`config blocker: ${summary.config}`);
  console.log(`migration blocker: ${summary.migration}`);
  console.log(`backfill blocker: ${summary.backfill}`);
  console.log(`runtime blocker: ${summary.runtime}`);

  const hasFailure = results.some((result) => result.status === "FAIL");
  console.log(`status: ${hasFailure ? "FAIL" : "PASS"}`);
  process.exitCode = hasFailure ? 1 : 0;
}

await checkRuntimeEnv();
await checkRowCountsAndPayloads();
printSummary();
