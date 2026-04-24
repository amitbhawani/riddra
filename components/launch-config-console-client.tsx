"use client";

import { useEffect, useState, useTransition } from "react";

type LaunchConfigPayload = {
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
    headerQuickLinks: string;
    headerMarketNav: string;
    headerUtilityNav: string;
    headerPrimaryCtaLabel: string;
    headerPrimaryCtaHref: string;
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
    sharedSidebarVisibleBlocks: string;
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

type ConfigSection = keyof Omit<LaunchConfigPayload, "updatedAt">;

type SectionField = {
  name: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "checkbox" | "select";
  options?: Array<{ label: string; value: string }>;
};

type SectionDefinition = {
  key: ConfigSection;
  title: string;
  description: string;
  saveLabel: string;
  fields: SectionField[];
};

const emptyPayload: LaunchConfigPayload = {
  basic: {
    siteUrl: "",
    launchMode: "",
    supportEmail: "",
    adminEmails: "",
  },
  content: {
    defaultTitleTemplate: "",
    defaultMetaDescription: "",
    stockTitleTemplate: "",
    stockMetaDescriptionTemplate: "",
    fundTitleTemplate: "",
    fundMetaDescriptionTemplate: "",
    indexTitleTemplate: "",
    indexMetaDescriptionTemplate: "",
    blogBaseUrl: "",
    docsBaseUrl: "",
    canonicalHost: "",
    ogImageBaseUrl: "",
    schemaOrganizationName: "",
    editorialCalendarUrl: "",
  },
  experience: {
    headerAnnouncement: "",
    headerQuickLinks: "",
    headerMarketNav: "",
    headerUtilityNav: "",
    headerPrimaryCtaLabel: "",
    headerPrimaryCtaHref: "",
    footerSummary: "",
    footerLinks: "",
    stockSidebarMode: "compare",
    stockSidebarTitle: "",
    stockSidebarLinks: "",
    fundSidebarMode: "research",
    fundSidebarTitle: "",
    fundSidebarLinks: "",
    ipoSidebarMode: "timeline",
    ipoSidebarTitle: "",
    ipoSidebarLinks: "",
    indexSidebarMode: "weightage",
    indexSidebarTitle: "",
    indexSidebarLinks: "",
    sharedSidebarVisibleBlocks:
      "market_snapshot\npage_actions\nroute_links\nworkflow_checklist",
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
    quoteEndpoint: "",
    ohlcvEndpoint: "",
    indexEndpoint: "",
    optionChainEndpoint: "",
    bhavcopyUrl: "",
    fundNavEndpoint: "",
  },
  referenceData: {
    nseBaseUrl: "",
    bseBaseUrl: "",
    amfiNavUrl: "",
    mfApiBaseUrl: "",
    mfApiCollectionUrl: "",
    bseQuoteApiUrl: "",
    goldApiUrl: "",
    alphaVantageApiKey: "",
    fxApiUrl: "",
    secondaryFxApiUrl: "",
    newsApiUrl: "",
    finnhubApiKey: "",
    filingsApiUrl: "",
    corporateAnnouncementsApiUrl: "",
    corporateActionsApiUrl: "",
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
    backupBucketName: "",
    mediaStorageBucket: "",
    docsStorageBucket: "",
  },
  distribution: {
    appName: "",
    androidPackageName: "",
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

const sectionDefinitions: SectionDefinition[] = [
  {
    key: "basic",
    title: "Basic launch settings",
    description: "Set the public site identity, launch mode, support mailbox, and admin emails for the operator layer.",
    saveLabel: "Save basic settings",
    fields: [
      { name: "siteUrl", label: "Site URL", placeholder: "https://riddra.com", type: "text" },
      { name: "launchMode", label: "Launch mode", placeholder: "curated_beta, private_demo, or public_beta", type: "text" },
      { name: "supportEmail", label: "Support email", placeholder: "support@riddra.com", type: "text" },
      { name: "adminEmails", label: "Admin emails", placeholder: "amitbhawani@gmail.com, secondadmin@example.com", type: "textarea" },
    ],
  },
  {
    key: "content",
    title: "Content, SEO, and brand surfaces",
    description:
      "Use this for default metadata, canonical hosts, docs or blog destinations, OG assets, and editorial planning links. Templates support %s plus tokens like {{name}}, {{symbol}}, {{price}}, {{sector}}, {{category}}, {{benchmark}}, {{route}}, {{brand}}, {{site}}, and {{summary}}.",
    saveLabel: "Save content settings",
    fields: [
      { name: "defaultTitleTemplate", label: "Default title template", placeholder: "%s | Riddra", type: "text" },
      { name: "defaultMetaDescription", label: "Default meta description", placeholder: "India-focused markets, research, tools, and workflows.", type: "textarea" },
      {
        name: "stockTitleTemplate",
        label: "Stock page title template",
        placeholder: "{{name}} Share Price {{price}}, Charts, Fundamentals & Forecast | Riddra",
        type: "text",
      },
      {
        name: "stockMetaDescriptionTemplate",
        label: "Stock page meta description template",
        placeholder: "Track {{name}} share price {{price}}, charts, quick stats, fundamentals, ownership, forecast and FAQs on Riddra.",
        type: "textarea",
      },
      {
        name: "fundTitleTemplate",
        label: "Mutual-fund title template",
        placeholder: "{{name}} NAV {{price}}, Returns, Holdings & Risk | Riddra",
        type: "text",
      },
      {
        name: "fundMetaDescriptionTemplate",
        label: "Mutual-fund meta description template",
        placeholder: "Track {{name}} NAV {{price}}, returns, holdings, allocation, benchmark context and FAQs on Riddra.",
        type: "textarea",
      },
      {
        name: "indexTitleTemplate",
        label: "Index page title template",
        placeholder: "{{name}} Live Levels, Charts & Composition | Riddra",
        type: "text",
      },
      {
        name: "indexMetaDescriptionTemplate",
        label: "Index page meta description template",
        placeholder: "Track {{name}} live levels, charts, composition and methodology context on Riddra.",
        type: "textarea",
      },
      { name: "blogBaseUrl", label: "Blog base URL", placeholder: "https://riddra.com/blog", type: "text" },
      { name: "docsBaseUrl", label: "Docs base URL", placeholder: "https://riddra.com/docs", type: "text" },
      { name: "canonicalHost", label: "Canonical host", placeholder: "https://riddra.com", type: "text" },
      { name: "ogImageBaseUrl", label: "OG image base URL", placeholder: "https://riddra.com/og", type: "text" },
      { name: "schemaOrganizationName", label: "Schema organization name", placeholder: "Riddra Technologies", type: "text" },
      { name: "editorialCalendarUrl", label: "Editorial calendar URL", placeholder: "Notion, Airtable, or sheet link", type: "text" },
    ],
  },
  {
    key: "experience",
    title: "Site chrome and page layouts",
    description: "Manage the header, footer, and default sidebar behavior for stock, fund, IPO, and index pages from one backend-owned place.",
    saveLabel: "Save site experience settings",
    fields: [
      { name: "headerAnnouncement", label: "Header announcement strip", placeholder: "Optional top strip message for maintenance, beta posture, or campaign context", type: "textarea" },
      { name: "headerQuickLinks", label: "Header quick links", placeholder: "Pricing|/pricing\nSearch|/search\nMarkets|/markets", type: "textarea" },
      { name: "headerMarketNav", label: "Header market row links", placeholder: "Home|/\nIndian Stocks|/stocks\nSensex|/sensex\nNifty50|/nifty50", type: "textarea" },
      { name: "headerUtilityNav", label: "Header utility row links", placeholder: "Screener|/screener\nCourses|/courses\nCalculators|/tools", type: "textarea" },
      { name: "headerPrimaryCtaLabel", label: "Header primary CTA label", placeholder: "Open launch readiness", type: "text" },
      { name: "headerPrimaryCtaHref", label: "Header primary CTA href", placeholder: "/launch-readiness", type: "text" },
      { name: "footerSummary", label: "Footer summary text", placeholder: "Footer summary shown across the site", type: "textarea" },
      { name: "footerLinks", label: "Footer links", placeholder: "Launch Readiness|/launch-readiness\nMethodology|/methodology\nContact|/contact", type: "textarea" },
      {
        name: "stockSidebarMode",
        label: "Stock page sidebar preset",
        type: "select",
        options: [
          { label: "Compare", value: "compare" },
          { label: "Research", value: "research" },
          { label: "Support", value: "support" },
          { label: "Conversion", value: "conversion" },
          { label: "Hidden", value: "hidden" },
        ],
      },
      { name: "stockSidebarTitle", label: "Stock page sidebar title", placeholder: "Stock page sidebar", type: "text" },
      { name: "stockSidebarLinks", label: "Stock page sidebar links", placeholder: "Stocks Hub|/stocks\nCharts|/charts\nSearch|/search", type: "textarea" },
      {
        name: "fundSidebarMode",
        label: "Mutual-fund page sidebar preset",
        type: "select",
        options: [
          { label: "Research", value: "research" },
          { label: "Compare", value: "compare" },
          { label: "Support", value: "support" },
          { label: "Conversion", value: "conversion" },
          { label: "Hidden", value: "hidden" },
        ],
      },
      { name: "fundSidebarTitle", label: "Mutual-fund sidebar title", placeholder: "Mutual-fund sidebar", type: "text" },
      { name: "fundSidebarLinks", label: "Mutual-fund sidebar links", placeholder: "Mutual Funds|/mutual-funds\nFund Categories|/fund-categories\nMethodology|/methodology", type: "textarea" },
      {
        name: "ipoSidebarMode",
        label: "IPO page sidebar preset",
        type: "select",
        options: [
          { label: "Timeline", value: "timeline" },
          { label: "Research", value: "research" },
          { label: "Support", value: "support" },
          { label: "Conversion", value: "conversion" },
          { label: "Hidden", value: "hidden" },
        ],
      },
      { name: "ipoSidebarTitle", label: "IPO page sidebar title", placeholder: "IPO page sidebar", type: "text" },
      { name: "ipoSidebarLinks", label: "IPO page sidebar links", placeholder: "IPO Hub|/ipo\nSME IPOs|/ipo/sme\nContact|/contact", type: "textarea" },
      {
        name: "indexSidebarMode",
        label: "Index page sidebar preset",
        type: "select",
        options: [
          { label: "Weightage", value: "weightage" },
          { label: "Research", value: "research" },
          { label: "Support", value: "support" },
          { label: "Conversion", value: "conversion" },
          { label: "Hidden", value: "hidden" },
        ],
      },
      { name: "indexSidebarTitle", label: "Index page sidebar title", placeholder: "Index page sidebar", type: "text" },
      { name: "indexSidebarLinks", label: "Index page sidebar links", placeholder: "Indices Hub|/indices\nNifty 50|/nifty50\nSensex|/sensex", type: "textarea" },
    ],
  },
  {
    key: "supabase",
    title: "Supabase and auth",
    description: "Paste your Supabase public project access and Google sign-in settings here. Service-role access now loads from environment variables only.",
    saveLabel: "Save auth settings",
    fields: [
      { name: "supabaseUrl", label: "Supabase URL", placeholder: "https://project.supabase.co", type: "text" },
      { name: "supabaseAnonKey", label: "Supabase anon key", placeholder: "Paste anon key", type: "textarea" },
      { name: "googleClientId", label: "Google client ID", placeholder: "Google OAuth client ID", type: "text" },
      { name: "googleClientSecret", label: "Google client secret", placeholder: "Google OAuth client secret", type: "text" },
      { name: "googleOAuthConfigured", label: "Google OAuth configured in Supabase", type: "checkbox" },
    ],
  },
  {
    key: "marketData",
    title: "Market-data provider",
    description: "Use this section for the normalized provider endpoint, auth secrets, and the India-market routes you want available for quotes, indices, option chain, bhavcopy, and mutual-fund refresh jobs.",
    saveLabel: "Save market-data settings",
    fields: [
      { name: "providerUrl", label: "Provider base URL", placeholder: "Optional normalized backend endpoint or aggregator URL", type: "text" },
      { name: "providerToken", label: "Provider token", placeholder: "Optional bearer token or API key", type: "text" },
      { name: "refreshSecret", label: "Refresh secret", placeholder: "Signed refresh secret", type: "text" },
      { name: "cronSecret", label: "Cron secret", placeholder: "Cron execution secret", type: "text" },
      { name: "quoteEndpoint", label: "Stock quote endpoint", placeholder: "https://www.nseindia.com/api/quote-equity?symbol=RELIANCE", type: "text" },
      { name: "ohlcvEndpoint", label: "Stock OHLCV or history endpoint", placeholder: "Optional normalized OHLCV or history endpoint", type: "text" },
      { name: "indexEndpoint", label: "All indices endpoint", placeholder: "https://www.nseindia.com/api/allIndices", type: "text" },
      { name: "optionChainEndpoint", label: "Option chain endpoint", placeholder: "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY", type: "text" },
      { name: "bhavcopyUrl", label: "Bhavcopy or reports URL", placeholder: "https://www.nseindia.com/all-reports", type: "text" },
      { name: "fundNavEndpoint", label: "Fund NAV endpoint", placeholder: "https://api.mfapi.in/mf", type: "text" },
    ],
  },
  {
    key: "referenceData",
    title: "Reference data sources",
    description: "Add official and fallback reference endpoints plus keyed-source credentials for NSE, BSE, AMFI, MFAPI, FX, metals, news, filings, announcements, and corporate actions.",
    saveLabel: "Save reference-data settings",
    fields: [
      { name: "nseBaseUrl", label: "NSE base URL", placeholder: "https://www.nseindia.com/api/", type: "text" },
      { name: "bseBaseUrl", label: "BSE base URL", placeholder: "https://api.bseindia.com/", type: "text" },
      { name: "amfiNavUrl", label: "AMFI official NAV URL", placeholder: "https://www.amfiindia.com/spages/NAVAll.txt", type: "text" },
      { name: "mfApiBaseUrl", label: "MFAPI base URL", placeholder: "https://api.mfapi.in/", type: "text" },
      { name: "mfApiCollectionUrl", label: "MFAPI collection URL", placeholder: "https://api.mfapi.in/mf", type: "text" },
      { name: "bseQuoteApiUrl", label: "BSE stock quote URL", placeholder: "https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w?scripcode=500325", type: "text" },
      { name: "goldApiUrl", label: "Gold or metals API URL", placeholder: "https://www.alphavantage.co/query?function=COMMODITY_EXCHANGE_RATE", type: "text" },
      { name: "alphaVantageApiKey", label: "Alpha Vantage API key", placeholder: "Paste Alpha Vantage API key", type: "text" },
      { name: "fxApiUrl", label: "FX API URL", placeholder: "https://api.exchangerate.host/latest", type: "text" },
      { name: "secondaryFxApiUrl", label: "Fallback FX API URL", placeholder: "https://open.er-api.com/v6/latest/USD", type: "text" },
      { name: "newsApiUrl", label: "News API URL", placeholder: "https://finnhub.io/api/v1/news", type: "text" },
      { name: "finnhubApiKey", label: "Finnhub API key", placeholder: "Paste Finnhub API token", type: "text" },
      { name: "filingsApiUrl", label: "Corporate filings URL", placeholder: "https://www.nseindia.com/api/corporate-announcements", type: "text" },
      { name: "corporateAnnouncementsApiUrl", label: "Corporate announcements URL", placeholder: "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w", type: "text" },
      { name: "corporateActionsApiUrl", label: "Corporate actions URL", placeholder: "https://www.nseindia.com/api/corporates-corporateActions", type: "text" },
    ],
  },
  {
    key: "billing",
    title: "Billing and email delivery",
    description: "Store payments, transactional email, and invoice-related settings here so subscriber flows can move into real activation.",
    saveLabel: "Save billing settings",
    fields: [
      { name: "razorpayKeyId", label: "Razorpay key ID", placeholder: "rzp_live_...", type: "text" },
      { name: "razorpayKeySecret", label: "Razorpay key secret", placeholder: "Razorpay secret", type: "text" },
      { name: "razorpayWebhookSecret", label: "Razorpay webhook secret", placeholder: "Webhook signing secret", type: "text" },
      { name: "resendApiKey", label: "Resend API key", placeholder: "re_...", type: "text" },
      { name: "resendAudienceId", label: "Resend audience ID", placeholder: "Audience or contact list ID", type: "text" },
      { name: "invoicePrefix", label: "Invoice prefix", placeholder: "RID-2026-", type: "text" },
      { name: "billingSupportEmail", label: "Billing support email", placeholder: "billing@riddra.com", type: "text" },
    ],
  },
  {
    key: "charting",
    title: "Charting and visual market embeds",
    description: "Configure the free hosted TradingView widget path now, keep index-specific symbol overrides editable from admin, and leave room for later self-hosted library or custom datafeed work.",
    saveLabel: "Save charting settings",
    fields: [
      { name: "tradingviewEnabled", label: "TradingView enabled", type: "checkbox" },
      { name: "tradingviewLibraryUrl", label: "TradingView script or library URL", placeholder: "https://s3.tradingview.com/tv.js", type: "text" },
      { name: "tradingviewBrokerConfigUrl", label: "Future broker or custom datafeed URL", placeholder: "Optional datafeed URL", type: "text" },
      { name: "chartImageApiUrl", label: "Chart image API URL", placeholder: "Optional chart snapshot endpoint", type: "text" },
      { name: "defaultExchange", label: "Default exchange", placeholder: "NSE", type: "text" },
      { name: "defaultInterval", label: "Default interval", placeholder: "D", type: "text" },
      { name: "allowSymbolChange", label: "Allow symbol change in chart widgets", type: "checkbox" },
      { name: "nifty50Symbol", label: "Nifty 50 TradingView symbol", placeholder: "Override for Nifty 50 chart route", type: "text" },
      { name: "bankNiftySymbol", label: "Bank Nifty TradingView symbol", placeholder: "Override for Bank Nifty chart route", type: "text" },
      { name: "finNiftySymbol", label: "Fin Nifty TradingView symbol", placeholder: "Override for Fin Nifty chart route", type: "text" },
      { name: "sensexSymbol", label: "Sensex TradingView symbol", placeholder: "Override for Sensex chart route", type: "text" },
    ],
  },
  {
    key: "communications",
    title: "Community and communication channels",
    description: "Add the public contact and distribution channels you may want across support, community, feedback, and launch campaigns.",
    saveLabel: "Save communication settings",
    fields: [
      { name: "contactEmail", label: "Contact email", placeholder: "hello@riddra.com", type: "text" },
      { name: "supportWhatsapp", label: "Support WhatsApp", placeholder: "+91...", type: "text" },
      { name: "telegramHandle", label: "Telegram handle", placeholder: "@riddra", type: "text" },
      { name: "xHandle", label: "X handle", placeholder: "@riddra", type: "text" },
      { name: "youtubeChannelUrl", label: "YouTube channel URL", placeholder: "https://youtube.com/...", type: "text" },
      { name: "discordInviteUrl", label: "Discord invite URL", placeholder: "https://discord.gg/...", type: "text" },
      { name: "pushProviderKey", label: "Push provider key", placeholder: "OneSignal / FCM / Push key", type: "text" },
      { name: "feedbackInbox", label: "Feedback inbox", placeholder: "feedback@riddra.com", type: "text" },
    ],
  },
  {
    key: "compliance",
    title: "Compliance, legal, and disclosures",
    description: "Keep future legal and regulatory references here so trust pages, disclosures, and escalation paths can become production-grade later.",
    saveLabel: "Save compliance settings",
    fields: [
      { name: "privacyOwner", label: "Privacy policy owner", placeholder: "Legal, Ops, or founder name", type: "text" },
      { name: "termsOwner", label: "Terms owner", placeholder: "Legal, Ops, or founder name", type: "text" },
      { name: "sebiRegistrationType", label: "SEBI registration type", placeholder: "RIA, RA, distributor, or none yet", type: "text" },
      { name: "sebiRegistrationNumber", label: "SEBI registration number", placeholder: "Registration number", type: "text" },
      { name: "amfiRegistrationNumber", label: "AMFI registration number", placeholder: "ARN or partner ARN", type: "text" },
      { name: "grievanceOfficerName", label: "Grievance officer name", placeholder: "Officer or team owner", type: "text" },
      { name: "grievanceOfficerEmail", label: "Grievance officer email", placeholder: "grievance@riddra.com", type: "text" },
      { name: "riskDisclosureUrl", label: "Risk disclosure URL", placeholder: "https://riddra.com/risk-disclosure", type: "text" },
    ],
  },
  {
    key: "analytics",
    title: "Analytics and measurement",
    description: "Keep your analytics and measurement IDs here for acquisition, funnel, performance, and search-console visibility.",
    saveLabel: "Save analytics settings",
    fields: [
      { name: "gaMeasurementId", label: "GA measurement ID", placeholder: "G-XXXXXXXXXX", type: "text" },
      { name: "gtmContainerId", label: "GTM container ID", placeholder: "GTM-XXXXXXX", type: "text" },
      { name: "metaPixelId", label: "Meta pixel ID", placeholder: "1234567890", type: "text" },
      { name: "posthogKey", label: "PostHog key", placeholder: "phc_...", type: "text" },
      { name: "posthogHost", label: "PostHog host", placeholder: "https://app.posthog.com", type: "text" },
      { name: "msClarityId", label: "Microsoft Clarity ID", placeholder: "clarity project ID", type: "text" },
      { name: "searchConsoleVerification", label: "Search Console verification", placeholder: "verification token", type: "text" },
      { name: "speedInsightsEnabled", label: "Speed Insights enabled", type: "checkbox" },
      { name: "webVitalsEnabled", label: "Web vitals collection enabled", type: "checkbox" },
    ],
  },
  {
    key: "ai",
    title: "AI, summarization, and ranking",
    description: "Use this block for AI providers you may want later for summaries, ranking, embeddings, reranking, and agent workflows.",
    saveLabel: "Save AI settings",
    fields: [
      { name: "openAiEnabled", label: "OpenAI enabled", type: "checkbox" },
      { name: "openAiApiKey", label: "OpenAI API key", placeholder: "sk-...", type: "text" },
      { name: "openAiModel", label: "Default OpenAI model", placeholder: "gpt-5.4-mini", type: "text" },
      { name: "anthropicEnabled", label: "Anthropic enabled", type: "checkbox" },
      { name: "anthropicApiKey", label: "Anthropic API key", placeholder: "sk-ant-...", type: "text" },
      { name: "aiGatewayUrl", label: "AI gateway URL", placeholder: "Optional unified AI gateway", type: "text" },
      { name: "embeddingsProvider", label: "Embeddings provider", placeholder: "OpenAI, Voyage, Cohere, etc.", type: "text" },
      { name: "rerankerProvider", label: "Reranker provider", placeholder: "Cohere, Jina, etc.", type: "text" },
    ],
  },
  {
    key: "automation",
    title: "Ops automation and storage",
    description: "Use this section for cron, workflow, incident, backup, media, and document-storage settings that can support launch ops later.",
    saveLabel: "Save automation settings",
    fields: [
      { name: "cronEnabled", label: "Cron execution enabled", type: "checkbox" },
      { name: "workflowEnabled", label: "Workflow automation enabled", type: "checkbox" },
      { name: "uptimeWebhookUrl", label: "Uptime webhook URL", placeholder: "Opsgenie / Slack / custom webhook", type: "text" },
      { name: "incidentWebhookUrl", label: "Incident webhook URL", placeholder: "Incident escalation webhook", type: "text" },
      { name: "backupBucketName", label: "Backup bucket name", placeholder: "riddra-backups", type: "text" },
      { name: "mediaStorageBucket", label: "Media storage bucket", placeholder: "riddra-media", type: "text" },
      { name: "docsStorageBucket", label: "Docs storage bucket", placeholder: "riddra-docs", type: "text" },
    ],
  },
  {
    key: "distribution",
    title: "Apps, distribution, and status surfaces",
    description: "Store rollout links and package identities for mobile, desktop, browser extensions, APK distribution, and public status communication.",
    saveLabel: "Save distribution settings",
    fields: [
      { name: "appName", label: "Public app name", placeholder: "Riddra", type: "text" },
      { name: "androidPackageName", label: "Android package name", placeholder: "com.riddra.app", type: "text" },
      { name: "playStoreUrl", label: "Play Store URL", placeholder: "https://play.google.com/store/apps/...", type: "text" },
      { name: "appStoreUrl", label: "App Store URL", placeholder: "https://apps.apple.com/...", type: "text" },
      { name: "chromeExtensionUrl", label: "Chrome extension URL", placeholder: "https://chromewebstore.google.com/...", type: "text" },
      { name: "apkDownloadUrl", label: "Direct APK URL", placeholder: "https://downloads.riddra.com/app.apk", type: "text" },
      { name: "desktopAppUrl", label: "Desktop app URL", placeholder: "https://riddra.com/desktop", type: "text" },
      { name: "statusPageUrl", label: "Status page URL", placeholder: "https://status.riddra.com", type: "text" },
    ],
  },
  {
    key: "partners",
    title: "Broker, partner, and growth integrations",
    description: "Add future partner or broker hooks here so the platform can evolve into portfolio imports, referrals, affiliate, CRM, and brokerage integrations without losing structure.",
    saveLabel: "Save partner settings",
    fields: [
      { name: "brokerApiBaseUrl", label: "Broker API base URL", placeholder: "https://broker.example.com/api", type: "text" },
      { name: "brokerApiKey", label: "Broker API key", placeholder: "Broker or aggregator key", type: "text" },
      { name: "brokerWebhookSecret", label: "Broker webhook secret", placeholder: "Webhook signing secret", type: "text" },
      { name: "smallcasePartnerId", label: "Partner or smallcase ID", placeholder: "Partner identifier", type: "text" },
      { name: "affiliateNetworkUrl", label: "Affiliate network URL", placeholder: "PartnerStack, Impact, etc.", type: "text" },
      { name: "referralCodeDefault", label: "Default referral code", placeholder: "RIDDRAVIP", type: "text" },
      { name: "partnerOpsEmail", label: "Partner ops email", placeholder: "partners@riddra.com", type: "text" },
      { name: "crmWebhookUrl", label: "CRM webhook URL", placeholder: "HubSpot, Salesforce, or custom webhook", type: "text" },
    ],
  },
  {
    key: "researchOps",
    title: "Research, events, and content operations",
    description: "Keep research-source and editorial-operating links here for earnings, IPOs, newsletters, webinars, courses, documents, and transcript workflows.",
    saveLabel: "Save research ops settings",
    fields: [
      { name: "earningsCalendarSourceUrl", label: "Earnings calendar source URL", placeholder: "Official or partner source URL", type: "text" },
      { name: "ipoFeedUrl", label: "IPO feed URL", placeholder: "IPO source or issue-calendar endpoint", type: "text" },
      { name: "portfolioDisclosureUrl", label: "Portfolio disclosure URL", placeholder: "Disclosure or holdings policy URL", type: "text" },
      { name: "newsletterCmsUrl", label: "Newsletter CMS URL", placeholder: "Beehiiv, Substack, or CMS link", type: "text" },
      { name: "webinarPlatformUrl", label: "Webinar platform URL", placeholder: "Zoom, Riverside, Airmeet, etc.", type: "text" },
      { name: "coursesPlatformUrl", label: "Courses platform URL", placeholder: "Course host or LMS link", type: "text" },
      { name: "documentAiApiUrl", label: "Document AI API URL", placeholder: "OCR or parser endpoint", type: "text" },
      { name: "transcriptProviderUrl", label: "Transcript provider URL", placeholder: "AssemblyAI, Deepgram, or custom URL", type: "text" },
    ],
  },
];

function inputClassName() {
  return "h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none placeholder:text-[#9ca3af] transition focus:border-[#2563eb] focus:bg-white";
}

function getFieldValue(
  payload: LaunchConfigPayload,
  section: ConfigSection,
  field: SectionField,
) {
  const value = payload[section][field.name as keyof LaunchConfigPayload[ConfigSection]];
  return typeof value === "boolean" ? value : String(value ?? "");
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not saved yet";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

async function fetchPayload(): Promise<LaunchConfigPayload> {
  const response = await fetch("/api/admin/launch-config", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load launch config.");
  }

  return (await response.json()) as LaunchConfigPayload;
}

function countSectionValues(values: Record<string, unknown>) {
  return Object.values(values).filter((value) => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return value === true;
  }).length;
}

export function LaunchConfigConsoleClient() {
  const [payload, setPayload] = useState<LaunchConfigPayload>(emptyPayload);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      fetchPayload()
        .then(setPayload)
        .catch((loadError) => {
          setError(loadError instanceof Error ? loadError.message : "Unable to load launch config.");
        });
    });
  }, []);

  const saveSection = (
    section: ConfigSection,
    fields: SectionField[],
    formData: FormData,
    message: string,
  ) => {
    setNotice(null);
    setError(null);

    const data = Object.fromEntries(
      fields.map((field) => [
        field.name,
        field.type === "checkbox" ? formData.get(field.name) === "on" : formData.get(field.name),
      ]),
    );

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/launch-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, data }),
        });
        const next = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof next.error === "string" ? next.error : "Save failed.");
        }

        setNotice(message);
        setPayload(await fetchPayload());
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Save failed.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {notice ? (
        <div className="rounded-lg border border-[#bbf7d0] bg-[#ecfdf5] px-[14px] py-3 text-sm text-[#166534]">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-[14px] py-3 text-sm text-[#b91c1c]">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#d1d5db] bg-white px-[14px] py-3 text-sm text-[#4b5563] shadow-sm">
        Last saved: <span className="font-medium text-[#111827]">{formatTimestamp(payload.updatedAt)}</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {sectionDefinitions.map((section) => {
          const sectionValues = payload[section.key] as Record<string, unknown>;

          return (
            <section key={section.key} className="rounded-lg border border-[#d1d5db] bg-white p-[14px] shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-[15px] font-semibold text-[#111827]">{section.title}</h3>
                  <p className="line-clamp-2 text-sm leading-5 text-[#4b5563]">{section.description}</p>
                </div>
                <div className="rounded-full border border-[#d1d5db] bg-[#f8fafc] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#6b7280]">
                  {countSectionValues(sectionValues)} filled
                </div>
              </div>

              <form
                className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  saveSection(section.key, section.fields, formData, `${section.title} saved.`);
                }}
              >
                {section.fields.map((field) => {
                  const value = getFieldValue(payload, section.key, field);

                  if (field.type === "checkbox") {
                    return (
                      <label key={field.name} className="flex items-center gap-2.5 rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-[13px] text-[#111827]">
                        <input type="checkbox" name={field.name} defaultChecked={Boolean(value)} />
                        {field.label}
                      </label>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <label key={field.name} className="grid gap-1 md:col-span-2 xl:col-span-3">
                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                          {field.label}
                        </span>
                        <textarea
                          name={field.name}
                          defaultValue={String(value)}
                          placeholder={field.placeholder}
                          className="min-h-[72px] resize-y rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] outline-none placeholder:text-[#9ca3af] transition focus:border-[#2563eb] focus:bg-white"
                        />
                      </label>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <label key={field.name} className="grid gap-1">
                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                          {field.label}
                        </span>
                        <select
                          name={field.name}
                          defaultValue={String(value)}
                          className={inputClassName()}
                        >
                          {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label key={field.name} className="grid gap-1">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                        {field.label}
                      </span>
                      <input
                        name={field.name}
                        defaultValue={String(value)}
                        placeholder={field.placeholder}
                        className={inputClassName()}
                      />
                    </label>
                  );
                })}

                <button
                  disabled={isPending}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 xl:col-span-3 xl:justify-self-start"
                >
                  {section.saveLabel}
                </button>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}
