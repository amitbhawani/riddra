import type { NextRequest } from "next/server";

import { runMarketNewsIngestion } from "@/lib/market-news/ingest";
import {
  createMarketNewsIngestionRun,
  finalizeMarketNewsIngestionRun,
  findRecentInProgressMarketNewsIngestionRun,
  logSkippedMarketNewsIngestionRun,
} from "@/lib/market-news/queries";
import { runMarketNewsRewrite } from "@/lib/market-news/rewrite";
import { loadMarketNewsSourceRegistry } from "@/lib/market-news/sources";

export const MARKET_NEWS_RUN_LOCK_WINDOW_MINUTES = 10;

export function getConfiguredMarketNewsSecret() {
  return process.env.MARKET_NEWS_CRON_SECRET?.trim() ?? "";
}

export function getProvidedMarketNewsSecret(
  request: Pick<NextRequest, "headers">,
) {
  const headerSecret = request.headers.get("x-cron-secret")?.trim();

  if (headerSecret) {
    return headerSecret;
  }

  const authorization = request.headers.get("authorization")?.trim();

  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

export function isAuthorizedMarketNewsRunRequest(
  request: Pick<NextRequest, "headers">,
) {
  const configuredSecret = getConfiguredMarketNewsSecret();

  if (!configuredSecret) {
    return false;
  }

  return getProvidedMarketNewsSecret(request) === configuredSecret;
}

export function parseMarketNewsRunLimit(request: Pick<NextRequest, "nextUrl">) {
  const rawValue = request.nextUrl.searchParams.get("limit");
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

export function parseMarketNewsRetryFailed(request: Pick<NextRequest, "nextUrl">) {
  const rawValue = request.nextUrl.searchParams.get("retryFailed")?.trim().toLowerCase();
  return rawValue === "true" || rawValue === "1" || rawValue === "yes";
}

export async function executeMarketNewsRun(input: {
  limit: number;
  retryFailed: boolean;
}) {
  const startedAt = new Date().toISOString();
  const registry = await loadMarketNewsSourceRegistry();
  const lockSourceId = registry.sources[0]?.id ?? null;

  if (!lockSourceId) {
    return {
      ok: false,
      skipped: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: "No enabled market news sources are available for automation.",
      ingestion: {
        ok: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        sources: [] as Array<{
          source: string;
          status: string;
          fetched: number;
          inserted: number;
          duplicates: number;
          failed: number;
          error: string | null;
        }>,
      },
      rewrite: {
        ok: false,
        processed: 0,
        created: 0,
        rejected: 0,
        failed: 0,
        articles: [] as Awaited<ReturnType<typeof runMarketNewsRewrite>>["articles"],
      },
      processed: 0,
      created: 0,
      rejected: 0,
      failed: 0,
    };
  }

  const recentRun = await findRecentInProgressMarketNewsIngestionRun(
    MARKET_NEWS_RUN_LOCK_WINDOW_MINUTES,
  );

  if (recentRun) {
    const finishedAt = new Date().toISOString();
    const skipReason = `Skipped overlapping market news run because ${recentRun.id} started at ${recentRun.started_at} and is still in progress.`;
    const skippedRun = await logSkippedMarketNewsIngestionRun(recentRun.source_id, skipReason);

    return {
      ok: true,
      skipped: true,
      reason: skipReason,
      startedAt,
      finishedAt,
      lockWindowMinutes: MARKET_NEWS_RUN_LOCK_WINDOW_MINUTES,
      activeRunId: recentRun.id,
      skippedRunId: skippedRun.id,
      ingestion: {
        ok: true,
        startedAt,
        finishedAt,
        sources: [] as Array<{
          source: string;
          status: string;
          fetched: number;
          inserted: number;
          duplicates: number;
          failed: number;
          error: string | null;
        }>,
      },
      rewrite: {
        ok: true,
        processed: 0,
        created: 0,
        rejected: 0,
        failed: 0,
        articles: [] as Awaited<ReturnType<typeof runMarketNewsRewrite>>["articles"],
      },
      processed: 0,
      created: 0,
      rejected: 0,
      failed: 0,
    };
  }

  const pipelineRun = await createMarketNewsIngestionRun(lockSourceId, "pipeline_running");

  let ingestionError: string | null = null;
  let ingestionResult: Awaited<ReturnType<typeof runMarketNewsIngestion>> | null = null;

  try {
    ingestionResult = await runMarketNewsIngestion();
  } catch (error) {
    ingestionError =
      error instanceof Error ? error.message : "Unknown market news ingestion failure";
  }

  let rewriteError: string | null = null;
  let rewriteResult: Awaited<ReturnType<typeof runMarketNewsRewrite>> | null = null;

  try {
    rewriteResult = await runMarketNewsRewrite({
      limit: input.limit,
      retryFailed: input.retryFailed,
    });
  } catch (error) {
    rewriteError =
      error instanceof Error ? error.message : "Unknown market news rewrite failure";
  }

  const finishedAt = new Date().toISOString();
  const ingestionFetchedCount =
    ingestionResult?.sources.reduce((total, source) => total + source.fetched, 0) ?? 0;
  const ingestionInsertedCount =
    ingestionResult?.sources.reduce((total, source) => total + source.inserted, 0) ?? 0;
  const ingestionDuplicateCount =
    ingestionResult?.sources.reduce((total, source) => total + source.duplicates, 0) ?? 0;
  const ingestionFailedCount =
    (ingestionResult?.sources.reduce((total, source) => total + source.failed, 0) ?? 0) +
    (rewriteResult?.failed ?? 0);
  const pipelineStatus =
    ingestionError || rewriteError
      ? "failed"
      : (ingestionResult?.sources.some((source) => source.status !== "success") ?? false) ||
          (rewriteResult?.failed ?? 0) > 0
        ? "partial"
        : "success";
  const pipelineErrorMessage =
    [ingestionError, rewriteError].filter(Boolean).join(" | ") || null;

  await finalizeMarketNewsIngestionRun(pipelineRun.id, {
    finished_at: finishedAt,
    status: pipelineStatus,
    fetched_count: ingestionFetchedCount,
    inserted_count: ingestionInsertedCount,
    duplicate_count: ingestionDuplicateCount,
    failed_count: ingestionFailedCount,
    error_message: pipelineErrorMessage,
  });

  return {
    ok: !ingestionError && !rewriteError,
    skipped: false,
    startedAt,
    finishedAt,
    ingestion: ingestionResult
      ? {
          ok: true,
          startedAt: ingestionResult.startedAt,
          finishedAt: ingestionResult.finishedAt,
          sources: ingestionResult.sources.map((source) => ({
            source: source.source,
            status: source.status,
            fetched: source.fetched,
            inserted: source.inserted,
            duplicates: source.duplicates,
            failed: source.failed,
            error: source.error,
          })),
        }
      : {
          ok: false,
          startedAt,
          finishedAt,
          sources: [] as Array<{
            source: string;
            status: string;
            fetched: number;
            inserted: number;
            duplicates: number;
            failed: number;
            error: string | null;
          }>,
          error: ingestionError,
        },
    rewrite: rewriteResult
      ? {
          ok: true,
          processed: rewriteResult.processed,
          created: rewriteResult.created,
          rejected: rewriteResult.rejected,
          failed: rewriteResult.failed,
          articles: rewriteResult.articles,
        }
      : {
          ok: false,
          processed: 0,
          created: 0,
          rejected: 0,
          failed: 0,
          articles: [] as Awaited<ReturnType<typeof runMarketNewsRewrite>>["articles"],
          error: rewriteError,
        },
    processed: rewriteResult?.processed ?? 0,
    created: rewriteResult?.created ?? 0,
    rejected: rewriteResult?.rejected ?? 0,
    failed: rewriteResult?.failed ?? 0,
  };
}
