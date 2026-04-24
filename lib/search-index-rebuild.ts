import { getSearchIndexMemory, saveSearchIndexLane } from "@/lib/search-index-memory-store";
import { rebuildSearchEngineIndex } from "@/lib/search-engine/meilisearch";
import { getSearchQueryMemory } from "@/lib/search-query-memory-store";
import { getSearchQueryReviewMemory } from "@/lib/search-query-review-store";

export async function rebuildSearchIndexMemory() {
  const [memory, rebuild, queryMemory, reviewMemory] = await Promise.all([
    getSearchIndexMemory(),
    rebuildSearchEngineIndex(),
    getSearchQueryMemory(),
    getSearchQueryReviewMemory(),
  ]);

  await Promise.all(
    memory.lanes.map((lane) => {
      if (lane.lane === "Canonical route index") {
        return saveSearchIndexLane({
          lane: lane.lane,
          status: reviewMemory.summary.openReviews > 0 ? "In progress" : "Ready",
          indexedRecords: rebuild.summary.totalDocuments,
          aliasGroups: Math.max(rebuild.summary.aliasGroups, queryMemory.summary.guidedHandoffs + reviewMemory.summary.totalReviews),
          typoProtectedRoutes: Math.max(rebuild.summary.typoProtectedRoutes, rebuild.summary.compareDocuments),
          filterCoverage: `${rebuild.indexedDocuments} Meilisearch documents are live across ${rebuild.summary.assetDocuments} asset routes, ${rebuild.summary.compareDocuments} compare routes, and ${rebuild.summary.workflowDocuments} workflow or learn routes after the latest ${rebuild.usedSwapRebuild ? "swap-based" : "direct"} rebuild.`,
          nextStep:
            reviewMemory.summary.openReviews > 0
              ? `Resolve ${reviewMemory.summary.openReviews} open query-review rows before the next synonym or route-priority adjustment wave.`
              : "Canonical route coverage is rebuilt into the live Meilisearch index and ready for the next content-import wave.",
        });
      }

      if (lane.lane === "Asset and compare alias graph") {
        return saveSearchIndexLane({
          lane: lane.lane,
          status: queryMemory.summary.zeroResultQueries > 0 ? "In progress" : "Ready",
          indexedRecords: rebuild.summary.assetDocuments + rebuild.summary.compareDocuments,
          aliasGroups: Math.max(rebuild.summary.aliasGroups, queryMemory.summary.guidedHandoffs + reviewMemory.summary.readyReviews),
          typoProtectedRoutes: Math.max(rebuild.summary.typoProtectedRoutes, queryMemory.summary.focusCardHits),
          filterCoverage: `${queryMemory.summary.trackedQueries} tracked queries and ${reviewMemory.summary.totalReviews} review rows now influence aliases, synonyms, and compare edges inside the live Meilisearch document graph.`,
          nextStep:
            queryMemory.summary.zeroResultQueries > 0
              ? `Reduce ${queryMemory.summary.zeroResultQueries} zero-result runs or map them into owned review rows.`
              : "Alias and synonym coverage is stable enough for the next indexed content wave.",
        });
      }

      return saveSearchIndexLane({
        lane: lane.lane,
        status: reviewMemory.summary.totalReviews > 0 ? "In progress" : lane.status,
        indexedRecords: Math.max(rebuild.summary.workflowDocuments, lane.indexedRecords),
        aliasGroups: lane.aliasGroups,
        typoProtectedRoutes: lane.typoProtectedRoutes,
        filterCoverage: `${lane.filterCoverage} The latest durable rebuild also confirmed workflow-route coverage inside the live Meilisearch index.`,
        nextStep:
          reviewMemory.summary.totalReviews > 0
            ? `Turn ${reviewMemory.summary.totalReviews} review rows into durable filter or alias work before the next rebuild.`
            : lane.nextStep,
      });
    }),
  );

  return getSearchIndexMemory();
}
