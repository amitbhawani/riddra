import { runYahooQuoteStatisticsImport } from "../lib/yahoo-finance-import.ts";

const yahooSymbol = (process.argv[2] ?? "RELIANCE.NS").trim().toUpperCase();
const stockId = (process.argv[3] ?? "").trim() || null;
const actorEmail =
  (
    process.env.YAHOO_IMPORT_ACTOR_EMAIL ??
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
    "Yahoo Quote Statistics Import Script"
  ).trim();

async function main() {
  const result = await runYahooQuoteStatisticsImport({
    yahooSymbol,
    stockId,
    actorEmail,
  });

  console.log(
    JSON.stringify(
      {
        yahooSymbol,
        stockId,
        jobId: result.jobId,
        jobStatus: result.jobStatus,
        stock: result.stock,
        rawImportIds: result.rawImportIds,
        snapshotTradeDate: result.snapshotTradeDate,
        warnings: result.warnings,
        reports: result.reports,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[import-yahoo-quote-stats] failed", error);
  process.exitCode = 1;
});
