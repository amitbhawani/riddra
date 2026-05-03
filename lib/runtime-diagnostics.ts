import { getDurableJobSystemReadiness, listDurableJobRuns } from "@/lib/durable-jobs";
import { getHostedRuntimeRequirements } from "@/lib/runtime-launch-config";
import { getMarketDataRefreshProofStatus, getMarketDataRefreshReadiness } from "@/lib/market-data-refresh";
import { getSearchEngineStatus } from "@/lib/search-engine/meilisearch";
import { getSupabaseDurabilityCheck } from "@/lib/supabase-durability-check";

export type RuntimeDiagnosticStatus = "healthy" | "degraded" | "failed";
const DIAGNOSTIC_TIMEOUT_MS = 4_000;

export type RuntimeDiagnosticCheck = {
  key: "supabase" | "trigger" | "meilisearch" | "market_data";
  label: string;
  status: RuntimeDiagnosticStatus;
  summary: string;
  detail: string;
  missingEnv: string[];
  latestSignal: string | null;
  structuredState?: Record<string, string | boolean | number | null>;
};

export type RuntimeDiagnosticsSnapshot = {
  generatedAt: string;
  overallStatus: RuntimeDiagnosticStatus;
  checks: RuntimeDiagnosticCheck[];
};

type PublicHealthCheck = Pick<RuntimeDiagnosticCheck, "key" | "label" | "status" | "summary">;

export type PublicRuntimeHealthSnapshot = {
  ok: boolean;
  status: RuntimeDiagnosticStatus;
  service: string;
  phase: string;
  generatedAt: string;
  checks: PublicHealthCheck[];
};

function sanitizeDetail(detail: string | null | undefined) {
  if (!detail) {
    return "";
  }

  return detail
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]{10,}/g, "[redacted-token]")
    .replace(/https?:\/\/[^\s]+/gi, "[redacted-url]")
    .trim();
}

function deriveOverallStatus(checks: RuntimeDiagnosticCheck[]): RuntimeDiagnosticStatus {
  if (checks.some((item) => item.status === "failed")) {
    return "failed";
  }

  if (checks.some((item) => item.status === "degraded")) {
    return "degraded";
  }

  return "healthy";
}

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), DIAGNOSTIC_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function getRuntimeDiagnosticsSnapshot(): Promise<RuntimeDiagnosticsSnapshot> {
  const hostedRequirements = getHostedRuntimeRequirements();
  const [supabaseDurability, searchStatus, marketDataRuns, durableJobRuns] = await Promise.all([
    withTimeout(
      getSupabaseDurabilityCheck(),
      {
        configured: false,
        connectionError: "Supabase diagnostics timed out.",
        status: "Blocked" as const,
        groups: [],
        missingTables: [],
        migrationOrder: [],
      },
    ),
    withTimeout(
      getSearchEngineStatus(),
      {
        configured: false,
        host: null,
        indexUid: "riddra_search",
        indexPrefix: "riddra",
        healthy: false,
        indexPresent: false,
        indexedDocuments: 0,
        lastUpdate: null,
        message: "Meilisearch diagnostics timed out.",
        fallbackActive: true,
        lastSearchError: "Meilisearch diagnostics timed out.",
      },
    ),
    withTimeout(
      listDurableJobRuns({ family: "market_data", limit: 5 }),
      {
        configured: false,
        error: "Market-data durable-job diagnostics timed out.",
        items: [],
        summary: {
          total: 0,
          queued: 0,
          running: 0,
          succeeded: 0,
          failed: 0,
        },
      },
    ),
    withTimeout(
      listDurableJobRuns({ limit: 5 }),
      {
        configured: false,
        error: "Trigger.dev run-history diagnostics timed out.",
        items: [],
        summary: {
          total: 0,
          queued: 0,
          running: 0,
          succeeded: 0,
          failed: 0,
        },
      },
    ),
  ]);

  const triggerReadiness = getDurableJobSystemReadiness();
  const marketDataReadiness = getMarketDataRefreshReadiness();
  const marketDataProof = getMarketDataRefreshProofStatus();
  const latestMarketDataRun = marketDataRuns.items[0] ?? null;

  const checks: RuntimeDiagnosticCheck[] = [
    {
      key: "supabase",
      label: "Supabase",
      status:
        hostedRequirements.missingSupabasePublic.length > 0 ||
        hostedRequirements.missingSupabaseAdmin.length > 0 ||
        supabaseDurability.connectionError
          ? "failed"
          : supabaseDurability.missingTables.length > 0
            ? "degraded"
            : "healthy",
      summary:
        hostedRequirements.missingSupabasePublic.length > 0 ||
        hostedRequirements.missingSupabaseAdmin.length > 0
          ? "Critical Supabase env is missing."
          : supabaseDurability.connectionError
            ? "Supabase admin checks cannot reach the durable schema."
            : supabaseDurability.missingTables.length > 0
              ? `${supabaseDurability.missingTables.length} durable tables are still missing.`
              : "Supabase auth and admin durability look healthy.",
      detail:
        hostedRequirements.missingSupabasePublic.length > 0 ||
        hostedRequirements.missingSupabaseAdmin.length > 0
          ? `Missing env: ${[
              ...hostedRequirements.missingSupabasePublic,
              ...hostedRequirements.missingSupabaseAdmin,
            ].join(", ")}`
          : supabaseDurability.connectionError
            ? sanitizeDetail(supabaseDurability.connectionError)
            : supabaseDurability.missingTables.length > 0
              ? `Missing durable tables: ${supabaseDurability.missingTables.join(", ")}`
              : "Durable schema checks passed with all required tables visible.",
      missingEnv: Array.from(
        new Set([
          ...hostedRequirements.missingSupabasePublic,
          ...hostedRequirements.missingSupabaseAdmin,
        ]),
      ),
      latestSignal:
        supabaseDurability.connectionError ??
        (supabaseDurability.missingTables.length > 0
          ? `Missing: ${supabaseDurability.missingTables.join(", ")}`
          : "Durable schema visible"),
    },
    {
      key: "trigger",
      label: "Trigger.dev",
      status:
        !triggerReadiness.configured
          ? "failed"
          : durableJobRuns.error
            ? "degraded"
            : "healthy",
      summary:
        !triggerReadiness.configured
          ? "Trigger.dev runtime is missing critical configuration."
          : durableJobRuns.error
            ? "Trigger.dev is configured, but run history is not healthy."
            : "Trigger.dev auth and run history are reachable.",
      detail:
        !triggerReadiness.configured
          ? `Missing env: ${hostedRequirements.missingTrigger.join(", ")}`
          : durableJobRuns.error
            ? sanitizeDetail(durableJobRuns.error)
            : `Recent durable jobs: ${durableJobRuns.summary.succeeded} succeeded, ${durableJobRuns.summary.failed} failed, ${durableJobRuns.summary.running} running.`,
      missingEnv: hostedRequirements.missingTrigger,
      latestSignal:
        durableJobRuns.error ??
        (durableJobRuns.items[0]
          ? `${durableJobRuns.items[0].label}: ${durableJobRuns.items[0].status}`
          : "No durable runs recorded yet"),
    },
    {
      key: "meilisearch",
      label: "Meilisearch",
      status:
        !searchStatus.configured || !searchStatus.healthy
          ? "failed"
          : !searchStatus.indexPresent || searchStatus.indexedDocuments <= 0
            ? "degraded"
            : "healthy",
      summary:
        !searchStatus.configured
          ? "Search engine env is missing."
          : !searchStatus.healthy
            ? "Search engine is not healthy."
            : !searchStatus.indexPresent || searchStatus.indexedDocuments <= 0
              ? "Search engine is up, but the index is not ready."
              : "Meilisearch is healthy and serving an indexed catalog.",
      detail:
        !searchStatus.configured
          ? `Missing env: ${hostedRequirements.missingMeilisearch.join(", ")}`
          : sanitizeDetail(
              searchStatus.message ??
                `${searchStatus.indexedDocuments} documents indexed in ${searchStatus.indexUid}.`,
            ),
      missingEnv: hostedRequirements.missingMeilisearch,
      latestSignal:
        searchStatus.lastUpdate ??
        (searchStatus.message ? sanitizeDetail(searchStatus.message) : null),
      structuredState: {
        meilisearch_configured: searchStatus.configured,
        fallback_active: searchStatus.fallbackActive,
        index_prefix: searchStatus.indexPrefix,
        last_search_error: searchStatus.lastSearchError
          ? sanitizeDetail(searchStatus.lastSearchError)
          : null,
      },
    },
    {
      key: "market_data",
      label: "Market-data refresh",
      status:
        marketDataProof.exactMissing.length > 0 || marketDataReadiness.mode !== "refresh_ready"
          ? "failed"
          : marketDataRuns.error || latestMarketDataRun?.status === "Failed"
            ? "degraded"
            : "healthy",
      summary:
        marketDataProof.exactMissing.length > 0 || marketDataReadiness.mode !== "refresh_ready"
          ? "Critical market-data refresh inputs are missing."
          : marketDataRuns.error
            ? "Refresh execution is configured, but worker history is unhealthy."
            : latestMarketDataRun?.status === "Failed"
              ? "Latest market-data refresh failed."
              : latestMarketDataRun?.status === "Succeeded"
                ? "Latest market-data refresh succeeded."
                : "Market-data refresh is configured and waiting for the next run.",
      detail:
        marketDataProof.exactMissing.length > 0 || marketDataReadiness.mode !== "refresh_ready"
          ? `Missing inputs: ${marketDataProof.exactMissing.join(", ")}`
          : sanitizeDetail(
              marketDataRuns.error ??
                latestMarketDataRun?.errorMessage ??
                `Source mode: ${marketDataProof.sourceLabel}. Latest run status: ${latestMarketDataRun?.status ?? "No recent run"}.`,
            ),
      missingEnv: hostedRequirements.missingMarketData,
      latestSignal:
        latestMarketDataRun?.errorMessage
          ? sanitizeDetail(latestMarketDataRun.errorMessage)
          : latestMarketDataRun
            ? `${latestMarketDataRun.label}: ${latestMarketDataRun.status}`
            : marketDataProof.sourceLabel,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: deriveOverallStatus(checks),
    checks,
  };
}

export async function getPublicRuntimeHealthSnapshot(): Promise<PublicRuntimeHealthSnapshot> {
  const diagnostics = await getRuntimeDiagnosticsSnapshot();

  return {
    ok: diagnostics.overallStatus === "healthy",
    status: diagnostics.overallStatus,
    service: "riddra-web",
    phase: "private_beta",
    generatedAt: diagnostics.generatedAt,
    checks: diagnostics.checks.map((check) => ({
      key: check.key,
      label: check.label,
      status: check.status,
      summary: check.summary,
    })),
  };
}
