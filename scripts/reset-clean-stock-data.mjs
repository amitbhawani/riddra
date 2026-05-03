import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for clean stock reset.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const generatedYahooTables = [
  "stock_company_profile",
  "stock_price_history",
  "stock_market_snapshot",
  "stock_valuation_metrics",
  "stock_share_statistics",
  "stock_financial_highlights",
  "stock_income_statement",
  "stock_balance_sheet",
  "stock_cash_flow",
  "stock_dividends",
  "stock_splits",
  "stock_corporate_actions",
  "stock_earnings_events",
  "stock_earnings_trend",
  "stock_analyst_ratings",
  "stock_holders_summary",
  "stock_holders_detail",
  "stock_options_contracts",
  "stock_news",
  "stock_technical_indicators",
  "stock_performance_metrics",
  "stock_growth_metrics",
  "stock_health_ratios",
  "stock_riddra_scores",
  "stock_import_coverage",
];

const legacyStockTables = [
  "stock_quote_history",
  "stock_ohlcv_history",
  "stock_fundamental_snapshots",
  "stock_shareholding_snapshots",
];

const preservedTables = [
  "instruments",
  "companies",
  "stocks_master",
  "raw_yahoo_imports",
  "stock_import_jobs",
  "stock_import_job_items",
  "stock_import_errors",
  "stock_import_activity_log",
  "stock_import_reconciliation",
  "market_data_sources",
  "cms_admin_records",
  "cms_admin_record_revisions",
  "cms_admin_pending_approvals",
];

const allResetTables = [...generatedYahooTables, ...legacyStockTables];

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isMissingRelationError(error) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return message.includes("could not find the table") || (message.includes("relation") && message.includes("does not exist"));
}

async function getTableCount(tableName) {
  const { count, error } = await supabase.from(tableName).select("*", { count: "exact", head: true });
  if (error) {
    if (isMissingRelationError(error)) {
      return { status: "missing", count: 0, error: cleanString(error.message, 6000) };
    }
    throw error;
  }
  return { status: "present", count: count ?? 0, error: null };
}

async function deleteAllRows(tableName) {
  const { error } = await supabase.from(tableName).delete().gte("created_at", "1900-01-01T00:00:00+00:00");
  if (error) {
    if (isMissingRelationError(error)) {
      return { table: tableName, status: "missing", deletedRowsEstimate: 0, error: cleanString(error.message, 6000) };
    }
    throw error;
  }
  return { table: tableName, status: "cleared", deletedRowsEstimate: null, error: null };
}

async function main() {
  const startedAt = new Date().toISOString();
  const before = {};
  const after = {};
  const deletionResults = [];
  const preserved = {};
  const schemaChecks = {};

  for (const tableName of allResetTables) {
    before[tableName] = await getTableCount(tableName);
  }

  for (const tableName of allResetTables) {
    const result = await deleteAllRows(tableName);
    deletionResults.push(result);
  }

  for (const tableName of allResetTables) {
    after[tableName] = await getTableCount(tableName);
    schemaChecks[tableName] = after[tableName].status;
  }

  for (const tableName of preservedTables) {
    preserved[tableName] = await getTableCount(tableName);
    schemaChecks[tableName] = preserved[tableName].status;
  }

  const duplicateCheck = {
    resetScopeTablesWithRemainingRows: Object.entries(after)
      .filter(([, result]) => result.status === "present" && result.count > 0)
      .map(([table]) => table),
    duplicateRiskStatus: Object.values(after).every((result) => result.status !== "present" || result.count === 0) ? "none" : "remaining_rows_present",
  };

  const autoIncrementReset = {
    applied: false,
    reason: "Not applicable. Reset tables use UUID primary keys rather than serial auto-increment sequences.",
  };

  const completedAt = new Date().toISOString();

  const summary = {
    ok: duplicateCheck.duplicateRiskStatus === "none",
    startedAt,
    completedAt,
    projectUrl: supabaseUrl,
    resetScope: {
      generatedYahooTables,
      legacyStockTables,
    },
    preservedScope: preservedTables,
    before,
    deletionResults,
    after,
    preserved,
    schemaChecks,
    autoIncrementReset,
    duplicateCheck,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        projectUrl: supabaseUrl,
        error: cleanString(error?.message ?? error, 6000),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
