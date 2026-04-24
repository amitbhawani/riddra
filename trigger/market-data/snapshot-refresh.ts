import { logger, task } from "@trigger.dev/sdk/v3";

import { runMarketDataSnapshotRefresh } from "@/lib/market-data-refresh";

export const marketDataSnapshotRefreshTask = task({
  id: "market-data-snapshot-refresh",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: false,
  },
  run: async (payload: { requestedBy: string; source: string }) => {
    logger.info("Starting market-data snapshot refresh task", payload);
    const result = await runMarketDataSnapshotRefresh();
    logger.info("Completed market-data snapshot refresh task", {
      requestedBy: payload.requestedBy,
      source: payload.source,
      inserted:
        result.insertedQuoteSnapshots +
        result.insertedChartSnapshots +
        result.insertedFundSnapshots +
        result.insertedIndexSnapshots,
      writtenChartBars: result.writtenChartBars,
      sourceMode: result.sourceMode,
    });

    return {
      requestedBy: payload.requestedBy,
      source: payload.source,
      result,
    };
  },
});
