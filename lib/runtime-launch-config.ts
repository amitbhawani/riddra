import { readFileSync, statSync } from "fs";
import path from "path";

import { isHostedAppRuntime } from "@/lib/durable-data-runtime";
import { env } from "@/lib/env";
import type { LaunchConfigStore } from "@/lib/launch-config-store";

type RuntimeLaunchConfig = {
  siteUrl: string;
  launchMode: string;
  supportEmail: string;
  adminEmails: string;
  canonicalHost: string;
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
  sharedSidebarVisibleBlocks: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  googleOAuthConfigured: boolean;
  marketDataProviderUrl: string;
  marketDataProviderToken: string;
  marketDataRefreshSecret: string;
  cronSecret: string;
  marketDataQuoteEndpoint: string;
  marketDataOhlcvEndpoint: string;
  marketDataIndexEndpoint: string;
  marketDataOptionChainEndpoint: string;
  marketDataBhavcopyUrl: string;
  marketDataFundNavEndpoint: string;
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
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  resendApiKey: string;
  openAiApiKey: string;
  aiGatewayUrl: string;
  billingSupportEmail: string;
  contactEmail: string;
  supportWhatsapp: string;
  telegramHandle: string;
  xHandle: string;
  youtubeChannelUrl: string;
  discordInviteUrl: string;
  pushProviderKey: string;
  feedbackInbox: string;
  privacyOwner: string;
  termsOwner: string;
  grievanceOfficerName: string;
  grievanceOfficerEmail: string;
  riskDisclosureUrl: string;
  statusPageUrl: string;
  nifty50ChartSymbol: string;
  bankNiftyChartSymbol: string;
  finNiftyChartSymbol: string;
  sensexChartSymbol: string;
};

type HostedRuntimeRequirements = {
  hosted: boolean;
  runtimeMode: "local" | "hosted";
  missingSite: string[];
  missingSupabasePublic: string[];
  missingSupabaseAdmin: string[];
  missingTrigger: string[];
  missingMeilisearch: string[];
  missingMarketData: string[];
};

const STORE_PATH = path.join(process.cwd(), "data", "launch-config.json");
let cachedStore:
  | {
      mtimeMs: number;
      value: LaunchConfigStore | null;
    }
  | null = null;
let cachedRuntimeConfig:
  | {
      mtimeMs: number;
      value: RuntimeLaunchConfig;
    }
  | null = null;

function readStoreSync(): LaunchConfigStore | null {
  try {
    const stats = statSync(STORE_PATH);

    if (cachedStore && cachedStore.mtimeMs === stats.mtimeMs) {
      return cachedStore.value;
    }

    const content = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as LaunchConfigStore;

    cachedStore = {
      mtimeMs: stats.mtimeMs,
      value: parsed,
    };

    return parsed;
  } catch {
    cachedStore = {
      mtimeMs: -1,
      value: null,
    };
    return null;
  }
}

function isPlaceholderValue(value?: string) {
  const normalized = value?.trim();

  if (!normalized) {
    return true;
  }

  return /^(replace(_with)?|your|changeme|example|placeholder|todo|tbd)/i.test(normalized);
}

function pick(primary?: string, fallback?: string) {
  const nextPrimary = primary?.trim() ?? "";
  const nextFallback = fallback?.trim() ?? "";

  if (!isPlaceholderValue(nextPrimary)) {
    return nextPrimary;
  }

  if (!isPlaceholderValue(nextFallback)) {
    return nextFallback;
  }

  return "";
}

function isLocalOrigin(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("0.0.0.0")
  );
}

export function isHostedRuntimeEnvironment() {
  return isHostedAppRuntime();
}

function pickCritical(primary?: string, fallback?: string) {
  if (isHostedRuntimeEnvironment()) {
    return pick(primary);
  }

  return pick(primary, fallback);
}

function splitList(value: string | null | undefined) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getRuntimeLaunchConfig(): RuntimeLaunchConfig {
  const store = readStoreSync();
  const storeMtimeMs = cachedStore?.mtimeMs ?? -1;

  if (cachedRuntimeConfig && cachedRuntimeConfig.mtimeMs === storeMtimeMs) {
    return cachedRuntimeConfig.value;
  }

  const config: RuntimeLaunchConfig = {
    siteUrl: pickCritical(env.siteUrl, store?.basic?.siteUrl),
    launchMode: pick(env.launchMode, store?.basic?.launchMode),
    supportEmail: pick(env.supportEmail, store?.basic?.supportEmail),
    adminEmails: pick(env.adminEmails, store?.basic?.adminEmails),
    canonicalHost: pick("", store?.content?.canonicalHost),
    headerAnnouncement: pick("", store?.experience?.headerAnnouncement),
    headerBrandMark: pick("", store?.experience?.headerBrandMark),
    headerLogoUrl: pick("", store?.experience?.headerLogoUrl),
    headerLogoWidthPx: pick("", store?.experience?.headerLogoWidthPx),
    headerBrandLabel: pick("", store?.experience?.headerBrandLabel),
    headerBrandHref: pick("", store?.experience?.headerBrandHref),
    headerVisibleMenuGroups: pick("", store?.experience?.headerVisibleMenuGroups),
    headerTickerRows: pick("", store?.experience?.headerTickerRows),
    headerQuickLinks: pick("", store?.experience?.headerQuickLinks),
    headerMarketNav: pick("", store?.experience?.headerMarketNav),
    headerUtilityNav: pick("", store?.experience?.headerUtilityNav),
    headerPrimaryCtaLabel: pick("", store?.experience?.headerPrimaryCtaLabel),
    headerPrimaryCtaHref: pick("", store?.experience?.headerPrimaryCtaHref),
    headerHeadCode: pick("", store?.experience?.headerHeadCode),
    footerSummary: pick("", store?.experience?.footerSummary),
    footerLinks: pick("", store?.experience?.footerLinks),
    stockSidebarMode: pick("", store?.experience?.stockSidebarMode),
    stockSidebarTitle: pick("", store?.experience?.stockSidebarTitle),
    stockSidebarLinks: pick("", store?.experience?.stockSidebarLinks),
    fundSidebarMode: pick("", store?.experience?.fundSidebarMode),
    fundSidebarTitle: pick("", store?.experience?.fundSidebarTitle),
    fundSidebarLinks: pick("", store?.experience?.fundSidebarLinks),
    ipoSidebarMode: pick("", store?.experience?.ipoSidebarMode),
    ipoSidebarTitle: pick("", store?.experience?.ipoSidebarTitle),
    ipoSidebarLinks: pick("", store?.experience?.ipoSidebarLinks),
    indexSidebarMode: pick("", store?.experience?.indexSidebarMode),
    indexSidebarTitle: pick("", store?.experience?.indexSidebarTitle),
    indexSidebarLinks: pick("", store?.experience?.indexSidebarLinks),
    sharedSidebarVisibleBlocks: pick("", store?.experience?.sharedSidebarVisibleBlocks),
    supabaseUrl: pickCritical(env.supabaseUrl, store?.supabase?.supabaseUrl),
    supabaseAnonKey: pickCritical(env.supabaseAnonKey, store?.supabase?.supabaseAnonKey),
    supabaseServiceRoleKey: pick(env.supabaseServiceRoleKey),
    googleOAuthConfigured: Boolean(store?.supabase?.googleOAuthConfigured),
    marketDataProviderUrl: pickCritical(
      env.marketDataProviderUrl,
      store?.marketData?.providerUrl,
    ),
    marketDataProviderToken: pickCritical(
      env.marketDataProviderToken,
      store?.marketData?.providerToken,
    ),
    marketDataRefreshSecret: pickCritical(
      env.marketDataRefreshSecret,
      store?.marketData?.refreshSecret,
    ),
    cronSecret: pickCritical(env.cronSecret, store?.marketData?.cronSecret),
    marketDataQuoteEndpoint: pickCritical(
      env.marketDataQuoteEndpoint,
      store?.marketData?.quoteEndpoint,
    ),
    marketDataOhlcvEndpoint: pickCritical(
      env.marketDataOhlcvEndpoint,
      store?.marketData?.ohlcvEndpoint,
    ),
    marketDataIndexEndpoint: pickCritical(
      env.marketDataIndexEndpoint,
      store?.marketData?.indexEndpoint,
    ),
    marketDataOptionChainEndpoint: pickCritical(
      env.marketDataOptionChainEndpoint,
      store?.marketData?.optionChainEndpoint,
    ),
    marketDataBhavcopyUrl: pickCritical(
      env.marketDataBhavcopyUrl,
      store?.marketData?.bhavcopyUrl,
    ),
    marketDataFundNavEndpoint: pickCritical(
      env.marketDataFundNavEndpoint,
      store?.marketData?.fundNavEndpoint,
    ),
    nseBaseUrl: pick("", store?.referenceData?.nseBaseUrl),
    bseBaseUrl: pick("", store?.referenceData?.bseBaseUrl),
    amfiNavUrl: pick("", store?.referenceData?.amfiNavUrl),
    mfApiBaseUrl: pick("", store?.referenceData?.mfApiBaseUrl),
    mfApiCollectionUrl: pick("", store?.referenceData?.mfApiCollectionUrl),
    bseQuoteApiUrl: pick("", store?.referenceData?.bseQuoteApiUrl),
    goldApiUrl: pick("", store?.referenceData?.goldApiUrl),
    alphaVantageApiKey: pick("", store?.referenceData?.alphaVantageApiKey),
    fxApiUrl: pick("", store?.referenceData?.fxApiUrl),
    secondaryFxApiUrl: pick("", store?.referenceData?.secondaryFxApiUrl),
    newsApiUrl: pick("", store?.referenceData?.newsApiUrl),
    finnhubApiKey: pick("", store?.referenceData?.finnhubApiKey),
    filingsApiUrl: pick("", store?.referenceData?.filingsApiUrl),
    corporateAnnouncementsApiUrl: pick(
      "",
      store?.referenceData?.corporateAnnouncementsApiUrl,
    ),
    corporateActionsApiUrl: pick("", store?.referenceData?.corporateActionsApiUrl),
    razorpayKeyId: pick(env.razorpayKeyId, store?.billing?.razorpayKeyId),
    razorpayKeySecret: pick(
      env.razorpayKeySecret,
      store?.billing?.razorpayKeySecret,
    ),
    razorpayWebhookSecret: pick(
      env.razorpayWebhookSecret,
      store?.billing?.razorpayWebhookSecret,
    ),
    resendApiKey: pick(env.resendApiKey, store?.billing?.resendApiKey),
    openAiApiKey: pick("", store?.ai?.openAiApiKey),
    aiGatewayUrl: pick("", store?.ai?.aiGatewayUrl),
    billingSupportEmail: pick("", store?.billing?.billingSupportEmail),
    contactEmail: pick("", store?.communications?.contactEmail),
    supportWhatsapp: pick("", store?.communications?.supportWhatsapp),
    telegramHandle: pick("", store?.communications?.telegramHandle),
    xHandle: pick("", store?.communications?.xHandle),
    youtubeChannelUrl: pick("", store?.communications?.youtubeChannelUrl),
    discordInviteUrl: pick("", store?.communications?.discordInviteUrl),
    pushProviderKey: pick("", store?.communications?.pushProviderKey),
    feedbackInbox: pick("", store?.communications?.feedbackInbox),
    privacyOwner: pick("", store?.compliance?.privacyOwner),
    termsOwner: pick("", store?.compliance?.termsOwner),
    grievanceOfficerName: pick("", store?.compliance?.grievanceOfficerName),
    grievanceOfficerEmail: pick("", store?.compliance?.grievanceOfficerEmail),
    riskDisclosureUrl: pick("", store?.compliance?.riskDisclosureUrl),
    statusPageUrl: pick("", store?.distribution?.statusPageUrl),
    nifty50ChartSymbol: pick("", store?.charting?.nifty50Symbol),
    bankNiftyChartSymbol: pick("", store?.charting?.bankNiftySymbol),
    finNiftyChartSymbol: pick("", store?.charting?.finNiftySymbol),
    sensexChartSymbol: pick("", store?.charting?.sensexSymbol),
  };

  cachedRuntimeConfig = {
    mtimeMs: storeMtimeMs,
    value: config,
  };

  return config;
}

export function hasRuntimeSupabaseEnv() {
  const config = getRuntimeLaunchConfig();
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export function hasRuntimeSupabaseAdminEnv() {
  const config = getRuntimeLaunchConfig();
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

export function getConfiguredAdminEmails() {
  const config = getRuntimeLaunchConfig();
  const configured = splitList(env.adminEmails ?? config.adminEmails);
  return configured.length > 0 ? configured : ["amitbhawani@gmail.com"];
}

export function getConfiguredSupportDestinations() {
  const config = getRuntimeLaunchConfig();

  return Array.from(
    new Set(
      [
        config.supportEmail,
        config.contactEmail,
        config.feedbackInbox,
        config.billingSupportEmail,
      ].flatMap((value) => splitList(value)),
    ),
  );
}

export function getConfiguredSupportEmail() {
  return getConfiguredSupportDestinations()[0] ?? "";
}

export function getHostedRuntimeRequirements(): HostedRuntimeRequirements {
  const hosted = isHostedRuntimeEnvironment();
  const config = getRuntimeLaunchConfig();
  const segmentedMarketDataReady = [
    config.marketDataQuoteEndpoint,
    config.marketDataFundNavEndpoint,
    config.marketDataIndexEndpoint,
  ].every(Boolean);
  const providerPayloadReady = Boolean(config.marketDataProviderUrl);

  return {
    hosted,
    runtimeMode: hosted ? "hosted" : "local",
    missingSite:
      hosted && (!config.siteUrl || isLocalOrigin(config.siteUrl))
        ? ["NEXT_PUBLIC_SITE_URL"]
        : [],
    missingSupabasePublic: config.supabaseUrl && config.supabaseAnonKey ? [] : ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    missingSupabaseAdmin: config.supabaseUrl && config.supabaseServiceRoleKey ? [] : ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    missingTrigger: env.triggerSecretKey && env.triggerProjectRef ? [] : ["TRIGGER_SECRET_KEY", "TRIGGER_PROJECT_REF"],
    missingMeilisearch: env.meilisearchHost && env.meilisearchApiKey ? [] : ["MEILISEARCH_HOST", "MEILISEARCH_API_KEY"],
    missingMarketData:
      config.marketDataRefreshSecret &&
      (providerPayloadReady || segmentedMarketDataReady)
        ? []
        : [
            ...(!config.marketDataRefreshSecret ? ["MARKET_DATA_REFRESH_SECRET"] : []),
            ...(!providerPayloadReady && !segmentedMarketDataReady
              ? [
                  "MARKET_DATA_PROVIDER_URL or MARKET_DATA_QUOTE_ENDPOINT",
                  "MARKET_DATA_FUND_NAV_ENDPOINT",
                  "MARKET_DATA_INDEX_ENDPOINT",
                ]
              : []),
          ],
  };
}
