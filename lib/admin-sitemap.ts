import { adminContentFamilies } from "@/lib/admin-navigation";
import {
  adminFamilyMeta,
  getAdminFamilyRows,
  type AdminFamilyKey,
  type AdminListRow,
} from "@/lib/admin-content-registry";
import {
  getAdminOperatorStore,
  type AdminManagedRecord,
  type AdminPublishState,
} from "@/lib/admin-operator-store";

export type AdminSitemapEntry = {
  id: string;
  title: string;
  breadcrumb: string;
  href: string | null;
  editHref: string | null;
  family: AdminFamilyKey | null;
  slug: string | null;
  publishState: AdminPublishState | "static" | "pattern" | "internal";
  sourceState: AdminListRow["sourceState"] | "static" | "pattern" | "internal";
  accessLabel: string | null;
  note: string | null;
  deletable: boolean;
  deleteReason: string | null;
};

export type AdminSitemapGroup = {
  id: string;
  title: string;
  description: string;
  items: AdminSitemapEntry[];
};

export type AdminSitemapSection = {
  id: string;
  title: string;
  description: string;
  groups: AdminSitemapGroup[];
};

export type AdminSitemapAudit = {
  sections: AdminSitemapSection[];
  cleanupCandidates: AdminSitemapEntry[];
  summary: {
    totalPublicEntries: number;
    totalInternalEntries: number;
    totalDynamicPatterns: number;
    totalCleanupCandidates: number;
  };
};

type StaticSitemapEntrySeed = {
  id: string;
  title: string;
  breadcrumb: string;
  href: string;
  note?: string;
  publishState?: "static" | "pattern" | "internal";
  sourceState?: "static" | "pattern" | "internal";
};

function createStaticEntry(seed: StaticSitemapEntrySeed): AdminSitemapEntry {
  return {
    id: seed.id,
    title: seed.title,
    breadcrumb: seed.breadcrumb,
    href: seed.href,
    editHref: null,
    family: null,
    slug: null,
    publishState: seed.publishState ?? "static",
    sourceState: seed.sourceState ?? "static",
    accessLabel: null,
    note: seed.note ?? null,
    deletable: false,
    deleteReason: null,
  };
}

function buildContentEntry(
  family: AdminFamilyKey,
  row: AdminListRow,
  record: AdminManagedRecord | null,
  parentBreadcrumb: string,
): AdminSitemapEntry {
  const manualOnly = row.sourceState === "manual_only";

  return {
    id: `${family}:${row.slug}`,
    title: row.title,
    breadcrumb: `${parentBreadcrumb} > ${row.title}`,
    href: row.publicHref,
    editHref: `/admin/content/${family}/${row.slug}`,
    family,
    slug: row.slug,
    publishState: row.publishState,
    sourceState: row.sourceState,
    accessLabel: row.accessLabel,
    note: row.summary || null,
    deletable: manualOnly,
    deleteReason: manualOnly
      ? "Manual-only record with no source-backed page."
      : "Source-backed routes should be cleaned from their source family, not deleted from the sitemap.",
  };
}

function createContentGroup(
  id: string,
  title: string,
  description: string,
  items: AdminSitemapEntry[],
): AdminSitemapGroup {
  return {
    id,
    title,
    description,
    items: [...items].sort((left, right) => left.title.localeCompare(right.title)),
  };
}

async function loadFamilyEntries(
  family: AdminFamilyKey,
  records: AdminManagedRecord[],
  recordMap: Map<string, AdminManagedRecord>,
  parentBreadcrumb: string,
) {
  const rows = await getAdminFamilyRows(family, records, {
    cacheKey: records.map((record) => `${record.family}:${record.slug}:${record.updatedAt}`).join("|"),
  });

  const entries = rows.map((row) =>
    buildContentEntry(
      family,
      row,
      recordMap.get(`${family}:${row.slug}`) ?? null,
      parentBreadcrumb,
    ),
  );

  return {
    publicEntries: entries.filter(
      (entry) => entry.sourceState !== "manual_only" || entry.publishState === "published",
    ),
    cleanupEntries: entries.filter((entry) => entry.sourceState === "manual_only"),
  };
}

function staticGroup(
  id: string,
  title: string,
  description: string,
  items: StaticSitemapEntrySeed[],
) {
  return {
    id,
    title,
    description,
    items: items.map((item) => createStaticEntry(item)),
  } satisfies AdminSitemapGroup;
}

export async function buildAdminSitemapAudit(): Promise<AdminSitemapAudit> {
  const store = await getAdminOperatorStore();
  const recordMap = new Map(store.records.map((record) => [`${record.family}:${record.slug}`, record] as const));

  const [
    stockEntries,
    fundEntries,
    indexEntries,
    ipoEntries,
    etfEntries,
    pmsEntries,
    aifEntries,
    sifEntries,
    courseEntries,
    webinarEntries,
    learnEntries,
    newsletterEntries,
    researchEntries,
  ] = await Promise.all(
    (
      adminContentFamilies
        .map((item) => item.family)
        .filter(Boolean) as AdminFamilyKey[]
    ).map(async (family) => {
      const parentBreadcrumb = `Home > ${adminFamilyMeta[family].label}`;
      const result = await loadFamilyEntries(family, store.records, recordMap, parentBreadcrumb);
      return [family, result] as const;
    }),
  ).then((pairs) => {
    const map = new Map(pairs);
    return [
      map.get("stocks")!,
      map.get("mutual-funds")!,
      map.get("indices")!,
      map.get("ipos")!,
      map.get("etfs")!,
      map.get("pms")!,
      map.get("aif")!,
      map.get("sif")!,
      map.get("courses")!,
      map.get("webinars")!,
      map.get("learn")!,
      map.get("newsletter")!,
      map.get("research-articles")!,
    ];
  });

  const sections: AdminSitemapSection[] = [
    {
      id: "home-discovery",
      title: "Home & Discovery",
      description: "Primary public entry points and discovery hubs that users can reach directly from navigation or search.",
      groups: [
        staticGroup("home-core", "Core public hubs", "Top-level public discovery pages.", [
          { id: "home", title: "Home", breadcrumb: "Home", href: "/" },
          { id: "stocks-hub", title: "Stocks", breadcrumb: "Home > Stocks", href: "/stocks" },
          { id: "funds-hub", title: "Mutual Funds", breadcrumb: "Home > Mutual Funds", href: "/mutual-funds" },
          { id: "indices-hub", title: "Indices", breadcrumb: "Home > Indices", href: "/indices" },
          { id: "markets-hub", title: "Markets", breadcrumb: "Home > Markets", href: "/markets" },
          { id: "search-hub", title: "Search", breadcrumb: "Home > Search", href: "/search" },
          { id: "screener-hub", title: "Screener", breadcrumb: "Home > Screener", href: "/screener" },
          { id: "sectors-hub", title: "Sectors", breadcrumb: "Home > Sectors", href: "/sectors" },
          { id: "fund-categories-hub", title: "Fund Categories", breadcrumb: "Home > Fund Categories", href: "/fund-categories" },
        ]),
      ],
    },
    {
      id: "stocks",
      title: "Stocks",
      description: "Public stock listing routes plus all current stock detail pages.",
      groups: [
        createContentGroup(
          "stock-pages",
          "Stock detail pages",
          "Source-backed stock pages plus any intentionally published manual stock pages.",
          stockEntries.publicEntries,
        ),
      ],
    },
    {
      id: "mutual-funds",
      title: "Mutual Funds",
      description: "Fund listing routes plus all current mutual-fund detail pages.",
      groups: [
        createContentGroup(
          "fund-pages",
          "Mutual-fund detail pages",
          "Source-backed mutual-fund pages plus any intentionally published manual fund pages.",
          fundEntries.publicEntries,
        ),
      ],
    },
    {
      id: "indices-and-markets",
      title: "Indices, Markets & Trading",
      description: "Index pages and market/trading utility surfaces.",
      groups: [
        createContentGroup(
          "index-pages",
          "Index detail pages",
          "Current tracked index routes.",
          indexEntries.publicEntries,
        ),
        staticGroup("market-utilities", "Market utilities", "Public market and trading surfaces.", [
          { id: "charts", title: "Charts", breadcrumb: "Home > Charts", href: "/charts" },
          { id: "advanced-charts", title: "Advanced Charts", breadcrumb: "Home > Advanced Charts", href: "/advanced-charts" },
          { id: "tools", title: "Tools", breadcrumb: "Home > Tools", href: "/tools" },
          { id: "results-calendar", title: "Results Calendar", breadcrumb: "Home > Results Calendar", href: "/results-calendar" },
          { id: "alerts", title: "Alerts", breadcrumb: "Home > Alerts", href: "/alerts" },
          { id: "chart-layouts", title: "Chart Layouts", breadcrumb: "Home > Chart Layouts", href: "/chart-layouts" },
          { id: "scanner-presets", title: "Scanner Presets", breadcrumb: "Home > Scanner Presets", href: "/scanner-presets" },
          { id: "trader-presets", title: "Trader Presets", breadcrumb: "Home > Trader Presets", href: "/trader-presets" },
          { id: "trader-workstation", title: "Trader Workstation", breadcrumb: "Home > Trader Workstation", href: "/trader-workstation" },
        ]),
      ],
    },
    {
      id: "wealth-products",
      title: "IPOs & Wealth Products",
      description: "Primary-market and managed-wealth surfaces.",
      groups: [
        staticGroup("wealth-hubs", "Wealth hubs", "Public wealth and onboarding entry points.", [
          { id: "wealth", title: "Wealth", breadcrumb: "Home > Wealth", href: "/wealth" },
          { id: "ipo", title: "IPO", breadcrumb: "Home > IPO", href: "/ipo" },
          { id: "etfs", title: "ETFs", breadcrumb: "Home > ETFs", href: "/etfs" },
          { id: "pms", title: "PMS", breadcrumb: "Home > PMS", href: "/pms" },
          { id: "aif", title: "AIF", breadcrumb: "Home > AIF", href: "/aif" },
          { id: "sif", title: "SIF", breadcrumb: "Home > SIF", href: "/sif" },
          { id: "pricing", title: "Pricing", breadcrumb: "Home > Pricing", href: "/pricing" },
          { id: "mobile-app", title: "Mobile App", breadcrumb: "Home > Mobile App", href: "/mobile-app" },
          { id: "get-started", title: "Get Started", breadcrumb: "Home > Get Started", href: "/get-started" },
        ]),
        createContentGroup("ipo-pages", "IPO detail pages", "Current IPO detail routes.", ipoEntries.publicEntries),
        createContentGroup("etf-pages", "ETF detail pages", "Current ETF detail routes.", etfEntries.publicEntries),
        createContentGroup("pms-pages", "PMS detail pages", "Current PMS detail routes.", pmsEntries.publicEntries),
        createContentGroup("aif-pages", "AIF detail pages", "Current AIF detail routes.", aifEntries.publicEntries),
        createContentGroup("sif-pages", "SIF detail pages", "Current SIF detail routes.", sifEntries.publicEntries),
      ],
    },
    {
      id: "learning-editorial",
      title: "Learning, Editorial & Community",
      description: "Editorial, education, newsletter, webinar, and community-facing routes.",
      groups: [
        staticGroup("editorial-hubs", "Editorial hubs", "Top-level editorial and community entry points.", [
          { id: "learn", title: "Learn", breadcrumb: "Home > Learn", href: "/learn" },
          { id: "courses", title: "Courses", breadcrumb: "Home > Courses", href: "/courses" },
          { id: "newsletter", title: "Newsletter", breadcrumb: "Home > Newsletter", href: "/newsletter" },
          { id: "webinars", title: "Webinars", breadcrumb: "Home > Webinars", href: "/webinars" },
          { id: "community", title: "Community", breadcrumb: "Home > Community", href: "/community" },
          { id: "mentorship", title: "Mentorship", breadcrumb: "Home > Mentorship", href: "/mentorship" },
          { id: "reports", title: "Reports", breadcrumb: "Home > Reports", href: "/reports" },
        ]),
        createContentGroup("learn-pages", "Learn articles", "Current learn-route pages.", learnEntries.publicEntries),
        createContentGroup("research-pages", "Research articles", "Current research/article pages routed through learn.", researchEntries.publicEntries),
        createContentGroup("course-pages", "Course pages", "Current course pages.", courseEntries.publicEntries),
        createContentGroup("newsletter-pages", "Newsletter pages", "Current newsletter routes.", newsletterEntries.publicEntries),
        createContentGroup("webinar-pages", "Webinar pages", "Current webinar routes.", webinarEntries.publicEntries),
      ],
    },
    {
      id: "utility-trust",
      title: "Utility, Trust & Corporate",
      description: "Public support, contact, privacy, and legal routes.",
      groups: [
        staticGroup("trust-pages", "Support and legal", "Corporate and trust-facing routes.", [
          { id: "help", title: "Help", breadcrumb: "Home > Help", href: "/help" },
          { id: "contact", title: "Contact", breadcrumb: "Home > Contact", href: "/contact" },
          { id: "privacy", title: "Privacy", breadcrumb: "Home > Privacy", href: "/privacy" },
          { id: "terms", title: "Terms", breadcrumb: "Home > Terms", href: "/terms" },
          { id: "legal-privacy-policy", title: "Privacy Policy", breadcrumb: "Home > Legal > Privacy Policy", href: "/legal/privacy-policy" },
          { id: "legal-tos", title: "Terms of Service", breadcrumb: "Home > Legal > Terms of Service", href: "/legal/tos" },
        ]),
      ],
    },
    {
      id: "dynamic-patterns",
      title: "Dynamic Public Route Patterns",
      description: "Real dynamic route families that do not map to one fixed page row.",
      groups: [
        staticGroup("dynamic-patterns-list", "Dynamic patterns", "These are live route patterns rather than one named page each.", [
          { id: "compare-stocks", title: "Compare Stocks Pattern", breadcrumb: "Home > Compare > Stocks > [Left] > [Right]", href: "/compare/stocks/tata-motors/infosys", publishState: "pattern", sourceState: "pattern", note: "Dynamic compare route pattern." },
          { id: "compare-funds", title: "Compare Mutual Funds Pattern", breadcrumb: "Home > Compare > Mutual Funds > [Left] > [Right]", href: "/compare/mutual-funds/hdfc-mid-cap-opportunities/sbi-bluechip-fund", publishState: "pattern", sourceState: "pattern", note: "Dynamic compare route pattern." },
          { id: "user-profile", title: "Public User Profile Pattern", breadcrumb: "Home > User > [Username]", href: "/user/amitbhawani", publishState: "pattern", sourceState: "pattern", note: "Public profile route pattern." },
          { id: "stock-chart", title: "Stock Chart Pattern", breadcrumb: "Home > Stocks > [Slug] > Chart", href: "/stocks/tata-motors/chart", publishState: "pattern", sourceState: "pattern", note: "Chart sub-route pattern." },
          { id: "learn-events", title: "Learn Events Pattern", breadcrumb: "Home > Learn > Events > [Slug]", href: "/learn/events/tata-motors-results", publishState: "pattern", sourceState: "pattern", note: "Dynamic learn-event route pattern." },
          { id: "learn-tracks", title: "Learn Tracks Pattern", breadcrumb: "Home > Learn > Tracks > [Slug]", href: "/learn/tracks/fundamentals-track", publishState: "pattern", sourceState: "pattern", note: "Dynamic learn-track route pattern." },
          { id: "webinar-register", title: "Webinar Register Pattern", breadcrumb: "Home > Webinars > [Slug] > Register", href: "/webinars/ipo-analysis-live/register", publishState: "pattern", sourceState: "pattern", note: "Dynamic webinar registration route pattern." },
          { id: "webinar-replay", title: "Webinar Replay Pattern", breadcrumb: "Home > Webinars > [Slug] > Replay", href: "/webinars/ipo-analysis-live/replay", publishState: "pattern", sourceState: "pattern", note: "Dynamic webinar replay route pattern." },
        ]),
      ],
    },
    {
      id: "internal-noindex",
      title: "Internal / Noindex / Test Routes",
      description: "Intentional support, QA, and prototype routes that are not part of the normal public navigation.",
      groups: [
        staticGroup("internal-routes", "Internal public-ish routes", "Useful for QA and operator workflows, but not core public navigation.", [
          { id: "test-motors", title: "Test Motors Page", breadcrumb: "Internal > Stocks > Test Motors", href: "/stocks/test-motors", publishState: "internal", sourceState: "internal", note: "Kept intentionally as the active stock prototype route." },
          { id: "r-score-methodology", title: "R Score Methodology", breadcrumb: "Internal > Stocks > R Score Methodology", href: "/stocks/r-score-methodology", publishState: "internal", sourceState: "internal", note: "Prototype methodology explainer with noindex posture." },
          { id: "build-tracker", title: "Build Tracker", breadcrumb: "Internal > Build Tracker", href: "/build-tracker", publishState: "internal", sourceState: "internal", note: "Operator-facing build/readiness surface." },
          { id: "launch-readiness", title: "Launch Readiness", breadcrumb: "Internal > Launch Readiness", href: "/launch-readiness", publishState: "internal", sourceState: "internal", note: "Operator-facing launch readiness surface." },
          { id: "source-readiness", title: "Source Readiness", breadcrumb: "Internal > Source Readiness", href: "/source-readiness", publishState: "internal", sourceState: "internal", note: "Operator-facing source coverage surface." },
          { id: "private-beta", title: "Private Beta", breadcrumb: "Internal > Private Beta", href: "/private-beta", publishState: "internal", sourceState: "internal", note: "Private beta landing route." },
          { id: "index-replay", title: "Index Replay", breadcrumb: "Internal > Index Replay", href: "/index-replay", publishState: "internal", sourceState: "internal", note: "Special replay-style route outside the standard navigation." },
        ]),
      ],
    },
  ];

  const cleanupCandidates = [
    ...stockEntries.cleanupEntries,
    ...fundEntries.cleanupEntries,
    ...indexEntries.cleanupEntries,
    ...ipoEntries.cleanupEntries,
    ...etfEntries.cleanupEntries,
    ...pmsEntries.cleanupEntries,
    ...aifEntries.cleanupEntries,
    ...sifEntries.cleanupEntries,
    ...courseEntries.cleanupEntries,
    ...webinarEntries.cleanupEntries,
    ...learnEntries.cleanupEntries,
    ...newsletterEntries.cleanupEntries,
    ...researchEntries.cleanupEntries,
  ].sort((left, right) => left.breadcrumb.localeCompare(right.breadcrumb));

  const totalPublicEntries = sections
    .filter((section) => section.id !== "internal-noindex" && section.id !== "dynamic-patterns")
    .flatMap((section) => section.groups)
    .flatMap((group) => group.items).length;
  const totalInternalEntries = sections
    .find((section) => section.id === "internal-noindex")
    ?.groups.flatMap((group) => group.items).length ?? 0;
  const totalDynamicPatterns = sections
    .find((section) => section.id === "dynamic-patterns")
    ?.groups.flatMap((group) => group.items).length ?? 0;

  return {
    sections,
    cleanupCandidates,
    summary: {
      totalPublicEntries,
      totalInternalEntries,
      totalDynamicPatterns,
      totalCleanupCandidates: cleanupCandidates.length,
    },
  };
}
