export type FiiDiiReportRow = {
  category: string;
  dateLabel: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
};

export type FiiDiiReportSection = {
  id: string;
  title: string;
  description: string;
  csvFileName: string;
  rows: FiiDiiReportRow[];
};

function formatValue(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatFiiDiiCurrency(value: number) {
  return formatValue(value);
}

export function buildFiiDiiCsv(section: FiiDiiReportSection) {
  const header = ["Category", "Date", "Buy Value (Rs Crores)", "Sell Value (Rs Crores)", "Net Value (Rs Crores)"];
  const lines = section.rows.map((row) =>
    [
      row.category,
      row.dateLabel,
      formatValue(row.buyValue),
      formatValue(row.sellValue),
      formatValue(row.netValue),
    ].join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export const fiiDiiReport = {
  sourceLabel: "NSE India reports desk",
  sourceUrl: "https://www.nseindia.com/reports/fii-dii",
  reportDateLabel: "24-Apr-2026",
  lastUpdatedLabel: "24 Apr 2026 · 6:10 PM IST",
  sections: [
    {
      id: "nse-capital-market",
      title: "FII/FPI & DII trading activity on NSE in Capital Market Segment",
      description: "NSE-only capital-market view for institutional buy, sell, and net positioning.",
      csvFileName: "riddra-fii-dii-nse-capital-market.csv",
      rows: [
        {
          category: "DII",
          dateLabel: "24-Apr-2026",
          buyValue: 20346.06,
          sellValue: 15739.02,
          netValue: 4607.04,
        },
        {
          category: "FII/FPI",
          dateLabel: "24-Apr-2026",
          buyValue: 9454.95,
          sellValue: 17932.55,
          netValue: -8477.6,
        },
      ],
    },
    {
      id: "all-exchanges-capital-market",
      title: "FII/FPI & DII trading activity on NSE, BSE and MSEI in Capital Market Segment",
      description: "Combined exchange view for a wider institutional-flow read across the listed equity tape.",
      csvFileName: "riddra-fii-dii-all-exchanges-capital-market.csv",
      rows: [
        {
          category: "DII",
          dateLabel: "24-Apr-2026",
          buyValue: 21560.16,
          sellValue: 16859.45,
          netValue: 4700.71,
        },
        {
          category: "FII/FPI",
          dateLabel: "24-Apr-2026",
          buyValue: 9837.2,
          sellValue: 18665.07,
          netValue: -8827.87,
        },
      ],
    },
  ] satisfies FiiDiiReportSection[],
  notes: [
    "Use this page as the clean public destination for institutional flow instead of scattering FII and DII context across stock detail pages.",
    "The current layout mirrors the NSE-style report structure so the team can later plug in verified backend-fed values without redesigning the page.",
    "Download links are generated directly from the visible table rows, which keeps the public page and export output in sync.",
  ],
};
