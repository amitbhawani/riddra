import { formatMarketNewsFullDate } from "@/lib/market-news/formatting";
import { getDailyMarketBriefArticles } from "@/lib/market-news/queries";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

export type RiddraDailyMarketBrief = {
  headline: string;
  summary: string;
  highlights: string[];
  articles: MarketNewsArticleWithRelations[];
  dateLabel: string;
};

function normalizeWhitespace(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value: string) {
  return normalizeWhitespace(value)
    .split(/\s+/)
    .filter(Boolean).length;
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

function getBriefSourceSentence(article: MarketNewsArticleWithRelations) {
  const sourceText =
    normalizeWhitespace(article.short_summary) ||
    normalizeWhitespace(article.summary) ||
    normalizeWhitespace(article.rewritten_title || article.original_title);
  const cleaned = sourceText.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return ensureSentence(trimToWordLimit(article.rewritten_title || article.original_title, 24));
  }

  return ensureSentence(trimToWordLimit(cleaned, 24));
}

function buildBriefSummary(articles: readonly MarketNewsArticleWithRelations[]) {
  const baseIntro =
    "Riddra’s daily market brief tracks the most important developments from the past 24 hours across corporate updates, regulation, IPO activity, and broader market signals.";
  const supportingIntro =
    "The selection below is ordered deterministically using article importance, reader momentum, and freshness so the biggest stories surface first.";
  const storySentences = articles.map((article) => getBriefSourceSentence(article));
  let summary = [baseIntro, supportingIntro, ...storySentences].join(" ");

  if (countWords(summary) < 150) {
    summary = [
      summary,
      "Together, these stories offer a fast read on where management commentary, policy signals, and market positioning are shaping the near-term conversation.",
    ].join(" ");
  }

  while (countWords(summary) > 200 && storySentences.length > 0) {
    const lastSentence = storySentences.pop();

    if (!lastSentence) {
      break;
    }

    summary = [baseIntro, supportingIntro, ...storySentences].join(" ");
  }

  if (countWords(summary) > 200) {
    summary = ensureSentence(trimToWordLimit(summary, 195));
  }

  if (countWords(summary) < 150) {
    summary = [
      summary,
      "It is designed to give readers a quick, high-signal overview before they move into the full article pages for source context and deeper detail.",
    ].join(" ");
  }

  return summary;
}

function buildHighlight(article: MarketNewsArticleWithRelations) {
  return ensureSentence(
    trimToWordLimit(sentenceCase(article.rewritten_title || article.original_title), 16),
  );
}

export function getRiddraDailyMarketBriefPreview(
  brief: Pick<RiddraDailyMarketBrief, "summary">,
  wordLimit = 42,
) {
  return ensureSentence(trimToWordLimit(brief.summary, wordLimit));
}

export async function getRiddraDailyMarketBrief() {
  const articles = await getDailyMarketBriefArticles(5);
  const todayIso = new Date().toISOString();
  const dateLabel = formatMarketNewsFullDate(todayIso) ?? "Today";

  return {
    headline: `Riddra Market Brief – ${dateLabel}`,
    summary: buildBriefSummary(articles),
    highlights: articles.map((article) => buildHighlight(article)),
    articles,
    dateLabel,
  } satisfies RiddraDailyMarketBrief;
}
