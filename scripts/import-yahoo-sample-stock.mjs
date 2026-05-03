import { runYahooFinanceSampleStockImport } from "../lib/yahoo-finance-import.ts";

const yahooSymbol = (process.argv[2] ?? "RELIANCE.NS").trim().toUpperCase();
const actorEmail =
  (process.env.YAHOO_IMPORT_ACTOR_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "Yahoo Import Script")
    .trim();

async function main() {
  const result = await runYahooFinanceSampleStockImport({
    yahooSymbol,
    actorEmail,
    executionMode: "import_valid_rows",
    duplicateMode: "replace_matching_dates",
    historyRange: "1mo",
  });

  console.log(
    JSON.stringify(
      {
        yahooSymbol,
        jobId: result.jobId,
        jobStatus: result.jobStatus,
        stock: result.stock,
        rawImportCount: result.rawImportCount,
        warnings: result.warnings,
        marketDataImportBatchId: result.marketDataImport?.batch.id ?? null,
        marketDataImportStatus: result.marketDataImport?.batch.status ?? null,
        bucketResults: result.bucketResults,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[import-yahoo-sample-stock] failed", error);
  process.exitCode = 1;
});
