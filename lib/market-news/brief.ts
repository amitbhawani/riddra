import { formatMarketNewsFullDate } from "@/lib/market-news/formatting";
import { getDailyMarketBriefArticles } from "@/lib/market-news/queries";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

export type RiddraDailyMarketBrief = {
  headline: string;
  summary: string;
  highlights: string[];
  articles: MarketNewsArticleWithRelations[];
  dateLabel: string;
  dateKey: string;
  href: string;
};

const BRIEF_TIME_ZONE = "Asia/Kolkata";

function normalizeWhitespace(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimToWordLimit(value: string, limit: number) {
  const words = normalizeWhitespace(value).split(/\s+/).filter(Boolean);

  if (words.length <= limit) {
    return words.join(" ");
  }

  return `${words.slice(0, limit).join(" ").replace(/[.,;:!?-]+$/, "")}…`;
}

function ensureSentence(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function sentenceCase(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  return normalized[0].toUpperCase() + normalized.slice(1);
}

function titleCaseList(values: readonly string[]) {
  return values
    .map((value) => sentenceCase(value.replace(/_/g, " ")))
    .filter(Boolean);
}

function getBriefDateParts(value: string | null | undefined) {
  const timestamp = Date.parse(String(value ?? ""));

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRIEF_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  if (!year || !month || !day) {
    return null;
  }

  return {
    key: `${year}-${month}-${day}`,
    label: formatMarketNewsFullDate(new Date(timestamp).toISOString()) ?? `${day}/${month}/${year}`,
  };
}

function buildBriefThemeSentence(articles: readonly MarketNewsArticleWithRelations[]) {
  const categories = titleCaseList(
    Array.from(
      new Set(
        articles
          .map((article) => normalizeWhitespace(article.category))
          .filter(Boolean),
      ),
    ).slice(0, 4),
  );

  if (!categories.length) {
    return "The briefing spans high-signal corporate, regulatory, and market-moving updates.";
  }

  if (categories.length === 1) {
    return `The selection is dominated by ${categories[0].toLowerCase()} developments with direct market relevance.`;
  }

  if (categories.length === 2) {
    return `The selection spans ${categories[0].toLowerCase()} and ${categories[1].toLowerCase()} developments with direct market relevance.`;
  }

  const leading = categories.slice(0, -1).map((value) => value.toLowerCase());
  const trailing = categories[categories.length - 1]!.toLowerCase();
  return `The selection spans ${leading.join(", ")}, and ${trailing} developments with direct market relevance.`;
}

function buildBriefEntitySentence(articles: readonly MarketNewsArticleWithRelations[]) {
  const entities = Array.from(
    new Set(
      articles
        .flatMap((article) =>
          article.entities
            .filter((entity) => entity.entity_type === "stock" || entity.entity_type === "sector" || entity.entity_type === "ipo")
            .map((entity) => normalizeWhitespace(entity.display_name)),
        )
        .filter(Boolean),
    ),
  ).slice(0, 5);

  if (!entities.length) {
    return "Together, the stories give readers a quick read on how the broader Indian market conversation is evolving.";
  }

  if (entities.length === 1) {
    return `${entities[0]} is one of the clearest names in focus across the current briefing window.`;
  }

  if (entities.length === 2) {
    return `${entities[0]} and ${entities[1]} are among the clearest names in focus across the current briefing window.`;
  }

  const leading = entities.slice(0, -1);
  const trailing = entities[entities.length - 1]!;
  return `${leading.join(", ")}, and ${trailing} are among the clearest names in focus across the current briefing window.`;
}

function buildBriefSummary(articles: readonly MarketNewsArticleWithRelations[]) {
  const leadArticle = articles[0];
  const secondArticle = articles[1];

  if (!leadArticle) {
    return "";
  }

  const leadTitle = trimToWordLimit(
    sentenceCase(leadArticle.rewritten_title || leadArticle.original_title),
    14,
  );
  const secondLeadTitle = secondArticle
    ? trimToWordLimit(
        sentenceCase(secondArticle.rewritten_title || secondArticle.original_title),
        14,
      )
    : "";
  const themeSentence = buildBriefThemeSentence(articles).replace(
    "The selection ",
    "Today’s brief ",
  );
  const entitySentence = buildBriefEntitySentence(articles);
  const summary = [
    ensureSentence(`The day’s brief is led by ${leadTitle}`),
    secondLeadTitle
      ? ensureSentence(`It also tracks ${secondLeadTitle.toLowerCase()}`)
      : "",
    ensureSentence(themeSentence),
    ensureSentence(entitySentence),
    "Open the linked stories for the fuller context behind each move.",
  ].join(" ");

  return ensureSentence(trimToWordLimit(summary, 52));
}

function buildHighlight(article: MarketNewsArticleWithRelations) {
  return ensureSentence(
    trimToWordLimit(sentenceCase(article.rewritten_title || article.original_title), 16),
  );
}

function getBriefArticleTimestamp(article: MarketNewsArticleWithRelations) {
  return article.published_at || article.source_published_at || article.created_at;
}

function getBriefArticleScore(article: MarketNewsArticleWithRelations) {
  const timestamp = Date.parse(getBriefArticleTimestamp(article) ?? "");
  const recencyTieBreaker = Number.isFinite(timestamp) ? timestamp / 1_000_000_000_000 : 0;

  return (
    article.importance_score * 100 +
    (article.impact_note?.trim() ? 8 : 0) +
    (!article.uses_fallback_image ? 5 : 0) +
    recencyTieBreaker
  );
}

function buildBriefHref(dateKey: string, isToday: boolean) {
  return isToday ? "/markets/brief" : `/markets/brief/${dateKey}`;
}

function buildDailyMarketBrief(
  articles: MarketNewsArticleWithRelations[],
  dateLabel: string,
  dateKey: string,
  isToday: boolean,
) {
  return {
    headline: `Riddra Market Brief – ${dateLabel}`,
    summary: buildBriefSummary(articles),
    highlights: articles.map((article) => buildHighlight(article)),
    articles,
    dateLabel,
    dateKey,
    href: buildBriefHref(dateKey, isToday),
  } satisfies RiddraDailyMarketBrief;
}

export function getRiddraDailyMarketBriefPreview(
  brief: Pick<RiddraDailyMarketBrief, "summary">,
  wordLimit = 42,
) {
  return ensureSentence(trimToWordLimit(brief.summary, wordLimit));
}

export function getRiddraDailyBriefStorySummary(
  article: Pick<MarketNewsArticleWithRelations, "short_summary" | "summary" | "impact_note">,
) {
  const candidate = normalizeWhitespace(article.short_summary || article.summary || article.impact_note);

  if (!candidate) {
    return "";
  }

  const sentences = candidate.match(/[^.?!]+[.?!]?/g) ?? [];
  const preview = sentences.slice(0, 2).join(" ").trim() || candidate;
  return ensureSentence(trimToWordLimit(preview, 36));
}

export async function getRiddraDailyMarketBrief() {
  const articles = await getDailyMarketBriefArticles(5);
  const todayParts = getBriefDateParts(new Date().toISOString());
  const dateLabel = todayParts?.label ?? "Today";
  const dateKey = todayParts?.key ?? "today";

  return buildDailyMarketBrief(articles, dateLabel, dateKey, true);
}

export async function getRiddraDailyMarketBriefHistory(days = 5) {
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.trunc(days), 1), 7) : 5;
  const recentArticles = await getDailyMarketBriefArticles(Math.max(safeDays * 6, 30), {
    hoursWindow: safeDays * 24,
  });
  const groupedArticles = new Map<string, { dateLabel: string; articles: MarketNewsArticleWithRelations[] }>();

  for (const article of recentArticles) {
    const dateParts = getBriefDateParts(getBriefArticleTimestamp(article));

    if (!dateParts) {
      continue;
    }

    const existing = groupedArticles.get(dateParts.key);

    if (existing) {
      existing.articles.push(article);
      continue;
    }

    if (groupedArticles.size >= safeDays) {
      continue;
    }

    groupedArticles.set(dateParts.key, {
      dateLabel: dateParts.label,
      articles: [article],
    });
  }

  const todayKey = getBriefDateParts(new Date().toISOString())?.key ?? "today";

  return Array.from(groupedArticles.entries())
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([dateKey, value]) => {
      const topArticles = [...value.articles]
        .sort((left, right) => getBriefArticleScore(right) - getBriefArticleScore(left))
        .slice(0, 5);

      return buildDailyMarketBrief(topArticles, value.dateLabel, dateKey, dateKey === todayKey);
    });
}

export async function getRiddraDailyMarketBriefByDate(dateKey: string) {
  const normalizedDateKey = normalizeWhitespace(dateKey);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateKey)) {
    return null;
  }

  const history = await getRiddraDailyMarketBriefHistory(7);
  return history.find((entry) => entry.dateKey === normalizedDateKey) ?? null;
}
