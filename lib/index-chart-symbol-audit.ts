import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getTradingviewIndexSymbol } from "@/lib/tradingview-symbols";

export type IndexChartSymbolAuditRow = {
  slug: "nifty50" | "banknifty" | "finnifty" | "sensex";
  label: string;
  route: string;
  currentSymbol: string;
  source: "override" | "default";
  status: "Ready" | "In progress" | "Blocked";
  note: string;
  overrideField: string;
  candidates: string[];
};

const chartCandidates: Record<IndexChartSymbolAuditRow["slug"], string[]> = {
  nifty50: ["NSE:NIFTY", "NSE:NIFTY50", "TVC:NIFTY", "NIFTY"],
  banknifty: ["NSE:BANKNIFTY", "NSE:BANKNIFTY50", "TVC:BANKNIFTY", "BANKNIFTY"],
  finnifty: ["NSE:FINNIFTY", "NSE:FINNIFTY50", "TVC:FINNIFTY", "FINNIFTY"],
  sensex: ["BSE:SENSEX", "INDEX:SENSEX", "TVC:SENSEX", "SENSEX"],
};

export function getIndexChartSymbolAuditRows(): IndexChartSymbolAuditRow[] {
  const config = getRuntimeLaunchConfig();

  const rows: Array<{
    slug: IndexChartSymbolAuditRow["slug"];
    label: string;
    route: string;
    overrideValue: string;
    overrideField: string;
  }> = [
    {
      slug: "nifty50",
      label: "Nifty 50 chart symbol",
      route: "/nifty50",
      overrideValue: config.nifty50ChartSymbol,
      overrideField: "charting.nifty50Symbol",
    },
    {
      slug: "banknifty",
      label: "Bank Nifty chart symbol",
      route: "/banknifty",
      overrideValue: config.bankNiftyChartSymbol,
      overrideField: "charting.bankNiftySymbol",
    },
    {
      slug: "finnifty",
      label: "Fin Nifty chart symbol",
      route: "/finnifty",
      overrideValue: config.finNiftyChartSymbol,
      overrideField: "charting.finNiftySymbol",
    },
    {
      slug: "sensex",
      label: "Sensex chart symbol",
      route: "/sensex",
      overrideValue: config.sensexChartSymbol,
      overrideField: "charting.sensexSymbol",
    },
  ];

  return rows.map((row) => {
    const hasOverride = row.overrideValue.trim().length > 0;
    const currentSymbol = getTradingviewIndexSymbol(row.slug);
    const isSensex = row.slug === "sensex";

    return {
      slug: row.slug,
      label: row.label,
      route: row.route,
      currentSymbol,
      source: hasOverride ? "override" : "default",
      status: isSensex ? "Ready" : hasOverride ? "In progress" : "Blocked",
      note: isSensex
        ? "Sensex is currently the clean control case. Keep this mapping stable unless visual verification regresses."
        : hasOverride
          ? "An admin override is present. The next step is route-level visual verification to confirm the popup and load behavior improve."
          : "This route is still relying on the default symbol guess. Use the launch-config console to test an alternate TradingView symbol and then verify the public route.",
      overrideField: row.overrideField,
      candidates: chartCandidates[row.slug],
    };
  });
}

export function getIndexChartSymbolAuditSummary() {
  const rows = getIndexChartSymbolAuditRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
    overrides: rows.filter((row) => row.source === "override").length,
  };
}
