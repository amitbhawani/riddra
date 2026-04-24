import { env, hasOpenAiEnv, isRealAiEnabled } from "@/lib/env";
import { getDurableJobSystemReadiness, getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getResendReadiness } from "@/lib/email/resend";
import { getMarketDataRefreshProofStatus, getMarketDataRefreshReadiness } from "@/lib/market-data-refresh";
import {
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
  hasRuntimeSupabaseEnv,
} from "@/lib/runtime-launch-config";

export type SystemStatusItem = {
  title: string;
  status: "Configured" | "Missing" | "Partial";
  note: string;
};

export function getSystemStatusItems(): SystemStatusItem[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const durableJobs = getDurableJobSystemReadiness();
  const delivery = getTransactionalDeliveryReadiness();
  const refreshReadiness = getMarketDataRefreshReadiness();
  const refreshProof = getMarketDataRefreshProofStatus();
  const hasPublicSupabase = hasRuntimeSupabaseEnv();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasPayments = Boolean(
    config.razorpayKeyId && config.razorpayKeySecret,
  );
  return [
    {
      title: "Site URL",
      status: config.siteUrl ? "Configured" : "Missing",
      note: config.siteUrl
        ? `Using ${config.siteUrl} for auth redirects and public metadata.`
        : "Missing site URL for auth redirects and metadata.",
    },
    {
      title: "Supabase public env",
      status: hasPublicSupabase ? "Configured" : "Missing",
      note: hasPublicSupabase
        ? "Supabase public values are present through env or the launch-config console for auth and app reads."
        : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or save them in the launch-config console.",
    },
    {
      title: "Supabase admin env",
      status: hasAdminSupabase ? "Configured" : "Missing",
      note: hasAdminSupabase
        ? "Service-role Supabase access is present through env or the launch-config console for admin-side operations."
        : "Add SUPABASE_SERVICE_ROLE_KEY, or save it in the launch-config console, before admin write workflows go live.",
    },
    {
      title: "Google auth launch path",
      status: hasPublicSupabase
        ? config.googleOAuthConfigured
          ? "Configured"
          : "Partial"
        : "Missing",
      note: hasPublicSupabase
        ? config.googleOAuthConfigured
          ? "Supabase public auth values are present and Google OAuth is marked configured in the launch-config console."
          : "Code path exists, but Supabase Google provider settings still need to be enabled and confirmed."
        : "Auth code is ready, but environment setup must happen first.",
    },
    {
      title: "Trigger.dev durable jobs",
      status: durableJobs.configured ? "Configured" : durableJobs.triggerSecretReady || durableJobs.triggerProjectReady ? "Partial" : "Missing",
      note: durableJobs.configured
        ? "Trigger.dev worker env is present for market refresh, search rebuilds, support delivery, notifications, and reconciliation."
        : durableJobs.triggerSecretReady || durableJobs.triggerProjectReady
          ? "Part of the Trigger.dev worker env exists, but both TRIGGER_SECRET_KEY and TRIGGER_PROJECT_REF are required before durable jobs can be treated as live."
          : "Trigger.dev worker env is missing, so worker-backed routes should fail instead of pretending execution happened.",
    },
    {
      title: "Payments env",
      status: hasPayments ? "Configured" : "Missing",
      note:
        hasPayments
          ? "Razorpay values are present through env or the launch-config console for subscription work."
          : "Razorpay keys are still optional right now, but will be needed before paid plans go live.",
    },
    {
      title: "Market-data provider",
      status:
        refreshProof.proofMode === "verification_ready"
          ? "Configured"
          : refreshReadiness.sourceMode !== "configuration_pending" ||
              refreshReadiness.quoteEndpointReady ||
              refreshReadiness.fundNavEndpointReady
            ? "Partial"
            : "Missing",
      note:
        refreshProof.proofMode === "verification_ready"
          ? `Durable refresh is configured through ${refreshProof.sourceLabel}, so the live path is ready for retained quote, fund, and index proof runs.`
          : refreshReadiness.sourceMode !== "configuration_pending" ||
              refreshReadiness.quoteEndpointReady ||
              refreshReadiness.fundNavEndpointReady
            ? `Part of the market-data refresh lane is configured through ${refreshProof.sourceLabel}. Remaining exact inputs: ${refreshProof.exactMissing.join(", ")}.`
            : "Live market-data refresh still needs segmented quote or fund endpoints, or a provider payload source, plus the refresh secret before retained writes can be proven.",
    },
    {
      title: "Transactional delivery",
      status: delivery.configured ? "Configured" : delivery.supportContactReady || resend.configured || durableJobs.configured ? "Partial" : "Missing",
      note: delivery.configured
        ? "Support contact, Resend delivery env, and Trigger.dev worker env are all present, so transactional support and notification flows can be exercised honestly."
        : delivery.supportContactReady || resend.configured || durableJobs.configured
          ? "Part of the communication stack exists, but support routing, Resend, and Trigger.dev must all be live before delivery claims are trustworthy."
          : "Support contact, Resend delivery env, and Trigger.dev worker env are still missing from the runtime configuration.",
    },
    {
      title: "AI control mode",
      status: env.aiDefaultMode ? "Configured" : "Missing",
      note: `Current default is ${env.aiDefaultMode.replaceAll("_", " ")} with budget profile ${env.aiBudgetProfile}.`,
    },
    {
      title: "Live AI provider",
      status: hasOpenAiEnv() ? (isRealAiEnabled() ? "Configured" : "Partial") : "Missing",
      note: hasOpenAiEnv()
        ? isRealAiEnabled()
          ? "Provider key is present and live model calls are enabled."
          : "Provider key is present, but live model calls remain disabled so formula-first mode stays in control."
        : "No live AI provider is configured yet, which is fine while the platform stays in low-cost formula-first mode.",
    },
  ];
}
