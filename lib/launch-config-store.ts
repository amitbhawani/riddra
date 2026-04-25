import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  hasDurableCmsStateStore,
  listDurableLaunchConfigSections,
  saveDurableLaunchConfigSection,
} from "@/lib/cms-durable-state";

export type LaunchConfigStore = {
  basic: {
    siteUrl: string;
    launchMode: string;
    supportEmail: string;
    adminEmails: string;
  };
  content: {
    defaultTitleTemplate: string;
    defaultMetaDescription: string;
    stockTitleTemplate: string;
    stockMetaDescriptionTemplate: string;
    fundTitleTemplate: string;
    fundMetaDescriptionTemplate: string;
    indexTitleTemplate: string;
    indexMetaDescriptionTemplate: string;
    blogBaseUrl: string;
    docsBaseUrl: string;
    canonicalHost: string;
    ogImageBaseUrl: string;
    schemaOrganizationName: string;
    editorialCalendarUrl: string;
  };
  experience: {
    headerAnnouncement: string;
    headerBrandMark: string;
    headerLogoUrl: string;
    headerLogoWidthPx: string;
    headerBrandLabel: string;
    headerBrandHref: string;
    headerVisibleMenuGroups: string;
    headerTickerRows: string;
    headerQuickLinks: string;
    headerMarketNav: string;
    headerUtilityNav: string;
    headerPrimaryCtaLabel: string;
    headerPrimaryCtaHref: string;
    headerHeadCode: string;
    footerSummary: string;
    footerLinks: string;
    stockSidebarMode: string;
    stockSidebarTitle: string;
    stockSidebarLinks: string;
    fundSidebarMode: string;
    fundSidebarTitle: string;
    fundSidebarLinks: string;
    ipoSidebarMode: string;
    ipoSidebarTitle: string;
    ipoSidebarLinks: string;
    indexSidebarMode: string;
    indexSidebarTitle: string;
    indexSidebarLinks: string;
    sharedSidebarEnabledPageCategories: string;
    sharedSidebarVisibleBlocks: string;
    sharedSidebarMarketDataMode: string;
    sharedSidebarIndiaRows: string;
    sharedSidebarGlobalRows: string;
    sharedSidebarTopGainersRows: string;
    sharedSidebarTopLosersRows: string;
    sharedSidebarPopularStocksRows: string;
  };
  supabase: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    googleClientId: string;
    googleClientSecret: string;
    googleOAuthConfigured: boolean;
  };
  marketData: {
    providerUrl: string;
    providerToken: string;
    refreshSecret: string;
    cronSecret: string;
    quoteEndpoint: string;
    ohlcvEndpoint: string;
    indexEndpoint: string;
    optionChainEndpoint: string;
    bhavcopyUrl: string;
    fundNavEndpoint: string;
  };
  referenceData: {
    nseBaseUrl: string;
    bseBaseUrl: string;
    amfiNavUrl: string;
    mfApiBaseUrl: string;
    mfApiCollectionUrl: string;
    bseQuoteApiUrl: string;
    goldApiUrl: string;
    alphaVantageApiKey: string;
    fxApiUrl: string;
    secondaryFxApiUrl: string;
    newsApiUrl: string;
    finnhubApiKey: string;
    filingsApiUrl: string;
    corporateAnnouncementsApiUrl: string;
    corporateActionsApiUrl: string;
  };
  billing: {
    razorpayKeyId: string;
    razorpayKeySecret: string;
    razorpayWebhookSecret: string;
    resendApiKey: string;
    resendAudienceId: string;
    invoicePrefix: string;
    billingSupportEmail: string;
  };
  charting: {
    tradingviewEnabled: boolean;
    tradingviewLibraryUrl: string;
    tradingviewBrokerConfigUrl: string;
    chartImageApiUrl: string;
    defaultExchange: string;
    defaultInterval: string;
    allowSymbolChange: boolean;
    nifty50Symbol: string;
    bankNiftySymbol: string;
    finNiftySymbol: string;
    sensexSymbol: string;
  };
  communications: {
    contactEmail: string;
    supportWhatsapp: string;
    telegramHandle: string;
    xHandle: string;
    youtubeChannelUrl: string;
    discordInviteUrl: string;
    pushProviderKey: string;
    feedbackInbox: string;
  };
  compliance: {
    privacyOwner: string;
    termsOwner: string;
    sebiRegistrationType: string;
    sebiRegistrationNumber: string;
    amfiRegistrationNumber: string;
    grievanceOfficerName: string;
    grievanceOfficerEmail: string;
    riskDisclosureUrl: string;
  };
  analytics: {
    gaMeasurementId: string;
    gtmContainerId: string;
    metaPixelId: string;
    posthogKey: string;
    posthogHost: string;
    msClarityId: string;
    searchConsoleVerification: string;
    speedInsightsEnabled: boolean;
    webVitalsEnabled: boolean;
  };
  ai: {
    openAiEnabled: boolean;
    openAiApiKey: string;
    openAiModel: string;
    anthropicEnabled: boolean;
    anthropicApiKey: string;
    aiGatewayUrl: string;
    embeddingsProvider: string;
    rerankerProvider: string;
  };
  automation: {
    cronEnabled: boolean;
    workflowEnabled: boolean;
    uptimeWebhookUrl: string;
    incidentWebhookUrl: string;
    backupBucketName: string;
    mediaStorageBucket: string;
    docsStorageBucket: string;
  };
  distribution: {
    appName: string;
    androidPackageName: string;
    playStoreUrl: string;
    appStoreUrl: string;
    chromeExtensionUrl: string;
    apkDownloadUrl: string;
    desktopAppUrl: string;
    statusPageUrl: string;
  };
  partners: {
    brokerApiBaseUrl: string;
    brokerApiKey: string;
    brokerWebhookSecret: string;
    smallcasePartnerId: string;
    affiliateNetworkUrl: string;
    referralCodeDefault: string;
    partnerOpsEmail: string;
    crmWebhookUrl: string;
  };
  researchOps: {
    earningsCalendarSourceUrl: string;
    ipoFeedUrl: string;
    portfolioDisclosureUrl: string;
    newsletterCmsUrl: string;
    webinarPlatformUrl: string;
    coursesPlatformUrl: string;
    documentAiApiUrl: string;
    transcriptProviderUrl: string;
  };
  updatedAt: string | null;
};

export const launchConfigSectionKeys: Array<keyof Omit<LaunchConfigStore, "updatedAt">> = [
  "basic",
  "content",
  "experience",
  "supabase",
  "marketData",
  "referenceData",
  "billing",
  "charting",
  "communications",
  "compliance",
  "analytics",
  "ai",
  "automation",
  "distribution",
  "partners",
  "researchOps",
];

const STORE_PATH = path.join(process.cwd(), "data", "launch-config.json");

const emptyStore: LaunchConfigStore = {
  basic: {
    siteUrl: "https://riddra.com",
    launchMode: "private_beta",
    supportEmail: "",
    adminEmails: "",
  },
  content: {
    defaultTitleTemplate: "%s | Riddra",
    defaultMetaDescription: "India-focused markets, research, tools, and workflows.",
    stockTitleTemplate: "{{name}} Share Price {{price}}, Charts, Fundamentals & Forecast | Riddra",
    stockMetaDescriptionTemplate:
      "Track {{name}} share price {{price}}, charts, quick stats, fundamentals, ownership, forecast and FAQs on Riddra.",
    fundTitleTemplate: "{{name}} NAV {{price}}, Returns, Holdings & Risk | Riddra",
    fundMetaDescriptionTemplate:
      "Track {{name}} NAV {{price}}, returns, holdings, allocation, benchmark context and FAQs on Riddra.",
    indexTitleTemplate: "{{name}} Live Levels, Charts & Composition | Riddra",
    indexMetaDescriptionTemplate:
      "Track {{name}} live levels, charts, composition and methodology context on Riddra.",
    blogBaseUrl: "",
    docsBaseUrl: "",
    canonicalHost: "https://riddra.com",
    ogImageBaseUrl: "",
    schemaOrganizationName: "Riddra",
    editorialCalendarUrl: "",
  },
  experience: {
    headerAnnouncement: "",
    headerBrandMark: "R",
    headerLogoUrl: "",
    headerLogoWidthPx: "28",
    headerBrandLabel: "Riddra",
    headerBrandHref: "/",
    headerVisibleMenuGroups: "markets\nstocks\nfunds\ntools\nlearn",
    headerTickerRows:
      "NIFTY 50|22,487.20|+0.74%|/nifty50\nSENSEX|73,904.55|+0.66%|/sensex\nBANKNIFTY|48,211.80|+0.92%|/banknifty\nFINNIFTY|22,541.10|+0.36%|/finnifty\nUSD/INR|83.19|-0.08%|/markets\nGOLD|₹71,842|+0.44%|/markets\nSILVER|₹81,420|+0.27%|/markets\nBRENT|$87.42|-0.22%|/markets\nDOW JONES|38,944.20|+0.31%|/markets\nHANG SENG|16,489.10|+0.58%|/markets\nSHANGHAI|3,062.84|-0.19%|/markets",
    headerQuickLinks: "Pricing|/pricing\nSearch|/search\nMarkets|/markets\nContact|/contact",
    headerMarketNav: "Home|/\nIndian Stocks|/stocks\nSensex|/sensex\nNifty50|/nifty50\nFinNifty|/finnifty\nBankNifty|/banknifty",
    headerUtilityNav: "Screener|/screener\nCourses|/courses\nCalculators|/tools\nCharts|/charts\nMarkets|/markets\nMutual Funds|/mutual-funds\nLearn|/learn\nNewsletter|/newsletter",
    headerPrimaryCtaLabel: "Open launch readiness",
    headerPrimaryCtaHref: "/launch-readiness",
    headerHeadCode: "",
    footerSummary:
      "Built on Next.js, Supabase, and Trigger.dev with official-source-first data planning and controlled launch execution.",
    footerLinks: "Launch Readiness|/launch-readiness\nMethodology|/methodology\nPrivacy|/privacy\nTerms|/terms\nContact|/contact",
    stockSidebarMode: "compare",
    stockSidebarTitle: "Stock page sidebar",
    stockSidebarLinks: "Stocks Hub|/stocks\nCharts|/charts\nSearch|/search",
    fundSidebarMode: "research",
    fundSidebarTitle: "Mutual-fund sidebar",
    fundSidebarLinks: "Mutual Funds|/mutual-funds\nFund Categories|/fund-categories\nMethodology|/methodology",
    ipoSidebarMode: "timeline",
    ipoSidebarTitle: "IPO page sidebar",
    ipoSidebarLinks: "IPO Hub|/ipo\nSME IPOs|/ipo/sme\nContact|/contact",
    indexSidebarMode: "weightage",
    indexSidebarTitle: "Index page sidebar",
    indexSidebarLinks: "Indices Hub|/indices\nNifty 50|/nifty50\nSensex|/sensex",
    sharedSidebarEnabledPageCategories:
      "markets\nhome\nstocks\nmutual_funds\nindices\nsearch\ncompare\ntools\ncharts\nreports\nsectors\npricing\nhelp_contact\nlegal\nuser_profiles\naccount\nportfolio\nipo\netfs\npms\naif\nsif\ncourses\nlearn\nwebinars\nnewsletter\nresearch_articles\nfallback\ncommunity\nmentorship",
    sharedSidebarVisibleBlocks:
      "market_snapshot\ntop_gainers\ntop_losers\npopular_stocks\npage_actions\nroute_links\nworkflow_checklist",
    sharedSidebarMarketDataMode: "manual_snapshot",
    sharedSidebarIndiaRows:
      "Nifty 50|22,487.20|+0.74%|/nifty50\nNifty Bank|48,211.80|+0.92%|/banknifty\nSensex|73,904.55|+0.66%|/sensex\nGift Nifty|22,541.10|+0.36%|/markets\nGold|₹71,842|+0.44%|/markets\nSilver|₹81,420|+0.27%|/markets",
    sharedSidebarGlobalRows:
      "Dow Jones|38,944.20|+0.31%|/markets\nUSD / INR|83.19|-0.08%|/markets\nBrent Oil|$87.42|-0.22%|/markets\nHang Seng|16,489.10|+0.58%|/markets\nBitcoin|$77,533.95|—|/markets\nEthereum|$2,323.19|—|/markets",
    sharedSidebarTopGainersRows:
      "Hindustan Unilever|₹2,240.00|hindustan-unilever\nPower Grid|₹318.15|power-grid\nReliance Industries|₹1,364.90|reliance-industries\nAsian Paints|₹2,471.60|asian-paints\nState Bank of India|₹1,080.30|state-bank-of-india",
    sharedSidebarTopLosersRows:
      "Wipro|₹458.10|wipro\nSun Pharma|₹1,722.40|sun-pharma\nBajaj Auto|₹8,944.10|bajaj-auto\nTata Motors|₹439.15|tata-motors\nHCLTech|₹1,611.85|hcltech",
    sharedSidebarPopularStocksRows:
      "Infosys|₹1,474.55|/stocks/infosys\nReliance Industries|₹1,364.90|/stocks/reliance-industries\nTata Motors|₹439.15|/stocks/tata-motors\nHDFC Bank|₹1,742.30|/stocks/hdfc-bank\nICICI Bank|₹1,118.40|/stocks/icici-bank",
  },
  supabase: {
    supabaseUrl: "",
    supabaseAnonKey: "",
    googleClientId: "",
    googleClientSecret: "",
    googleOAuthConfigured: false,
  },
  marketData: {
    providerUrl: "",
    providerToken: "",
    refreshSecret: "",
    cronSecret: "",
    quoteEndpoint: "https://www.nseindia.com/api/quote-equity?symbol=RELIANCE",
    ohlcvEndpoint: "",
    indexEndpoint: "https://www.nseindia.com/api/allIndices",
    optionChainEndpoint: "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY",
    bhavcopyUrl: "https://www.nseindia.com/all-reports",
    fundNavEndpoint: "https://api.mfapi.in/mf",
  },
  referenceData: {
    nseBaseUrl: "https://www.nseindia.com/api/",
    bseBaseUrl: "https://api.bseindia.com/",
    amfiNavUrl: "https://www.amfiindia.com/spages/NAVAll.txt",
    mfApiBaseUrl: "https://api.mfapi.in/",
    mfApiCollectionUrl: "https://api.mfapi.in/mf",
    bseQuoteApiUrl: "https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=500325",
    goldApiUrl: "https://www.alphavantage.co/query?function=COMMODITY_EXCHANGE_RATE",
    alphaVantageApiKey: "",
    fxApiUrl: "https://api.exchangerate.host/latest",
    secondaryFxApiUrl: "https://open.er-api.com/v6/latest/USD",
    newsApiUrl: "https://finnhub.io/api/v1/news",
    finnhubApiKey: "",
    filingsApiUrl: "https://www.nseindia.com/api/corporate-announcements",
    corporateAnnouncementsApiUrl: "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w",
    corporateActionsApiUrl: "https://www.nseindia.com/api/corporates-corporateActions",
  },
  billing: {
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
    resendApiKey: "",
    resendAudienceId: "",
    invoicePrefix: "",
    billingSupportEmail: "",
  },
  charting: {
    tradingviewEnabled: false,
    tradingviewLibraryUrl: "",
    tradingviewBrokerConfigUrl: "",
    chartImageApiUrl: "",
    defaultExchange: "",
    defaultInterval: "",
    allowSymbolChange: true,
    nifty50Symbol: "",
    bankNiftySymbol: "",
    finNiftySymbol: "",
    sensexSymbol: "",
  },
  communications: {
    contactEmail: "",
    supportWhatsapp: "",
    telegramHandle: "",
    xHandle: "",
    youtubeChannelUrl: "",
    discordInviteUrl: "",
    pushProviderKey: "",
    feedbackInbox: "",
  },
  compliance: {
    privacyOwner: "",
    termsOwner: "",
    sebiRegistrationType: "",
    sebiRegistrationNumber: "",
    amfiRegistrationNumber: "",
    grievanceOfficerName: "",
    grievanceOfficerEmail: "",
    riskDisclosureUrl: "",
  },
  analytics: {
    gaMeasurementId: "",
    gtmContainerId: "",
    metaPixelId: "",
    posthogKey: "",
    posthogHost: "",
    msClarityId: "",
    searchConsoleVerification: "",
    speedInsightsEnabled: false,
    webVitalsEnabled: false,
  },
  ai: {
    openAiEnabled: false,
    openAiApiKey: "",
    openAiModel: "",
    anthropicEnabled: false,
    anthropicApiKey: "",
    aiGatewayUrl: "",
    embeddingsProvider: "",
    rerankerProvider: "",
  },
  automation: {
    cronEnabled: false,
    workflowEnabled: false,
    uptimeWebhookUrl: "",
    incidentWebhookUrl: "",
    backupBucketName: "riddra-backups",
    mediaStorageBucket: "riddra-media",
    docsStorageBucket: "riddra-docs",
  },
  distribution: {
    appName: "Riddra",
    androidPackageName: "com.riddra.app",
    playStoreUrl: "",
    appStoreUrl: "",
    chromeExtensionUrl: "",
    apkDownloadUrl: "",
    desktopAppUrl: "",
    statusPageUrl: "",
  },
  partners: {
    brokerApiBaseUrl: "",
    brokerApiKey: "",
    brokerWebhookSecret: "",
    smallcasePartnerId: "",
    affiliateNetworkUrl: "",
    referralCodeDefault: "",
    partnerOpsEmail: "",
    crmWebhookUrl: "",
  },
  researchOps: {
    earningsCalendarSourceUrl: "",
    ipoFeedUrl: "",
    portfolioDisclosureUrl: "",
    newsletterCmsUrl: "",
    webinarPlatformUrl: "",
    coursesPlatformUrl: "",
    documentAiApiUrl: "",
    transcriptProviderUrl: "",
  },
  updatedAt: null,
};

async function readStore(): Promise<LaunchConfigStore> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<LaunchConfigStore>;

    return {
      basic: { ...emptyStore.basic, ...(parsed.basic ?? {}) },
      content: { ...emptyStore.content, ...(parsed.content ?? {}) },
      experience: { ...emptyStore.experience, ...(parsed.experience ?? {}) },
      supabase: { ...emptyStore.supabase, ...(parsed.supabase ?? {}) },
      marketData: { ...emptyStore.marketData, ...(parsed.marketData ?? {}) },
      referenceData: { ...emptyStore.referenceData, ...(parsed.referenceData ?? {}) },
      billing: { ...emptyStore.billing, ...(parsed.billing ?? {}) },
      charting: { ...emptyStore.charting, ...(parsed.charting ?? {}) },
      communications: { ...emptyStore.communications, ...(parsed.communications ?? {}) },
      compliance: { ...emptyStore.compliance, ...(parsed.compliance ?? {}) },
      analytics: { ...emptyStore.analytics, ...(parsed.analytics ?? {}) },
      ai: { ...emptyStore.ai, ...(parsed.ai ?? {}) },
      automation: { ...emptyStore.automation, ...(parsed.automation ?? {}) },
      distribution: { ...emptyStore.distribution, ...(parsed.distribution ?? {}) },
      partners: { ...emptyStore.partners, ...(parsed.partners ?? {}) },
      researchOps: { ...emptyStore.researchOps, ...(parsed.researchOps ?? {}) },
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return emptyStore;
  }
}

async function writeStore(store: LaunchConfigStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getLaunchConfigStore() {
  const fallbackStore = await readStore();

  if (!hasDurableCmsStateStore()) {
    return fallbackStore;
  }

  const durableSections = await listDurableLaunchConfigSections();
  if (!durableSections) {
    return fallbackStore;
  }

  if (!durableSections.length) {
    await Promise.all(
      launchConfigSectionKeys.map(async (section) => {
        await saveDurableLaunchConfigSection(section, fallbackStore[section]);
      }),
    );
    return fallbackStore;
  }

  return durableSections.reduce<LaunchConfigStore>(
    (result, item) => ({
      ...result,
      [item.section]: {
        ...result[item.section],
        ...item.data,
      },
      updatedAt:
        item.updatedAt && (!result.updatedAt || item.updatedAt > result.updatedAt)
          ? item.updatedAt
          : result.updatedAt,
    }),
    {
      ...emptyStore,
      ...fallbackStore,
    },
  );
}

export async function saveLaunchConfigSection<
  TSection extends keyof Omit<LaunchConfigStore, "updatedAt">,
>(
  section: TSection,
  data: LaunchConfigStore[TSection],
) {
  const store = await getLaunchConfigStore();
  const updatedAt = new Date().toISOString();
  const nextStore: LaunchConfigStore = {
    ...store,
    [section]: data,
    updatedAt,
  };

  if (hasDurableCmsStateStore()) {
    await saveDurableLaunchConfigSection(section, data);
  }

  await writeStore(nextStore);
  return nextStore;
}

export function countConfiguredValues(store: LaunchConfigStore) {
  const values = launchConfigSectionKeys.flatMap((section) => Object.values(store[section]));

  return values.filter((value) => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return value === true;
  }).length;
}
