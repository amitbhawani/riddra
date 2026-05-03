import {
  runYahooHistoricalOhlcvImport,
  runYahooHistoricalOhlcvImportBatch,
} from "../lib/yahoo-finance-import.ts";

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseArgs(argv) {
  const config = {
    period: "max",
    interval: "1d",
    duplicateMode: "replace_matching_dates",
    actorEmail:
      cleanString(
        process.env.YAHOO_IMPORT_ACTOR_EMAIL ??
          process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
          "Yahoo Historical Import Script",
      ) || "Yahoo Historical Import Script",
    stocks: [],
  };

  for (const token of argv) {
    if (token.startsWith("--period=")) {
      config.period = cleanString(token.slice("--period=".length)) || "max";
      continue;
    }
    if (token.startsWith("--interval=")) {
      config.interval = cleanString(token.slice("--interval=".length)) || "1d";
      continue;
    }
    if (token.startsWith("--duplicate-mode=")) {
      const duplicateMode = cleanString(token.slice("--duplicate-mode=".length));
      config.duplicateMode =
        duplicateMode === "skip_existing_dates" ? "skip_existing_dates" : "replace_matching_dates";
      continue;
    }
    if (token.startsWith("--actor-email=")) {
      config.actorEmail =
        cleanString(token.slice("--actor-email=".length)) || config.actorEmail;
      continue;
    }

    const [symbolToken, stockIdToken] = token.split(":");
    const yahooSymbol = cleanString(symbolToken).toUpperCase();
    if (yahooSymbol) {
      config.stocks.push({
        yahooSymbol,
        stockId: cleanString(stockIdToken) || null,
      });
    }
  }

  if (!config.stocks.length) {
    config.stocks.push({
      yahooSymbol: "RELIANCE.NS",
      stockId: null,
    });
  }

  return config;
}

async function main() {
  const config = parseArgs(process.argv.slice(2));

  if (config.stocks.length === 1) {
    const stock = config.stocks[0];
    const result = await runYahooHistoricalOhlcvImport({
      yahooSymbol: stock.yahooSymbol,
      stockId: stock.stockId,
      actorEmail: config.actorEmail,
      period: config.period,
      interval: config.interval,
      duplicateMode: config.duplicateMode,
    });

    console.log(
      JSON.stringify(
        {
          requestedCount: 1,
          completedCount: 1,
          failedCount: 0,
          result,
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await runYahooHistoricalOhlcvImportBatch({
    stocks: config.stocks,
    actorEmail: config.actorEmail,
    period: config.period,
    interval: config.interval,
    duplicateMode: config.duplicateMode,
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.failedCount > 0 && result.completedCount === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[import-yahoo-historical] failed", error);
  process.exitCode = 1;
});
