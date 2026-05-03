function readEnv(name: string) {
  const value = process.env[name];
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const upper = normalized.toUpperCase();
  const placeholderMarkers = [
    "REPLACE_WITH_",
    "YOUR_SUPPORT_EMAIL",
    "NEW_ROTATED_SUPABASE_SECRET",
    "SUPPORT EMAIL PENDING",
  ];

  if (placeholderMarkers.some((marker) => upper.includes(marker))) {
    return undefined;
  }

  return normalized;
}

const explicitMeilisearchIndexPrefix = readEnv("MEILISEARCH_INDEX_PREFIX");

export const env = {
  siteUrl: readEnv("NEXT_PUBLIC_SITE_URL") ?? "",
  launchMode: readEnv("NEXT_PUBLIC_LAUNCH_MODE"),
  openAdminAccess: readEnv("OPEN_ADMIN_ACCESS"),
  localAuthBypass: readEnv("LOCAL_AUTH_BYPASS") ?? "false",
  devPublishableFallback: readEnv("DEV_PUBLISHABLE_FALLBACK") ?? "false",
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  marketDataRefreshSecret: readEnv("MARKET_DATA_REFRESH_SECRET"),
  cronSecret: readEnv("CRON_SECRET"),
  marketDataProviderUrl: readEnv("MARKET_DATA_PROVIDER_URL"),
  marketDataProviderToken: readEnv("MARKET_DATA_PROVIDER_TOKEN"),
  marketDataQuoteEndpoint: readEnv("MARKET_DATA_QUOTE_ENDPOINT"),
  marketDataOhlcvEndpoint: readEnv("MARKET_DATA_OHLCV_ENDPOINT"),
  marketDataIndexEndpoint: readEnv("MARKET_DATA_INDEX_ENDPOINT"),
  marketDataOptionChainEndpoint: readEnv("MARKET_DATA_OPTION_CHAIN_ENDPOINT"),
  marketDataBhavcopyUrl: readEnv("MARKET_DATA_BHAVCOPY_URL"),
  marketDataFundNavEndpoint: readEnv("MARKET_DATA_FUND_NAV_ENDPOINT"),
  triggerSecretKey: readEnv("TRIGGER_SECRET_KEY"),
  triggerProjectRef: readEnv("TRIGGER_PROJECT_REF"),
  meilisearchHost: readEnv("MEILISEARCH_HOST"),
  meilisearchApiKey: readEnv("MEILISEARCH_API_KEY"),
  meilisearchIndexPrefix: explicitMeilisearchIndexPrefix ?? "riddra",
  meilisearchIndexPrefixExplicit: explicitMeilisearchIndexPrefix,
  openAiApiKey: readEnv("OPENAI_API_KEY"),
  aiDefaultMode: readEnv("AI_DEFAULT_MODE") ?? "formula_first",
  aiRealCallsEnabled: readEnv("AI_REAL_CALLS_ENABLED") ?? "false",
  aiBudgetProfile: readEnv("AI_BUDGET_PROFILE") ?? "minimal",
  razorpayKeyId: readEnv("RAZORPAY_KEY_ID"),
  razorpayKeySecret: readEnv("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: readEnv("RAZORPAY_WEBHOOK_SECRET"),
  resendApiKey: readEnv("RESEND_API_KEY"),
  resendFromEmail: readEnv("RESEND_FROM_EMAIL"),
  resendReplyToEmail: readEnv("RESEND_REPLY_TO_EMAIL"),
  supportEmail: readEnv("NEXT_PUBLIC_SUPPORT_EMAIL"),
  adminEmails: readEnv("ADMIN_EMAILS"),
  betaUserEmails: readEnv("BETA_USER_EMAILS"),
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasSupabaseAdminEnv() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function hasOpenAiEnv() {
  return Boolean(env.openAiApiKey);
}

export function isRealAiEnabled() {
  return env.aiRealCallsEnabled === "true";
}

export function hasTriggerEnv() {
  return Boolean(env.triggerSecretKey && env.triggerProjectRef);
}

export function hasMeilisearchEnv() {
  return Boolean(env.meilisearchHost && env.meilisearchApiKey);
}

export function hasResendEnv() {
  return Boolean(env.resendApiKey && env.resendFromEmail);
}
