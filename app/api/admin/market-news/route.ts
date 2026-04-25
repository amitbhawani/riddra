import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  AdminOperatorValidationError,
  sanitizeAdminFailureMessage,
} from "@/lib/admin-operator-guards";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminMarketNewsDashboardState,
  insertMarketNewsRewriteLog,
  updateMarketNewsArticleStatus,
  updateMarketNewsRawItemStatus,
} from "@/lib/market-news/queries";

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
    };

    const action = String(payload.action ?? "").trim();

    if (!action) {
      return badRequest("Action is required.");
    }

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
    } else {
      return badRequest("Unsupported action.");
    }

    return NextResponse.json({
      ok: true,
      state: await getAdminMarketNewsDashboardState(),
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
