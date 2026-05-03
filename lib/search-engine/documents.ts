import { courses } from "@/lib/courses";
import { communityProgramsItems } from "@/lib/community-programs";
import { getFunds, getIpos, getPublicStockDiscoveryStocks } from "@/lib/content";
import { getFundCategorySearchAliases } from "@/lib/fund-search-aliases";
import { getLearnArticles, getLearningPaths, getMarketEvents } from "@/lib/learn";
import { filterEntriesToPublicSearchRoutes } from "@/lib/public-search-routes";
import { mentorshipTracks } from "@/lib/mentorship";
import { buildSearchCatalog, type SearchCatalogEntry } from "@/lib/search-catalog";
import { tools } from "@/lib/tools";
import { webinars } from "@/lib/webinars";
import { wealthFamilyMeta, wealthProducts } from "@/lib/wealth-products";

export type SearchEntityType =
  | "stock"
  | "stock_chart"
  | "mutual_fund"
  | "mutual_fund_compare"
  | "stock_compare"
  | "ipo"
  | "wealth_product"
  | "wealth_family"
  | "sector"
  | "fund_category"
  | "index"
  | "tool"
  | "workflow"
  | "hub"
  | "learn"
  | "course"
  | "report";

export type SearchIndexDocument = SearchCatalogEntry & {
  id: string;
  entityType: SearchEntityType;
  routeFamily: string;
  summary: string;
  searchableText: string;
  aliases: string[];
  keywords: string[];
  priority: number;
  symbol?: string;
  sector?: string;
  fundCategory?: string;
  wealthFamily?: string;
  reportType?: string;
};

export type SearchDocumentBuildSummary = {
  totalDocuments: number;
  stockDocuments: number;
  assetDocuments: number;
  compareDocuments: number;
  workflowDocuments: number;
  aliasGroups: number;
  typoProtectedRoutes: number;
};

type SearchSourceGraph = {
  stocks: Awaited<ReturnType<typeof getPublicStockDiscoveryStocks>>;
  ipos: Awaited<ReturnType<typeof getIpos>>;
  funds: Awaited<ReturnType<typeof getFunds>>;
  learnArticles: Awaited<ReturnType<typeof getLearnArticles>>;
  learningPaths: Awaited<ReturnType<typeof getLearningPaths>>;
  marketEvents: Awaited<ReturnType<typeof getMarketEvents>>;
  catalog: SearchCatalogEntry[];
};

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildInitialism(value: string) {
  const tokens = value
    .replace(/&/g, " ")
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length < 2) {
    return null;
  }

  return normalizeToken(tokens.map((token) => token[0]).join(""));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return values
    .map((value) => (value ? normalizeToken(value) : ""))
    .filter(Boolean)
    .filter((value, index, allValues) => allValues.indexOf(value) === index);
}

function routeFamilyFromHref(href: string) {
  const [family = "root"] = href.replace(/^\//, "").split("/");
  return family || "root";
}

function keywordsFromText(value: string, extras: string[] = []) {
  const tokens = normalizeToken(value)
    .split(" ")
    .filter((token) => token.length >= 3);

  return uniqueStrings([...tokens, ...extras]).slice(0, 28);
}

function priorityFromCategory(category: string) {
  switch (category) {
    case "Stock":
    case "Mutual Fund":
    case "IPO":
    case "ETF":
    case "PMS":
    case "AIF":
    case "SIF":
      return 100;
    case "Chart":
    case "Compare":
    case "Fund Compare":
      return 96;
    case "Sector":
    case "Fund Category":
    case "Index":
      return 92;
    case "Tool":
    case "Workflow":
      return 84;
    case "Hub":
      return 78;
    case "Learn":
    case "Course":
      return 72;
    default:
      return 68;
  }
}

function buildStockAliases(stock: SearchSourceGraph["stocks"][number]) {
  return uniqueStrings([
    stock.name,
    stock.symbol,
    stock.slug.replace(/-/g, " "),
    stock.sector,
    `${stock.name} chart`,
    `${stock.symbol} share`,
    buildInitialism(stock.name),
  ]);
}

function buildFundAliases(fund: SearchSourceGraph["funds"][number]) {
  return uniqueStrings([
    fund.name,
    fund.slug.replace(/-/g, " "),
    fund.category,
    fund.benchmark,
    ...getFundCategorySearchAliases(fund.category),
    buildInitialism(fund.name),
  ]);
}

function buildIpoAliases(ipo: SearchSourceGraph["ipos"][number]) {
  return uniqueStrings([
    ipo.name,
    ipo.slug.replace(/-/g, " "),
    ipo.ipoType,
    ipo.status,
    ipo.name.replace(/\s+ipo$/i, ""),
  ]);
}

function buildSectorAliases(sector: string) {
  return uniqueStrings([sector, `${sector} sector`, `${sector} stocks`, `${sector} companies`]);
}

function buildFundCategoryAliases(category: string) {
  return uniqueStrings([category, `${category} funds`, ...getFundCategorySearchAliases(category)]);
}

function buildWealthAliases(product: (typeof wealthProducts)[number]) {
  const familyMeta = wealthFamilyMeta[product.family];

  return uniqueStrings([
    product.name,
    product.slug.replace(/-/g, " "),
    familyMeta.label,
    product.family,
    `${product.name} ${familyMeta.label}`,
    product.category,
    product.benchmark,
    product.manager,
  ]);
}

function buildIndexAliases(entry: SearchCatalogEntry) {
  switch (entry.href) {
    case "/nifty50":
      return uniqueStrings(["nifty 50", "nifty50", "nifty fifty", "nifty index", "nse nifty"]);
    case "/sensex":
      return uniqueStrings(["sensex", "sensex 30", "bse sensex", "bse benchmark"]);
    case "/banknifty":
      return uniqueStrings(["bank nifty", "banknifty", "nifty bank", "banking index"]);
    case "/finnifty":
      return uniqueStrings(["fin nifty", "finnifty", "financial index", "financial services index"]);
    default:
      return uniqueStrings([entry.title]);
  }
}

async function getSourceGraph(): Promise<SearchSourceGraph> {
  const [stocks, ipos, funds, learnArticles, learningPaths, marketEvents] = await Promise.all([
    getPublicStockDiscoveryStocks(),
    getIpos(),
    getFunds(),
    getLearnArticles(),
    getLearningPaths(),
    getMarketEvents(),
  ]);

  return {
    stocks,
    ipos,
    funds,
    learnArticles,
    learningPaths,
    marketEvents,
    catalog: await filterEntriesToPublicSearchRoutes(
      buildSearchCatalog({
        stocks,
        ipos,
        funds,
        learnArticles,
        learningPaths,
        marketEvents,
        mentorshipTracks,
        communityPrograms: communityProgramsItems,
        webinars,
      }),
    ),
  };
}

function mapDocument(entry: SearchCatalogEntry, graph: SearchSourceGraph): SearchIndexDocument {
  const routeFamily = routeFamilyFromHref(entry.href);
  const stockMatch = entry.href.match(/^\/stocks\/([^/]+)/);
  const fundMatch = entry.href.match(/^\/mutual-funds\/([^/]+)/);
  const ipoMatch = entry.href.match(/^\/ipo\/([^/]+)/);
  const sectorMatch = entry.href.match(/^\/sectors\/([^/]+)/);
  const fundCategoryMatch = entry.href.match(/^\/fund-categories\/([^/]+)/);
  const wealthMatch = entry.href.match(/^\/(etfs|pms|aif|sif)\/([^/]+)/);
  const toolMatch = entry.href.match(/^\/tools\/([^/]+)/);
  const learnMatch = entry.href.match(/^\/learn\/([^/]+)/);
  const learningTrackMatch = entry.href.match(/^\/learn\/tracks\/([^/]+)/);
  const marketEventMatch = entry.href.match(/^\/learn\/events\/([^/]+)/);
  const courseMatch = entry.href.match(/^\/courses\/([^/]+)/);
  const webinarMatch = entry.href.match(/^\/webinars\/([^/]+)/);
  const mentorshipMatch = entry.href.match(/^\/mentorship\/([^/]+)/);
  const communityMatch = entry.href.match(/^\/community\/([^/]+)/);

  const stock = stockMatch ? graph.stocks.find((item) => item.slug === stockMatch[1]) ?? null : null;
  const fund = fundMatch ? graph.funds.find((item) => item.slug === fundMatch[1]) ?? null : null;
  const ipo = ipoMatch ? graph.ipos.find((item) => item.slug === ipoMatch[1]) ?? null : null;
  const wealthProduct = wealthMatch
    ? wealthProducts.find((item) => wealthFamilyMeta[item.family].href === `/${wealthMatch[1]}` && item.slug === wealthMatch[2]) ?? null
    : null;
  const tool = toolMatch ? tools.find((item) => item.slug === toolMatch[1]) ?? null : null;
  const course = courseMatch ? courses.find((item) => item.slug === courseMatch[1]) ?? null : null;
  const learnArticle = learnMatch ? graph.learnArticles.find((item) => item.slug === learnMatch[1]) ?? null : null;
  const learningPath = learningTrackMatch
    ? graph.learningPaths.find((item) => item.slug === learningTrackMatch[1]) ?? null
    : null;
  const marketEvent = marketEventMatch
    ? graph.marketEvents.find((item) => item.slug === marketEventMatch[1]) ?? null
    : null;
  const webinar = webinarMatch ? webinars.find((item) => item.slug === webinarMatch[1]) ?? null : null;
  const mentorshipTrack = mentorshipMatch
    ? mentorshipTracks.find((item) => item.slug === mentorshipMatch[1]) ?? null
    : null;
  const communityProgram = communityMatch
    ? communityProgramsItems.find((item) => item.slug === communityMatch[1]) ?? null
    : null;

  let entityType: SearchEntityType = "workflow";
  let aliases = uniqueStrings([entry.title, entry.href.replace(/\//g, " ")]);
  let summary = entry.reasonBase;
  let symbol: string | undefined;
  let sector: string | undefined;
  let fundCategory: string | undefined;
  let wealthFamily: string | undefined;
  let reportType: string | undefined;

  if (stock && entry.category === "Chart") {
    entityType = "stock_chart";
    aliases = buildStockAliases(stock);
    summary = stock.summary;
    symbol = stock.symbol;
    sector = stock.sector;
  } else if (stock) {
    entityType = "stock";
    aliases = buildStockAliases(stock);
    summary = stock.summary;
    symbol = stock.symbol;
    sector = stock.sector;
  } else if (fund) {
    entityType = entry.category === "Fund Compare" ? "mutual_fund_compare" : "mutual_fund";
    aliases = buildFundAliases(fund);
    summary = fund.summary;
    fundCategory = fund.category;
  } else if (ipo) {
    entityType = "ipo";
    aliases = buildIpoAliases(ipo);
    summary = ipo.summary;
  } else if (wealthProduct) {
    entityType = "wealth_product";
    aliases = buildWealthAliases(wealthProduct);
    summary = wealthProduct.summary;
    wealthFamily = wealthProduct.family;
  } else if (entry.category === "Compare") {
    entityType = "stock_compare";
    aliases = uniqueStrings([entry.title, entry.title.replace(/\svs\s/i, " versus "), entry.title.replace(/\svs\s/i, " compare ")]);
  } else if (entry.category === "Fund Compare") {
    entityType = "mutual_fund_compare";
    aliases = uniqueStrings([entry.title, entry.title.replace(/\svs\s/i, " versus "), entry.title.replace(/\svs\s/i, " compare ")]);
  } else if (sectorMatch) {
    entityType = "sector";
    sector = entry.title.replace(/\s+sector$/i, "");
    aliases = buildSectorAliases(sector);
  } else if (fundCategoryMatch) {
    entityType = "fund_category";
    fundCategory = entry.title.replace(/\s+funds$/i, "");
    aliases = buildFundCategoryAliases(fundCategory);
  } else if (["/nifty50", "/sensex", "/banknifty", "/finnifty"].includes(entry.href)) {
    entityType = "index";
    aliases = buildIndexAliases(entry);
  } else if (tool) {
    entityType = "tool";
    aliases = uniqueStrings([tool.title, tool.slug.replace(/-/g, " "), tool.category, tool.samplePrompt]);
    summary = tool.summary;
  } else if (course) {
    entityType = "course";
    aliases = uniqueStrings([course.title, course.slug.replace(/-/g, " "), course.category]);
    summary = course.summary;
  } else if (learnArticle) {
    entityType = "learn";
    aliases = uniqueStrings([learnArticle.title, learnArticle.slug.replace(/-/g, " "), learnArticle.category]);
    summary = learnArticle.summary;
  } else if (learningPath) {
    entityType = "learn";
    aliases = uniqueStrings([learningPath.title, learningPath.slug.replace(/-/g, " "), learningPath.audience]);
    summary = learningPath.summary;
  } else if (marketEvent) {
    entityType = "report";
    aliases = uniqueStrings([marketEvent.title, marketEvent.slug.replace(/-/g, " "), marketEvent.eventType, marketEvent.assetRef]);
    summary = marketEvent.summary;
    reportType = marketEvent.eventType;
  } else if (webinar) {
    entityType = "learn";
    aliases = uniqueStrings([webinar.title, webinar.slug.replace(/-/g, " "), webinar.format, webinar.audience]);
    summary = webinar.summary;
  } else if (mentorshipTrack) {
    entityType = "learn";
    aliases = uniqueStrings([mentorshipTrack.title, mentorshipTrack.slug.replace(/-/g, " "), mentorshipTrack.audience]);
    summary = mentorshipTrack.summary;
  } else if (communityProgram) {
    entityType = "learn";
    aliases = uniqueStrings([communityProgram.title, communityProgram.slug.replace(/-/g, " "), communityProgram.participationMode]);
    summary = communityProgram.summary;
  } else if (entry.href === "/reports" || entry.href.startsWith("/reports/")) {
    entityType = "report";
    aliases = uniqueStrings([
      entry.title,
      entry.href.replace(/\//g, " "),
      entry.href === "/reports/fii-dii" ? "fii dii institutional flow" : null,
      entry.href === "/reports/results-calendar" ? "results calendar earnings dates" : null,
    ]);
    reportType = entry.href.replace(/^\/reports\/?/, "") || "hub";
  } else if (entry.category === "Hub" && ["/etfs", "/pms", "/aif", "/sif"].includes(entry.href)) {
    entityType = "wealth_family";
    const family = entry.href.replace(/^\//, "");
    wealthFamily = family === "etfs" ? "etf" : family;
    aliases = uniqueStrings([entry.title, wealthFamily, `${entry.title} wealth`, `${entry.title} products`]);
  } else if (entry.category === "Hub") {
    entityType = "hub";
  } else if (entry.category === "Workflow") {
    entityType = "workflow";
  } else if (entry.category === "Learn") {
    entityType = "learn";
  }

  const keywords = keywordsFromText(entry.query, aliases);

  return {
    ...entry,
    id: `${slugify(entry.category)}_${slugify(entry.href) || "root"}`,
    entityType,
    routeFamily,
    summary,
    searchableText: uniqueStrings([entry.query, summary, ...aliases, ...keywords]).join(" "),
    aliases,
    keywords,
    priority: priorityFromCategory(entry.category),
    symbol,
    sector,
    fundCategory,
    wealthFamily,
    reportType,
  };
}

export async function buildSearchIndexDocuments() {
  const graph = await getSourceGraph();
  const documents = graph.catalog
    .map((entry) => mapDocument(entry, graph))
    .filter((entry, index, allEntries) => allEntries.findIndex((item) => item.id === entry.id) === index)
    .sort((left, right) => left.title.localeCompare(right.title));

  return {
    documents,
    summary: {
      totalDocuments: documents.length,
      stockDocuments: documents.filter((item) => item.entityType === "stock").length,
      assetDocuments: documents.filter((item) =>
        ["stock", "stock_chart", "mutual_fund", "ipo", "wealth_product", "sector", "fund_category", "index"].includes(item.entityType),
      ).length,
      compareDocuments: documents.filter((item) => ["stock_compare", "mutual_fund_compare"].includes(item.entityType)).length,
      workflowDocuments: documents.filter((item) =>
        ["tool", "workflow", "hub", "learn", "course", "report", "wealth_family"].includes(item.entityType),
      ).length,
      aliasGroups: documents.reduce((sum, item) => sum + item.aliases.length, 0),
      typoProtectedRoutes: documents.filter((item) => item.aliases.length > 1).length,
    } satisfies SearchDocumentBuildSummary,
  };
}
