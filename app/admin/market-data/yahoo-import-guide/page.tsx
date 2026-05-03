import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { requireOperator } from "@/lib/auth";

const DATA_BUCKETS = [
  {
    title: "Identity and Company Profile",
    note: "Basic company facts, symbol mapping, sector, industry, website, and profile details.",
  },
  {
    title: "Historical Price Data",
    note: "Daily OHLCV history used for charts, performance calculations, and technical indicators.",
  },
  {
    title: "Latest Market Snapshot",
    note: "Latest price, change, change percent, 52-week range, and current market summary fields.",
  },
  {
    title: "Valuation and Key Statistics",
    note: "Core valuation fields such as P/E, price-to-book, market cap, and related summary metrics.",
  },
  {
    title: "Financial Statements",
    note: "Annual and quarterly income statement, balance sheet, and cash flow data.",
  },
  {
    title: "Profitability, Growth and Health Ratios",
    note: "Calculated quality layers such as growth, profitability, leverage, and health ratios.",
  },
  {
    title: "Dividends, Splits and Corporate Actions",
    note: "Dividend history, stock splits, and other structural changes that affect the stock timeline.",
  },
  {
    title: "Earnings, Calendar and Analyst Data",
    note: "Earnings events, analyst summaries, and forward-looking calendar data where available.",
  },
  {
    title: "Holders and Ownership",
    note: "Institutional, mutual fund, and major holder ownership tables when Yahoo provides them.",
  },
  {
    title: "Options, News and Riddra Calculated Layer",
    note: "Options chains, linked news, and Riddra-owned calculated scores or indicators.",
  },
];

const IMPORT_MODES = [
  {
    title: "One stock import",
    note: "Use this when you want to prove one symbol end to end before touching a larger watchlist.",
  },
  {
    title: "Selected stocks import",
    note: "Use this for a short curated list such as a sector basket or failed symbols that need a rerun.",
  },
  {
    title: "All pending stocks import",
    note: "Use this for the normal backlog, especially after new stocks are added to the import dashboard.",
  },
  {
    title: "Retry failed imports",
    note: "Use this after an upstream Yahoo problem or a mapping issue has been fixed.",
  },
  {
    title: "Import only missing data",
    note: "Use this after the first full import so the system only asks Yahoo for data that is still missing.",
  },
  {
    title: "Financial statements test mode",
    note: "Financial statements are manual single-stock test only right now. They should not be included in live multi-stock batch runs.",
  },
];

const ADMIN_CONTROLS = [
  "Pause: stop new job items from starting while keeping existing progress visible.",
  "Resume: restart a paused job without creating a duplicate batch.",
  "Stop: end the current batch cleanly when a run should not continue.",
  "Retry: rerun failed job items after the cause has been fixed.",
  "View raw Yahoo response: inspect exactly what Yahoo returned before normalization.",
  "View missing fields report: inspect which fields stayed empty after normalization.",
];

const OBSERVABILITY_GUIDE = [
  "Latest import activity shows the newest fetch, raw-save, normalization, coverage, reconciliation, and failure checkpoints across Yahoo imports.",
  "Per-stock activity timeline shows the exact sequence of import steps for one stock, including row counts, field fill percentage, and any failure message.",
  "Per-module reconciliation status compares raw Yahoo record counts with normalized table rows so you can see what was mapped, skipped, or left unmapped.",
  "Missing-field summary helps editors spot null-heavy buckets before trusting the public stock page.",
  "Retry recommendation gives a human-friendly next step instead of forcing admins to infer the right repair action from raw logs.",
];

const SAFE_USAGE_RULES = [
  "Do not run aggressive parallel imports. The safest default is still one controlled worker flow.",
  "Keep the default throttle at 1 request per second unless there is a proven reason to change it.",
  "Keep the hourly and daily request caps in place so long-running imports stay recoverable.",
  "After the first full historical import, prefer import-only-missing mode for normal upkeep.",
  "Batch imports should default to selected modules only. Do not include full historical refresh unless you explicitly need it.",
  "Do not run financial statements in live batch mode right now. Use the manual single-stock test flow only.",
  "Keep retries limited. One upstream block should not trigger repeated hammering of Yahoo.",
  "Avoid repeated full refreshes for the same stock unless you are repairing coverage or testing a migration.",
  "If the dashboard says a module was skipped or reused, trust that signal instead of forcing another request immediately.",
];

const RECOMMENDED_SCHEDULE = [
  "Historical full import: one-time only, then keep it incremental.",
  "Quote/statistics: daily or weekly depending on editorial freshness needs.",
  "Financial statements: weekly or monthly is usually enough.",
  "News: daily if the news bucket is enabled and reviewed.",
  "Technical indicators: calculate internally after price history lands.",
];

const TROUBLESHOOTING = [
  {
    title: "Yahoo blocks or returns empty data",
    note: "Wait, do not spam retries, and check the latest raw response plus stock_import_errors before rerunning. If repeated failures continue, let the cooldown finish before resuming the batch.",
  },
  {
    title: "A stock symbol fails",
    note: "Verify the Yahoo symbol, confirm the stock mapping in the dashboard, and rerun only that stock or module.",
  },
  {
    title: "Historical data looks incomplete",
    note: "Check stock_import_coverage first, then inspect raw_yahoo_imports and rerun only the historical module if needed.",
  },
  {
    title: "Need to inspect raw_yahoo_imports",
    note: "Use the stock dashboard raw response view so you can compare upstream Yahoo payloads with normalized tables.",
  },
  {
    title: "Need to inspect stock_import_errors",
    note: "Open the import logs or failed items view in the stock dashboard and review the latest provider or normalization error.",
  },
  {
    title: "The batch shows cooling_down",
    note: "This means repeated Yahoo/provider failures triggered an automatic pause. Review the last Yahoo error, wait until cooldown expires, then resume or retry only the failed module.",
  },
  {
    title: "Need to rerun only a failed module",
    note: "Use the selected import controls and choose only the module that failed instead of repeating a full stock refresh.",
  },
];

export const metadata: Metadata = {
  title: "Yahoo Import Guide",
  description:
    "Simple operating guide for admin and editor users who manage Yahoo-backed stock imports in Riddra.",
};

export const dynamic = "force-dynamic";

export default async function AdminYahooImportGuidePage() {
  await requireOperator();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market Data Ops", href: "/admin/market-data" },
          { label: "Yahoo import guide", href: "/admin/market-data/yahoo-import-guide" },
        ]}
        eyebrow="Admin help and operations"
        title="Yahoo Finance Import Guide"
        description="This page explains what the Yahoo importer does, when to use each import mode, and how to operate it safely without needing developer knowledge."
        actions={
          <>
            <AdminActionLink href="/admin/market-data" label="Back to market data ops" />
            <AdminActionLink href="/admin/market-data/import-control-center" label="Import control center" />
            <AdminActionLink href="/admin/market-data/stocks" label="Open stock import dashboard" />
            <AdminActionLink href="/admin/market-data/sources" label="Open source registry" />
            <AdminActionLink href="#production-runbook" label="2,000-stock runbook" />
            <AdminActionLink href="/admin/activity-log" label="Activity log" />
          </>
        }
      />

      <AdminSectionCard
        title="What the Yahoo Finance import system does"
        description="In simple terms, this system fetches stock data from Yahoo Finance, stores the raw upstream response for proof, normalizes it into Riddra tables, and then exposes the clean version to admin tools and stock pages."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 1</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Fetch one or more Yahoo data buckets for a stock such as history, snapshot, valuation, or financial statements.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 2</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Save the raw upstream payload first, then normalize the usable fields into durable stock tables.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 3</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Track coverage, missing fields, and failures so editors can see what is complete and what still needs attention.
            </p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="The 10 data buckets"
        description="These are the main Yahoo-backed data groups the Riddra stock system can import and monitor."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {DATA_BUCKETS.map((bucket, index) => (
            <div
              key={bucket.title}
              className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[#111827]">
                {index + 1}. {bucket.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{bucket.note}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Import modes"
        description="Choose the smallest safe mode that solves the job. The goal is controlled coverage, not unnecessary re-imports."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {IMPORT_MODES.map((mode) => (
            <div
              key={mode.title}
              className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[#111827]">{mode.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{mode.note}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Admin controls"
        description="These are the main controls available from the stock import dashboard and related Yahoo admin surfaces."
      >
        <ul className="grid gap-2 text-sm leading-6 text-[#4b5563] xl:grid-cols-2">
          {ADMIN_CONTROLS.map((item) => (
            <li key={item} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </AdminSectionCard>

      <AdminSectionCard
        title="Activity and reconciliation checks"
        description="Use these views to understand what the importer did, what Yahoo returned, and whether a retry is actually necessary."
      >
        <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
          {OBSERVABILITY_GUIDE.map((item) => (
            <li key={item} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </AdminSectionCard>

      <AdminSectionCard
        title="Safe Yahoo usage rules"
        description="Yahoo Finance access is unofficial, so safe behavior matters as much as the importer itself."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <AdminBadge label="Throttle first" tone="warning" />
            <AdminBadge label="Missing-only preferred" tone="info" />
            <AdminBadge label="Limited retries" tone="warning" />
            <AdminBadge label="No aggressive parallel runs" tone="danger" />
          </div>
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            {SAFE_USAGE_RULES.map((rule) => (
              <li key={rule} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
                {rule}
              </li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-[#4b5563]">
            Current safe defaults: `1 req/sec`, `2000 requests/hour`, `15000 requests/day`, `1 active worker`, `45 minute cooldown after repeated Yahoo failures`, and `3 max retries`.
          </p>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Recommended import schedule"
        description="These are practical admin defaults for keeping stock data fresh without overusing Yahoo."
      >
        <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
          {RECOMMENDED_SCHEDULE.map((item) => (
            <li key={item} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </AdminSectionCard>

      <AdminSectionCard
        id="production-runbook"
        title="2,000-stock production runbook"
        description="Use the staged runbook before any large Yahoo rollout. It explains pre-checks, safe throttling, staged batch sizes, pause and retry controls, completion verification, blocking signals, and partial rollback rules."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <AdminBadge label="Preparation only" tone="warning" />
            <AdminBadge label="No auto-start" tone="danger" />
            <AdminBadge label="Staged rollout" tone="info" />
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-sm font-semibold text-[#111827]">Canonical runbook file</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              <code>docs/riddra-yahoo-2000-stock-import-runbook.md</code>
            </p>
          </div>
          <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
            <li className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              Start only after the Yahoo schema is app-visible, the pilot stages are signed off, and sample frontend stock pages render correctly.
            </li>
            <li className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              Use staged rollout sizes of <code>50</code>, <code>250</code>, <code>500</code>, then the remaining universe instead of a single large jump.
            </li>
            <li className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              Keep the safe defaults: <code>1 req/sec</code>, <code>1 worker</code>, missing-only imports, limited retries, and cooldown-aware recovery.
            </li>
          </ul>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Troubleshooting"
        description="Use these checks before asking for a developer change. Most issues can be narrowed down by source health, raw response, or import logs."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {TROUBLESHOOTING.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{item.note}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Clear disclaimer"
        description="This should stay visible to anyone operating the Yahoo importer."
        tone="warning"
      >
        <p className="text-sm leading-6 text-[#9a3412]">
          Yahoo Finance access is unofficial. The importer must be used with throttling, caching, and recovery controls.
        </p>
      </AdminSectionCard>
    </AdminPageFrame>
  );
}
