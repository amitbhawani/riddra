import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import { getSearchEngineStatus } from "@/lib/search-engine/meilisearch";

export async function POST() {
  const user = await requireAdmin();
  const durableJobs = getDurableJobSystemReadiness();
  const searchEngine = await getSearchEngineStatus();

  if (!durableJobs.configured) {
    return NextResponse.json(
      {
        error: "Trigger.dev is not configured for durable search rebuild jobs yet.",
        durableJobs,
      },
      { status: 503 },
    );
  }

  const handle = await queueDurableJob({
    taskId: "search-index-rebuild",
    payload: {
      requestedBy: user.email ?? "local-preview-user",
      source: "admin_search_truth",
    },
    idempotencyKey: `search-index-rebuild:${new Date().toISOString()}`,
    tags: ["durable-job", "search", "index-rebuild", "admin"],
    metadata: {
      routeTarget: "/api/admin/search-index/rebuild",
      requestedBy: user.email ?? "local-preview-user",
    },
  });

  return NextResponse.json({
    ok: true,
    job: {
      id: handle.id,
      taskId: "search-index-rebuild",
    },
    durableJobs,
    searchEngine,
    delivery: {
      status: searchEngine.configured && searchEngine.healthy ? "queued" : "queued_with_degraded_engine",
      detail:
        searchEngine.configured && searchEngine.healthy
          ? "The Meilisearch rebuild was queued into Trigger.dev."
          : "The rebuild was queued into Trigger.dev, but the current Meilisearch state is degraded. The durable run will fail honestly until the engine is healthy.",
    },
  });
}
