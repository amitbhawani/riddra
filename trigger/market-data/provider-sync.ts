import { logger, task } from "@trigger.dev/sdk/v3";

import { runMarketDataProviderSync } from "@/lib/market-data-provider-sync";

export const marketDataProviderSyncTask = task({
  id: "market-data-provider-sync",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: false,
  },
  run: async (payload: { requestedBy: string; source: string }) => {
    logger.info("Starting market-data provider sync task", payload);
    const result = await runMarketDataProviderSync();
    logger.info("Completed market-data provider sync task", {
      requestedBy: payload.requestedBy,
      source: payload.source,
      inserted:
        result.insertedQuoteSnapshots +
        result.insertedChartSnapshots +
        result.insertedFundSnapshots +
        result.insertedIndexSnapshots,
    });

    return {
      requestedBy: payload.requestedBy,
      source: payload.source,
      result,
    };
  },
});
