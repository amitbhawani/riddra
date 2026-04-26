import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  AdminOperatorValidationError,
  sanitizeAdminFailureMessage,
} from "@/lib/admin-operator-guards";
import { requireAdmin } from "@/lib/auth";
import { testMarketNewsSource } from "@/lib/market-news/source-discovery";
import { importMarketNewsCandidateSources } from "@/lib/market-news/sources";
import {
  applyMarketNewsSourceTestResult,
  findMarketNewsSourceById,
  getAdminMarketNewsDashboardState,
  insertMarketNewsRewriteLog,
  saveMarketNewsSource,
  setMarketNewsSourceEnabled,
  softDisableMarketNewsSource,
  updateMarketNewsArticleStatus,
  updateMarketNewsRawItemStatus,
} from "@/lib/market-news/queries";
import type { MarketNewsSourceDraftInput, MarketNewsSourceRecord } from "@/lib/market-news/types";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      ok: true,
      state: await getAdminMarketNewsDashboardState(),
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const payload = (await request.json()) as {
      action?: string;
      articleId?: string;
      rawItemId?: string;
      sourceId?: string;
      source?: Partial<MarketNewsSourceDraftInput> & {
        source_type?: MarketNewsSourceRecord["source_type"];
        fetch_interval_minutes?: number | null;
      };
    };

    const action = String(payload.action ?? "").trim();

    if (!action) {
      return badRequest("Action is required.");
    }

    let responsePayload: Record<string, unknown> = {};

    if (action === "publish_article") {
      if (!payload.articleId?.trim()) {
        return badRequest("Article ID is required.");
      }

      const article = await updateMarketNewsArticleStatus({
        articleId: payload.articleId.trim(),
        status: "published",
      });

      if (!article) {
        throw new AdminOperatorValidationError("Could not find the market news article to publish.", 404);
      }

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.published",
        targetType: "market_news_article",
        targetId: article.id,
        targetFamily: null,
        targetSlug: article.slug,
        summary: `Published market news article "${article.rewritten_title || article.original_title}".`,
        metadata: {
          status: article.status,
          sourceName: article.source_name,
          internalUrl: article.internal_url,
        },
      });
    } else if (action === "unpublish_article") {
      if (!payload.articleId?.trim()) {
        return badRequest("Article ID is required.");
      }

      const article = await updateMarketNewsArticleStatus({
        articleId: payload.articleId.trim(),
        status: "ready",
      });

      if (!article) {
        throw new AdminOperatorValidationError("Could not find the market news article to unpublish.", 404);
      }

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.unpublished",
        targetType: "market_news_article",
        targetId: article.id,
        targetFamily: null,
        targetSlug: article.slug,
        summary: `Moved market news article "${article.rewritten_title || article.original_title}" back to ready state.`,
        metadata: {
          status: article.status,
          sourceName: article.source_name,
          internalUrl: article.internal_url,
        },
      });
    } else if (action === "reject_article") {
      if (!payload.articleId?.trim()) {
        return badRequest("Article ID is required.");
      }

      const article = await updateMarketNewsArticleStatus({
        articleId: payload.articleId.trim(),
        status: "rejected",
      });

      if (!article) {
        throw new AdminOperatorValidationError("Could not find the market news article to reject.", 404);
      }

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.rejected",
        targetType: "market_news_article",
        targetId: article.id,
        targetFamily: null,
        targetSlug: article.slug,
        summary: `Rejected market news article "${article.rewritten_title || article.original_title}".`,
        metadata: {
          status: article.status,
          sourceName: article.source_name,
          internalUrl: article.internal_url,
        },
      });
    } else if (action === "retry_rewrite") {
      if (!payload.rawItemId?.trim()) {
        return badRequest("Raw item ID is required.");
      }

      const rawItem = await updateMarketNewsRawItemStatus(payload.rawItemId.trim(), "new");

      await insertMarketNewsRewriteLog({
        raw_item_id: rawItem.id,
        model: null,
        status: "retry_requested_from_admin",
        error_message: null,
      });

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.retry_requested",
        targetType: "market_news_raw_item",
        targetId: rawItem.id,
        targetFamily: null,
        targetSlug: null,
        summary: `Queued failed market news raw item "${rawItem.original_title}" for rewrite retry.`,
        metadata: {
          rawStatus: rawItem.status,
          sourceName: rawItem.source_name,
          sourceUrl: rawItem.source_url,
        },
      });
    } else if (action === "save_source") {
      const source = payload.source;

      if (!source?.name?.trim()) {
        return badRequest("Source name is required.");
      }

      const savedSource = await saveMarketNewsSource({
        id: payload.sourceId?.trim() || source.id || null,
        name: source.name,
        homepage_url: source.homepage_url ?? null,
        feed_url: source.feed_url ?? null,
        api_url: source.api_url ?? null,
        category: source.category ?? null,
        region: source.region ?? null,
        reliability_score: Number(source.reliability_score ?? 70),
        is_enabled: Boolean(source.is_enabled),
        notes: source.notes ?? null,
        source_type: source.source_type,
        fetch_interval_minutes:
          typeof source.fetch_interval_minutes === "number" ? source.fetch_interval_minutes : 30,
      });

      responsePayload = {
        source: savedSource,
      };

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.source_saved",
        targetType: "market_news_source",
        targetId: savedSource.id,
        targetFamily: null,
        targetSlug: savedSource.slug,
        summary: `Saved market news source "${savedSource.name}".`,
        metadata: {
          sourceType: savedSource.source_type,
          feedUrl: savedSource.feed_url,
          homepageUrl: savedSource.homepage_url,
          isEnabled: savedSource.is_enabled,
        },
      });
    } else if (action === "enable_source") {
      if (!payload.sourceId?.trim()) {
        return badRequest("Source ID is required.");
      }

      const source = await findMarketNewsSourceById(payload.sourceId.trim());

      if (!source) {
        throw new AdminOperatorValidationError("Could not find the market news source to enable.", 404);
      }

      const usableSourceType =
        source.api_url && source.source_type !== "rss"
          ? "api"
          : source.feed_url || source.detected_feed_url
            ? "rss"
            : source.source_type === "official"
              ? "official"
              : null;

      if (!usableSourceType) {
        throw new AdminOperatorValidationError(
          "This source does not yet have a usable feed or API URL. Run a source test first.",
          400,
        );
      }

      const savedSource = await saveMarketNewsSource({
        id: source.id,
        name: source.name,
        homepage_url: source.homepage_url,
        feed_url: source.feed_url ?? source.detected_feed_url,
        api_url: source.api_url,
        category: source.category,
        region: source.region,
        reliability_score: source.reliability_score,
        is_enabled: true,
        notes: source.notes,
        source_type: usableSourceType,
        fetch_interval_minutes: source.fetch_interval_minutes,
        last_status: "enabled",
        last_checked_at: new Date().toISOString(),
        last_error: null,
        detected_feed_url: source.detected_feed_url,
      });

      responsePayload = { source: savedSource };

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.source_enabled",
        targetType: "market_news_source",
        targetId: savedSource.id,
        targetFamily: null,
        targetSlug: savedSource.slug,
        summary: `Enabled market news source "${savedSource.name}".`,
        metadata: {
          sourceType: savedSource.source_type,
          feedUrl: savedSource.feed_url,
        },
      });
    } else if (action === "disable_source") {
      if (!payload.sourceId?.trim()) {
        return badRequest("Source ID is required.");
      }

      const source = await setMarketNewsSourceEnabled(payload.sourceId.trim(), false);
      responsePayload = { source };

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.source_disabled",
        targetType: "market_news_source",
        targetId: source.id,
        targetFamily: null,
        targetSlug: source.slug,
        summary: `Disabled market news source "${source.name}".`,
        metadata: {
          sourceType: source.source_type,
        },
      });
    } else if (action === "soft_disable_source" || action === "delete_source") {
      if (!payload.sourceId?.trim()) {
        return badRequest("Source ID is required.");
      }

      const source = await softDisableMarketNewsSource(
        payload.sourceId.trim(),
        "Soft-disabled from the Market News source console.",
      );
      responsePayload = { source };

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.source_soft_disabled",
        targetType: "market_news_source",
        targetId: source.id,
        targetFamily: null,
        targetSlug: source.slug,
        summary: `Soft-disabled market news source "${source.name}".`,
        metadata: {
          sourceType: source.source_type,
        },
      });
    } else if (action === "test_source") {
      const sourceRecord = payload.sourceId?.trim()
        ? await findMarketNewsSourceById(payload.sourceId.trim())
        : null;
      const sourceInput = sourceRecord ?? payload.source;

      if (!sourceInput?.name?.trim()) {
        return badRequest("Source name is required to run a source test.");
      }

      const testResult = await testMarketNewsSource({
        id: sourceRecord?.id ?? null,
        name: sourceInput.name,
        slug: sourceRecord?.slug ?? "",
        source_type:
          sourceRecord?.source_type ??
          sourceInput.source_type ??
          (sourceInput.api_url ? "api" : sourceInput.feed_url ? "rss" : "candidate"),
        homepage_url: sourceInput.homepage_url ?? null,
        feed_url: sourceInput.feed_url ?? sourceRecord?.feed_url ?? null,
        api_url: sourceInput.api_url ?? sourceRecord?.api_url ?? null,
      });

      if (sourceRecord) {
        const updatedSource = await applyMarketNewsSourceTestResult(sourceRecord.id, testResult);
        responsePayload = {
          source: updatedSource,
          testResult,
        };
      } else {
        responsePayload = {
          testResult,
        };
      }

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.source_tested",
        targetType: "market_news_source",
        targetId: sourceRecord?.id ?? "draft",
        targetFamily: null,
        targetSlug: sourceRecord?.slug ?? null,
        summary: `Tested market news source "${testResult.sourceName}".`,
        metadata: {
          classification: testResult.classification,
          statusCode: testResult.statusCode,
          detectedFeedUrl: testResult.detectedFeedUrl,
          sampleItemCount: testResult.sampleItemCount,
          blocked: testResult.blocked,
        },
      });
    } else if (action === "import_candidate_sources") {
      const importResult = await importMarketNewsCandidateSources();
      responsePayload = {
        importSummary: {
          inserted: importResult.inserted.length,
          skipped: importResult.skipped.length,
        },
      };

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "market_news.candidate_sources_imported",
        targetType: "market_news_source",
        targetId: "candidate-import",
        targetFamily: null,
        targetSlug: null,
        summary: `Imported ${importResult.inserted.length} missing candidate market news sources.`,
        metadata: {
          inserted: importResult.inserted.map((source) => source.slug),
          skipped: importResult.skipped.map((source) => source.slug),
        },
      });
    } else {
      return badRequest("Unsupported action.");
    }

    return NextResponse.json({
      ok: true,
      state: await getAdminMarketNewsDashboardState(),
      ...responsePayload,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
