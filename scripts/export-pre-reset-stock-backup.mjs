import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for stock backup export.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const backupDate = process.argv[2]?.trim() || new Date().toISOString().slice(0, 10);
const backupDir = path.join(process.cwd(), "backups", `riddra-pre-reset-stock-backup-${backupDate}`);
const manifestPath = path.join(backupDir, "manifest.json");
const pageSize = 1000;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function ensureDirectory(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function normalizeCellValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeCsvValue(value) {
  const normalized = normalizeCellValue(value);
  if (!normalized) {
    return "";
  }
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }
  return normalized;
}

function getCsvHeaders(rows) {
  const headerSet = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) {
      headerSet.add(key);
    }
  }
  return Array.from(headerSet).sort((left, right) => left.localeCompare(right));
}

function writeCsv(filePath, rows) {
  const headers = getCsvHeaders(rows);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row?.[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  return headers;
}

async function fetchRowsByRange(tableName, options = {}) {
  const allRows = [];
  let offset = 0;

  while (true) {
    let query = supabase.from(tableName).select(options.select ?? "*");

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: true });
    }

    if (options.filters) {
      for (const filter of options.filters) {
        if (filter.type === "eq") {
          query = query.eq(filter.column, filter.value);
        } else if (filter.type === "in") {
          query = query.in(filter.column, filter.values);
        }
      }
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const rows = data ?? [];
    allRows.push(...rows);
    if (rows.length < pageSize) {
      break;
    }
    offset += rows.length;
  }

  return allRows;
}

async function fetchRowsByValues(tableName, column, values, options = {}) {
  if (!values.length) {
    return [];
  }

  const collected = [];
  for (const valueChunk of chunk(values, 100)) {
    const rows = await fetchRowsByRange(tableName, {
      ...options,
      filters: [...(options.filters ?? []), { type: "in", column, values: valueChunk }],
    });
    collected.push(...rows);
  }
  return collected;
}

async function exportTable(tableName, rows, note = "") {
  const filename = `${tableName}.csv`;
  const filePath = path.join(backupDir, filename);
  const headers = writeCsv(filePath, rows);
  const stats = fs.statSync(filePath);

  return {
    table: tableName,
    status: "exported",
    rows: rows.length,
    columns: headers.length,
    bytes: stats.size,
    filename,
    note,
  };
}

async function safeExportTable(tableName, loader, note = "") {
  try {
    const rows = await loader();
    return await exportTable(tableName, rows, note);
  } catch (error) {
    return {
      table: tableName,
      status: "failed",
      rows: 0,
      columns: 0,
      bytes: 0,
      filename: null,
      note,
      error: cleanString(error?.message ?? error, 6000),
    };
  }
}

async function main() {
  ensureDirectory(backupDir);

  const startedAt = new Date().toISOString();

  const stockInstrumentRows = await fetchRowsByRange("instruments", {
    orderBy: "id",
    filters: [{ type: "in", column: "instrument_type", values: ["stock", "equity"] }],
  });
  const stockInstrumentIds = stockInstrumentRows.map((row) => row.id).filter(Boolean);

  const exportResults = [];

  exportResults.push(await exportTable("instruments", stockInstrumentRows, "Filtered to instrument_type in (stock, equity)."));
  exportResults.push(
    await safeExportTable(
      "companies",
      async () => await fetchRowsByValues("companies", "instrument_id", stockInstrumentIds, { orderBy: "instrument_id" }),
      "Filtered to company rows attached to exported stock/equity instruments.",
    ),
  );
  exportResults.push(
    await safeExportTable(
      "stock_pages",
      async () => await fetchRowsByValues("stock_pages", "instrument_id", stockInstrumentIds, { orderBy: "instrument_id" }),
      "Legacy stock-page content attached to exported stock/equity instruments.",
    ),
  );

  const fullTableConfigs = [
    { table: "stocks_master", note: "Yahoo stock master mapping rows." },
    { table: "raw_yahoo_imports", note: "Raw Yahoo payload archive preserved before reset." },
    { table: "stock_company_profile", note: "Normalized company profile rows." },
    { table: "stock_price_history", note: "Normalized Yahoo daily price history rows." },
    { table: "stock_market_snapshot", note: "Latest normalized market snapshot rows." },
    { table: "stock_valuation_metrics", note: "Normalized valuation metric rows." },
    { table: "stock_share_statistics", note: "Normalized share-statistics rows." },
    { table: "stock_financial_highlights", note: "Normalized financial highlights rows." },
    { table: "stock_income_statement", note: "Normalized income statement rows." },
    { table: "stock_balance_sheet", note: "Normalized balance-sheet rows." },
    { table: "stock_cash_flow", note: "Normalized cash-flow rows." },
    { table: "stock_dividends", note: "Normalized dividend rows." },
    { table: "stock_splits", note: "Normalized split rows." },
    { table: "stock_corporate_actions", note: "Normalized corporate action rows." },
    { table: "stock_earnings_events", note: "Normalized earnings event rows." },
    { table: "stock_earnings_trend", note: "Normalized earnings trend rows." },
    { table: "stock_analyst_ratings", note: "Normalized analyst ratings rows." },
    { table: "stock_holders_summary", note: "Normalized holder summary rows." },
    { table: "stock_holders_detail", note: "Normalized holder detail rows." },
    { table: "stock_options_contracts", note: "Normalized options rows." },
    { table: "stock_news", note: "Normalized stock news rows." },
    { table: "stock_technical_indicators", note: "Calculated technical indicator rows." },
    { table: "stock_performance_metrics", note: "Calculated performance metric rows." },
    { table: "stock_growth_metrics", note: "Calculated growth metric rows." },
    { table: "stock_health_ratios", note: "Calculated health ratio rows." },
    { table: "stock_riddra_scores", note: "Calculated Riddra score rows." },
    { table: "stock_quote_history", note: "Legacy public stock quote history." },
    { table: "stock_ohlcv_history", note: "Legacy public stock OHLCV history." },
    { table: "stock_fundamental_snapshots", note: "Legacy stock fundamentals snapshot rows." },
    { table: "stock_shareholding_snapshots", note: "Legacy stock shareholding snapshot rows." },
    { table: "stock_import_jobs", note: "Parent stock import jobs." },
    { table: "stock_import_job_items", note: "Per-stock/per-module job queue rows." },
    { table: "stock_import_errors", note: "Durable Yahoo import errors." },
    { table: "stock_import_coverage", note: "Module-wise import coverage rows." },
    { table: "stock_import_activity_log", note: "Step-level import activity log rows." },
    { table: "stock_import_reconciliation", note: "Raw-vs-normalized reconciliation rows." },
    { table: "market_data_sources", note: "Source registry preserved for post-reset sync resumption." },
  ];

  for (const config of fullTableConfigs) {
    exportResults.push(
      await safeExportTable(
        config.table,
        async () => await fetchRowsByRange(config.table, { orderBy: "id" }),
        config.note,
      ),
    );
  }

  const cmsConfigs = [
    {
      table: "cms_admin_records",
      note: "Stock-family CMS records only.",
    },
    {
      table: "cms_admin_record_revisions",
      note: "Stock-family CMS revisions only.",
    },
    {
      table: "cms_admin_pending_approvals",
      note: "Stock-family CMS approvals only.",
    },
  ];

  for (const config of cmsConfigs) {
    exportResults.push(
      await safeExportTable(
        config.table,
        async () =>
          await fetchRowsByRange(config.table, {
            orderBy: "id",
            filters: [{ type: "eq", column: "family", value: "stocks" }],
          }),
        config.note,
      ),
    );
  }

  const completedAt = new Date().toISOString();
  const exportedTables = exportResults.filter((item) => item.status === "exported");
  const failedTables = exportResults.filter((item) => item.status === "failed");
  const totalRows = exportedTables.reduce((sum, item) => sum + item.rows, 0);

  const manifest = {
    ok: failedTables.length === 0,
    backupDate,
    startedAt,
    completedAt,
    projectUrl: supabaseUrl,
    backupDir,
    summary: {
      exportedTables: exportedTables.length,
      failedTables: failedTables.length,
      totalRows,
    },
    notes: [
      "There is no physical table named stock_import_logs in the current schema.",
      "The backup includes the current durable import-log equivalents: stock_import_errors, stock_import_activity_log, and stock_import_reconciliation.",
      "CMS exports are limited to family = stocks.",
      "Instrument export is limited to instrument_type in (stock, equity).",
    ],
    tables: exportResults,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        backupDate,
        backupDir,
        error: cleanString(error?.message ?? error, 6000),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
