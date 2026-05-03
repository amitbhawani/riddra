type YahooDryRunRequestType =
  | "quote_latest"
  | "quote_summary"
  | "historical_prices"
  | "financial_statements";

export type YahooDryRunFixture = {
  fixtureName: string;
  payload: unknown;
  responseStatus: number;
  responseHeaders: Record<string, unknown>;
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function unixSecondsForIstDate(date: string, hour = 15, minute = 30) {
  return Math.floor(new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`).getTime() / 1000);
}

const RELIANCE_DRY_RUN_DATES = [
  "2026-04-17",
  "2026-04-20",
  "2026-04-21",
  "2026-04-22",
  "2026-04-23",
  "2026-04-24",
  "2026-04-27",
  "2026-04-28",
  "2026-04-29",
  "2026-04-30",
] as const;

const RELIANCE_HISTORICAL_ROWS = [
  { open: 1288.2, high: 1299.5, low: 1281.3, close: 1294.1, adjClose: 1293.7, volume: 3_640_000 },
  { open: 1295.4, high: 1308.1, low: 1289.6, close: 1301.8, adjClose: 1301.4, volume: 3_910_000 },
  { open: 1302.2, high: 1314.7, low: 1296.5, close: 1308.9, adjClose: 1308.4, volume: 4_020_000 },
  { open: 1307.1, high: 1316.2, low: 1298.4, close: 1304.6, adjClose: 1304.1, volume: 3_780_000 },
  { open: 1305.5, high: 1312.4, low: 1297.8, close: 1300.3, adjClose: 1299.8, volume: 3_560_000 },
  { open: 1301.2, high: 1319.8, low: 1299.4, close: 1313.7, adjClose: 1313.1, volume: null },
  { open: 1314.1, high: 1326.5, low: 1308.2, close: 1322.4, adjClose: 1321.9, volume: 4_480_000 },
  { open: 1321.8, high: 1334.2, low: 1317.1, close: 1328.6, adjClose: 1328.0, volume: 4_690_000 },
  { open: 1330.4, high: 1346.7, low: 1325.9, close: 1342.3, adjClose: 1341.7, volume: 5_140_000 },
  { open: 1343.6, high: 1356.8, low: 1337.2, close: 1350.75, adjClose: null, volume: 5_320_000 },
];

function buildRelianceQuoteLatestPayload() {
  const tradeDate = RELIANCE_DRY_RUN_DATES[RELIANCE_DRY_RUN_DATES.length - 1];
  return {
    quoteResponse: {
      result: [
        {
          symbol: "RELIANCE.NS",
          shortName: "Reliance",
          longName: "Reliance Industries",
          currency: "INR",
          exchangeName: "NSI",
          marketState: "CLOSED",
          regularMarketTime: unixSecondsForIstDate(tradeDate, 15, 30),
          regularMarketPrice: 1350.75,
          regularMarketPreviousClose: 1342.3,
          regularMarketOpen: 1343.6,
          regularMarketDayHigh: 1356.8,
          regularMarketDayLow: 1337.2,
          regularMarketChange: 8.45,
          regularMarketChangePercent: 0.6295,
          regularMarketVolume: 5_320_000,
          marketCap: 18_276_500_000_000,
        },
      ],
      error: null,
    },
  };
}

function buildRelianceQuoteSummaryPayload() {
  return {
    quoteSummary: {
      result: [
        {
          price: {
            shortName: "Reliance",
            longName: "Reliance Industries",
            quoteType: "EQUITY",
            exchangeName: "NSI",
            marketCap: 18_276_500_000_000,
          },
          quoteType: {
            quoteType: "EQUITY",
          },
          assetProfile: {
            sector: "Energy",
            industry: "Oil & Gas Refining & Marketing",
            website: "https://www.ril.com",
            longBusinessSummary:
              "Reliance Industries Limited operates energy, petrochemicals, retail, and digital services businesses in India and internationally.",
            country: "India",
            state: "Maharashtra",
            city: "Mumbai",
            address1: "Maker Chambers IV",
            phone: "+91 22 3555 5000",
            fullTimeEmployees: 389414,
          },
          summaryProfile: {
            longBusinessSummary:
              "Reliance Industries runs integrated energy, retail, and telecom businesses.",
          },
          summaryDetail: {
            marketCap: 18_276_500_000_000,
            trailingPE: 24.8,
            forwardPE: 22.1,
            dividendYield: 0.0035,
          },
          defaultKeyStatistics: {
            enterpriseValue: 18_950_000_000_000,
            pegRatio: 1.45,
            priceToBook: 2.35,
            enterpriseToRevenue: 2.95,
            enterpriseToEbitda: 12.7,
            trailingEps: 54.32,
            forwardEps: 60.11,
            sharesOutstanding: 6767890000,
            floatShares: 3321000000,
            impliedSharesOutstanding: null,
            sharesShort: 12560000,
            sharesShortPriorMonth: 11750000,
            shortRatio: 1.8,
            shortPercentOfFloat: null,
            sharesPercentSharesOut: 0.0019,
            heldPercentInsiders: 0.501,
            heldPercentInstitutions: 0.238,
            netIncomeToCommon: 367500000000,
            bookValue: 575.2,
          },
          financialData: {
            enterpriseValue: 18_950_000_000_000,
            totalRevenue: 9_820_000_000_000,
            grossProfits: 4_210_000_000_000,
            ebitda: 1_492_000_000_000,
            operatingCashflow: 1_084_000_000_000,
            freeCashflow: null,
            totalCash: 2_130_000_000_000,
            totalDebt: 3_460_000_000_000,
            currentRatio: 1.14,
            returnOnAssets: 0.071,
            returnOnEquity: 0.094,
            epsCurrentYear: 57.8,
          },
          incomeStatementHistory: {
            incomeStatementHistory: [
              {
                endDate: "2025-03-31",
                currencyCode: "INR",
                totalRevenue: 9_820_000_000_000,
                costOfRevenue: 6_140_000_000_000,
                grossProfit: 3_680_000_000_000,
                totalOperatingExpenses: 2_560_000_000_000,
                operatingIncome: 1_120_000_000_000,
                interestExpense: 138_000_000_000,
                incomeBeforeTax: 722_000_000_000,
                incomeTaxExpense: 168_000_000_000,
                netIncome: 554_000_000_000,
                netIncomeApplicableToCommonShares: 548_000_000_000,
                basicEPS: 81.1,
                dilutedEPS: 80.8,
                ebitda: 1_492_000_000_000,
              },
              {
                endDate: "2024-03-31",
                currencyCode: "INR",
                totalRevenue: 9_130_000_000_000,
                costOfRevenue: 5_960_000_000_000,
                grossProfit: 3_170_000_000_000,
                totalOperatingExpenses: 2_310_000_000_000,
                operatingIncome: 860_000_000_000,
                interestExpense: 131_000_000_000,
                incomeBeforeTax: 654_000_000_000,
                incomeTaxExpense: 152_000_000_000,
                netIncome: 502_000_000_000,
                netIncomeApplicableToCommonShares: 497_000_000_000,
                basicEPS: 73.4,
                dilutedEPS: 73.1,
                ebitda: 1_338_000_000_000,
              },
            ],
          },
          incomeStatementHistoryQuarterly: {
            incomeStatementHistory: [
              {
                endDate: "2025-12-31",
                currencyCode: "INR",
                totalRevenue: 2_510_000_000_000,
                costOfRevenue: 1_560_000_000_000,
                grossProfit: 950_000_000_000,
                totalOperatingExpenses: 632_000_000_000,
                operatingIncome: 318_000_000_000,
                interestExpense: 36_000_000_000,
                incomeBeforeTax: 201_000_000_000,
                incomeTaxExpense: 51_000_000_000,
                netIncome: 150_000_000_000,
                netIncomeApplicableToCommonShares: 149_000_000_000,
                basicEPS: 22.05,
                dilutedEPS: 21.98,
                ebitda: 392_000_000_000,
              },
              {
                endDate: "2025-09-30",
                currencyCode: "INR",
                totalRevenue: 2_420_000_000_000,
                costOfRevenue: 1_519_000_000_000,
                grossProfit: 901_000_000_000,
                totalOperatingExpenses: null,
                operatingIncome: 299_000_000_000,
                interestExpense: 34_000_000_000,
                incomeBeforeTax: 194_000_000_000,
                incomeTaxExpense: 49_000_000_000,
                netIncome: 145_000_000_000,
                netIncomeApplicableToCommonShares: 144_500_000_000,
                basicEPS: 21.38,
                dilutedEPS: 21.29,
                ebitda: 384_000_000_000,
              },
            ],
          },
          balanceSheetHistory: {
            balanceSheetStatements: [
              {
                endDate: "2025-03-31",
                currencyCode: "INR",
                totalAssets: 17_380_000_000_000,
                totalLiab: 8_920_000_000_000,
                totalStockholderEquity: 8_460_000_000_000,
                totalCurrentAssets: 5_110_000_000_000,
                totalCurrentLiabilities: 3_940_000_000_000,
                cashAndCashEquivalents: 1_140_000_000_000,
                inventory: 1_250_000_000_000,
                netReceivables: 864_000_000_000,
                accountsPayable: 721_000_000_000,
                shortTermDebt: 410_000_000_000,
                longTermDebt: 2_640_000_000_000,
                netDebt: 1_910_000_000_000,
              },
              {
                endDate: "2024-03-31",
                currencyCode: "INR",
                totalAssets: 16_650_000_000_000,
                totalLiab: 8_580_000_000_000,
                totalStockholderEquity: 8_070_000_000_000,
                totalCurrentAssets: 4_840_000_000_000,
                totalCurrentLiabilities: 3_690_000_000_000,
                cashAndCashEquivalents: 1_040_000_000_000,
                inventory: 1_190_000_000_000,
                netReceivables: 821_000_000_000,
                accountsPayable: 688_000_000_000,
                shortTermDebt: 388_000_000_000,
                longTermDebt: 2_590_000_000_000,
                netDebt: 1_938_000_000_000,
              },
            ],
          },
          balanceSheetHistoryQuarterly: {
            balanceSheetStatements: [
              {
                endDate: "2025-12-31",
                currencyCode: "INR",
                totalAssets: 17_920_000_000_000,
                totalLiab: 9_160_000_000_000,
                totalStockholderEquity: 8_760_000_000_000,
                totalCurrentAssets: 5_300_000_000_000,
                totalCurrentLiabilities: 4_050_000_000_000,
                cashAndCashEquivalents: 1_180_000_000_000,
                inventory: 1_280_000_000_000,
                netReceivables: 874_000_000_000,
                accountsPayable: 734_000_000_000,
                shortTermDebt: 421_000_000_000,
                longTermDebt: 2_660_000_000_000,
                netDebt: 1_901_000_000_000,
              },
              {
                endDate: "2025-09-30",
                currencyCode: "INR",
                totalAssets: 17_740_000_000_000,
                totalLiab: 9_090_000_000_000,
                totalStockholderEquity: 8_650_000_000_000,
                totalCurrentAssets: 5_240_000_000_000,
                totalCurrentLiabilities: 4_020_000_000_000,
                cashAndCashEquivalents: 1_165_000_000_000,
                inventory: 1_271_000_000_000,
                netReceivables: null,
                accountsPayable: 729_000_000_000,
                shortTermDebt: 418_000_000_000,
                longTermDebt: 2_651_000_000_000,
                netDebt: 1_904_000_000_000,
              },
            ],
          },
          cashflowStatementHistory: {
            cashflowStatements: [
              {
                endDate: "2025-03-31",
                currencyCode: "INR",
                totalCashFromOperatingActivities: 1_084_000_000_000,
                totalCashflowsFromInvestingActivities: -812_000_000_000,
                totalCashFromFinancingActivities: -155_000_000_000,
                capitalExpenditures: -654_000_000_000,
                freeCashFlow: 430_000_000_000,
                dividendsPaid: -96_000_000_000,
                stockBasedCompensation: 8_500_000_000,
                depreciationAndAmortization: 278_000_000_000,
                beginningCashPosition: 1_012_000_000_000,
                endCashPosition: 1_129_000_000_000,
              },
              {
                endDate: "2024-03-31",
                currencyCode: "INR",
                totalCashFromOperatingActivities: 998_000_000_000,
                totalCashflowsFromInvestingActivities: -774_000_000_000,
                totalCashFromFinancingActivities: -142_000_000_000,
                capitalExpenditures: -623_000_000_000,
                freeCashFlow: 375_000_000_000,
                dividendsPaid: -91_000_000_000,
                stockBasedCompensation: 8_100_000_000,
                depreciationAndAmortization: 264_000_000_000,
                beginningCashPosition: 944_000_000_000,
                endCashPosition: 1_012_000_000_000,
              },
            ],
          },
          cashflowStatementHistoryQuarterly: {
            cashflowStatements: [
              {
                endDate: "2025-12-31",
                currencyCode: "INR",
                totalCashFromOperatingActivities: 286_000_000_000,
                totalCashflowsFromInvestingActivities: -201_000_000_000,
                totalCashFromFinancingActivities: -42_000_000_000,
                capitalExpenditures: -165_000_000_000,
                freeCashFlow: 121_000_000_000,
                dividendsPaid: -25_000_000_000,
                stockBasedCompensation: 2_200_000_000,
                depreciationAndAmortization: 71_000_000_000,
                beginningCashPosition: 1_103_000_000_000,
                endCashPosition: 1_121_000_000_000,
              },
              {
                endDate: "2025-09-30",
                currencyCode: "INR",
                totalCashFromOperatingActivities: 271_000_000_000,
                totalCashflowsFromInvestingActivities: -214_000_000_000,
                totalCashFromFinancingActivities: -38_000_000_000,
                capitalExpenditures: null,
                freeCashFlow: 103_000_000_000,
                dividendsPaid: -24_000_000_000,
                stockBasedCompensation: 2_100_000_000,
                depreciationAndAmortization: 69_000_000_000,
                beginningCashPosition: 1_084_000_000_000,
                endCashPosition: 1_103_000_000_000,
              },
            ],
          },
        },
      ],
      error: null,
    },
  };
}

function buildRelianceHistoricalPayload() {
  const timestamps = RELIANCE_DRY_RUN_DATES.map((date) => unixSecondsForIstDate(date));
  return {
    chart: {
      result: [
        {
          meta: {
            currency: "INR",
            symbol: "RELIANCE.NS",
            exchangeName: "NSI",
            instrumentType: "EQUITY",
            firstTradeDate: timestamps[0],
            regularMarketTime: timestamps[timestamps.length - 1],
            gmtoffset: 19800,
            timezone: "IST",
            exchangeTimezoneName: "Asia/Kolkata",
            regularMarketPrice: RELIANCE_HISTORICAL_ROWS[RELIANCE_HISTORICAL_ROWS.length - 1]?.close ?? null,
          },
          timestamp: timestamps,
          indicators: {
            quote: [
              {
                open: RELIANCE_HISTORICAL_ROWS.map((row) => row.open),
                high: RELIANCE_HISTORICAL_ROWS.map((row) => row.high),
                low: RELIANCE_HISTORICAL_ROWS.map((row) => row.low),
                close: RELIANCE_HISTORICAL_ROWS.map((row) => row.close),
                volume: RELIANCE_HISTORICAL_ROWS.map((row) => row.volume),
              },
            ],
            adjclose: [
              {
                adjclose: RELIANCE_HISTORICAL_ROWS.map((row) => row.adjClose),
              },
            ],
          },
          events: {
            dividends: {
              [String(unixSecondsForIstDate("2026-04-24"))]: {
                amount: 5.5,
                date: unixSecondsForIstDate("2026-04-24"),
              },
            },
            splits: {},
          },
        },
      ],
      error: null,
    },
  };
}

function patchFixtureYahooSymbol<T>(value: T, yahooSymbol: string): T {
  if (yahooSymbol === "RELIANCE.NS") {
    return value;
  }

  const replaceValue = (input: unknown): unknown => {
    if (typeof input === "string") {
      return input === "RELIANCE.NS" ? yahooSymbol : input;
    }
    if (Array.isArray(input)) {
      return input.map((item) => replaceValue(item));
    }
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>).map(([key, item]) => [
          key,
          replaceValue(item),
        ]),
      );
    }
    return input;
  };

  return replaceValue(value) as T;
}

export function getYahooDryRunFixture(input: {
  yahooSymbol: string;
  requestType: YahooDryRunRequestType;
  modules?: string[];
}) {
  const yahooSymbol = cleanString(input.yahooSymbol, 120).toUpperCase();

  const baseFixture = {
    fixtureName: "reliance",
    responseStatus: 200,
    responseHeaders: {
      "x-riddra-dry-run": "true",
      "x-riddra-dry-run-fixture": "reliance",
    },
  } satisfies Omit<YahooDryRunFixture, "payload">;

  if (input.requestType === "quote_latest") {
    return {
      ...baseFixture,
      payload: patchFixtureYahooSymbol(buildRelianceQuoteLatestPayload(), yahooSymbol),
    } satisfies YahooDryRunFixture;
  }

  if (input.requestType === "historical_prices") {
    return {
      ...baseFixture,
      payload: patchFixtureYahooSymbol(buildRelianceHistoricalPayload(), yahooSymbol),
    } satisfies YahooDryRunFixture;
  }

  if (
    input.requestType === "quote_summary" ||
    input.requestType === "financial_statements"
  ) {
    return {
      ...baseFixture,
      payload: patchFixtureYahooSymbol(buildRelianceQuoteSummaryPayload(), yahooSymbol),
    } satisfies YahooDryRunFixture;
  }

  throw new Error(
    `Dry-run fixtures are not defined for request type "${input.requestType}" (${input.modules?.join(",") ?? "no modules"}).`,
  );
}
