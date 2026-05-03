import {
  controlYahooStockBatchImportJob,
  createYahooStockBatchImportJob,
  getYahooStockBatchImportReport,
  runYahooStockBatchImportUntilComplete,
  runYahooStockBatchImportWorker,
} from "../lib/yahoo-finance-batch-import.ts";

function parseArgs(argv) {
  const parsed = {
    command: "run",
    stocks: [],
    modules: [],
    jobId: "",
    importOnlyMissingData: true,
    duplicateMode: "skip_existing_dates",
    maxItemsPerRun: 10,
    runUntilComplete: true,
  };

  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const [flag, inlineValue] = token.split("=", 2);
    const value = inlineValue ?? argv[index + 1] ?? "";
    if (!inlineValue) {
      index += 1;
    }

    if (flag === "--stocks") {
      parsed.stocks = String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (flag === "--modules") {
      parsed.modules = String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (flag === "--job") {
      parsed.jobId = String(value).trim();
    } else if (flag === "--duplicate-mode") {
      parsed.duplicateMode = String(value).trim() || "skip_existing_dates";
    } else if (flag === "--max-items") {
      parsed.maxItemsPerRun = Number(value) || 10;
    } else if (flag === "--run-until-complete") {
      parsed.runUntilComplete = String(value).trim() !== "false";
    } else if (flag === "--import-only-missing-data") {
      parsed.importOnlyMissingData = String(value).trim() !== "false";
    }
  }

  if (positional.length > 0) {
    parsed.command = positional[0];
  }

  return parsed;
}

function printUsage() {
  console.log(`
Usage:
  npm run yahoo:batch -- --stocks RELIANCE.NS,TATAMOTORS.NS
  npm run yahoo:batch -- create --stocks RELIANCE.NS,INFY.NS --modules historical_prices,quote_statistics
  npm run yahoo:batch -- run --job <job-id> --max-items 10
  npm run yahoo:batch -- pause --job <job-id>
  npm run yahoo:batch -- resume --job <job-id>
  npm run yahoo:batch -- retry --job <job-id>
  npm run yahoo:batch -- stop --job <job-id>
  npm run yahoo:batch -- report --job <job-id>
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help" || args.command === "--help") {
    printUsage();
    return;
  }

  if (args.command === "report") {
    if (!args.jobId) {
      throw new Error("Add --job <job-id> to view a batch report.");
    }
    const report = await getYahooStockBatchImportReport(args.jobId);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (["pause", "resume", "retry", "stop"].includes(args.command)) {
    if (!args.jobId) {
      throw new Error(`Add --job <job-id> to ${args.command} a batch job.`);
    }
    const result = await controlYahooStockBatchImportJob({
      jobId: args.jobId,
      action: args.command,
      actorEmail: "Yahoo Batch CLI",
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.command === "run") {
    if (args.jobId) {
      const result = args.runUntilComplete
        ? await runYahooStockBatchImportUntilComplete({
            jobId: args.jobId,
            actorEmail: "Yahoo Batch CLI",
            maxItemsPerRun: args.maxItemsPerRun,
          })
        : await runYahooStockBatchImportWorker({
            jobId: args.jobId,
            actorEmail: "Yahoo Batch CLI",
            maxItemsPerRun: args.maxItemsPerRun,
          });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!args.stocks.length) {
      throw new Error("Add --stocks RELIANCE.NS,TATAMOTORS.NS or pass --job <job-id>.");
    }

    const created = await createYahooStockBatchImportJob({
      stocks: args.stocks.map((symbol) => ({ yahooSymbol: symbol })),
      modules: args.modules.length ? args.modules : undefined,
      importOnlyMissingData: args.importOnlyMissingData,
      duplicateMode: args.duplicateMode,
      actorEmail: "Yahoo Batch CLI",
    });

    const result = args.runUntilComplete
      ? await runYahooStockBatchImportUntilComplete({
          jobId: created.jobId,
          actorEmail: "Yahoo Batch CLI",
          maxItemsPerRun: args.maxItemsPerRun,
        })
      : await runYahooStockBatchImportWorker({
          jobId: created.jobId,
          actorEmail: "Yahoo Batch CLI",
          maxItemsPerRun: args.maxItemsPerRun,
        });
    console.log(JSON.stringify({ created, result }, null, 2));
    return;
  }

  if (args.command === "create") {
    if (!args.stocks.length) {
      throw new Error("Add --stocks RELIANCE.NS,TATAMOTORS.NS to create a batch job.");
    }
    const created = await createYahooStockBatchImportJob({
      stocks: args.stocks.map((symbol) => ({ yahooSymbol: symbol })),
      modules: args.modules.length ? args.modules : undefined,
      importOnlyMissingData: args.importOnlyMissingData,
      duplicateMode: args.duplicateMode,
      actorEmail: "Yahoo Batch CLI",
    });
    console.log(JSON.stringify(created, null, 2));
    return;
  }

  printUsage();
  throw new Error(`Unknown command "${args.command}".`);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Yahoo batch import script failed.",
  );
  process.exit(1);
});
