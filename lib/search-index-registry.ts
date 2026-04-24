import { getFunds, getIpos, getStocks } from "@/lib/content";
import { communityProgramsItems } from "@/lib/community-programs";
import { getLearnArticles, getLearningPaths, getMarketEvents } from "@/lib/learn";
import { mentorshipTracks } from "@/lib/mentorship";
import { filterEntriesToPublishableCms } from "@/lib/publishable-content";
import { buildSearchCatalog } from "@/lib/search-catalog";
import { webinars } from "@/lib/webinars";

export type SearchIndexRegistryRow = {
  title: string;
  href: string;
  category: string;
  query: string;
  reasonBase: string;
};

export async function getSearchIndexRegistryRows(): Promise<SearchIndexRegistryRow[]> {
  const [stocks, ipos, funds, learnArticles, learningPaths, marketEvents] = await Promise.all([
    getStocks(),
    getIpos(),
    getFunds(),
    getLearnArticles(),
    getLearningPaths(),
    getMarketEvents(),
  ]);

  return (await filterEntriesToPublishableCms(
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
  ))
    .map((entry) => ({
      title: entry.title,
      href: entry.href,
      category: entry.category,
      query: entry.query,
      reasonBase: entry.reasonBase,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function getSearchIndexRegistrySummary() {
  const rows = await getSearchIndexRegistryRows();

  const assetRoutes = rows.filter((row) =>
    ["Stock", "Mutual Fund", "IPO", "Sector", "Fund Category", "Index"].includes(
      row.category,
    ),
  ).length;
  const compareRoutes = rows.filter((row) =>
    ["Compare", "Fund Compare"].includes(row.category),
  ).length;
  const workflowRoutes = rows.filter((row) =>
    ["Workflow", "Tool", "Hub", "Learn", "Course"].includes(row.category),
  ).length;

  return {
    totalRows: rows.length,
    assetRoutes,
    compareRoutes,
    workflowRoutes,
  };
}

export function toSearchIndexRegistryCsv(rows: SearchIndexRegistryRow[]) {
  const columns = ["title", "href", "category", "query", "reason_base"];
  const dataRows = rows.map((row) =>
    [row.title, row.href, row.category, row.query, row.reasonBase]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return `${columns.join(",")}\n${dataRows.join("\n")}\n`;
}
