import { logger, task } from "@trigger.dev/sdk/v3";

import { rebuildSearchIndexMemory } from "@/lib/search-index-rebuild";

export const searchIndexRebuildTask = task({
  id: "search-index-rebuild",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 8_000,
    randomize: false,
  },
  run: async (payload: { requestedBy: string; source: string }) => {
    logger.info("Starting search-index rebuild task", payload);
    const { memory, rebuild } = await rebuildSearchIndexMemory();
    logger.info("Completed search-index rebuild task", {
      requestedBy: payload.requestedBy,
      source: payload.source,
      indexedStockCount: rebuild.summary.stockDocuments,
      indexedRoutes: memory.summary.indexedRoutes,
      aliasGroups: memory.summary.aliasGroups,
      typoProtectedRoutes: memory.summary.typoProtectedRoutes,
      blockedBacklogLanes: memory.summary.blockedBacklogLanes,
    });

    return {
      requestedBy: payload.requestedBy,
      source: payload.source,
      indexedStockCount: rebuild.summary.stockDocuments,
      summary: memory.summary,
    };
  },
});
