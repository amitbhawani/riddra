import { env, hasOpenAiEnv } from "@/lib/env";
import { getDurableJobSystemReadiness, getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getResendReadiness } from "@/lib/email/resend";
import { getLaunchState } from "@/lib/launch-state";
import {
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
  hasRuntimeSupabaseEnv,
} from "@/lib/runtime-launch-config";

type LaunchScorecardItem = {
  title: string;
  status: "Ready" | "Partial" | "Blocked";
  detail: string;
};

function itemScore(status: LaunchScorecardItem["status"]) {
  if (status === "Ready") return 1;
  if (status === "Partial") return 0.5;
  return 0;
}

export function getLaunchScorecard() {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const durableJobs = getDurableJobSystemReadiness();
  const delivery = getTransactionalDeliveryReadiness();
  const launchState = getLaunchState();
  const hasMarketDataBridge = hasRuntimeSupabaseEnv();
  const hasMarketDataProvider = Boolean(config.marketDataProviderUrl);
  const hasMarketDataExecutionSecret = Boolean(config.marketDataRefreshSecret || config.cronSecret);

  const items: LaunchScorecardItem[] = [
    {
      title: "Supabase public env",
      status: hasRuntimeSupabaseEnv() ? "Ready" : "Blocked",
      detail: hasRuntimeSupabaseEnv()
        ? "Public project URL and anon key are present."
        : "Public Supabase URL and anon key are still missing.",
    },
    {
      title: "Supabase admin env",
      status: hasRuntimeSupabaseAdminEnv() ? "Ready" : hasRuntimeSupabaseEnv() ? "Partial" : "Blocked",
      detail: hasRuntimeSupabaseAdminEnv()
        ? "Service-role access is available for backend activation work."
        : hasRuntimeSupabaseEnv()
          ? "Public Supabase auth is live, but service-role access is still missing for deeper admin activation work."
          : "Service-role access is still missing for full backend activation.",
    },
    {
      title: "Support contact",
      status: config.supportEmail || config.contactEmail ? "Ready" : "Blocked",
      detail: config.supportEmail || config.contactEmail
        ? `Support email is configured as ${config.supportEmail || config.contactEmail}.`
        : "Support email is not configured yet.",
    },
    {
      title: "Payments env",
      status: config.razorpayKeyId && config.razorpayWebhookSecret ? "Ready" : config.razorpayKeyId ? "Partial" : "Blocked",
      detail:
        config.razorpayKeyId && config.razorpayWebhookSecret
          ? "Payment key and webhook secret are configured."
          : config.razorpayKeyId
            ? "Payment key exists, but webhook signing is not fully configured."
            : "Payment envs are still missing.",
    },
    {
      title: "Email delivery env",
      status: delivery.configured ? "Ready" : resend.configured || durableJobs.configured ? "Partial" : "Blocked",
      detail: delivery.configured
        ? "Support routing, Resend, and Trigger.dev are all present for transactional delivery."
        : resend.configured || durableJobs.configured
          ? "Part of the delivery runtime exists, but support delivery still needs both Resend and Trigger.dev to be treated as live."
          : "Transactional delivery env is still missing.",
    },
    {
      title: "Trigger.dev worker env",
      status: durableJobs.configured ? "Ready" : durableJobs.triggerSecretReady || durableJobs.triggerProjectReady ? "Partial" : "Blocked",
      detail: durableJobs.configured
        ? "Worker env is present for refresh, search, support, and notification jobs."
        : "Trigger.dev worker env still needs TRIGGER_SECRET_KEY and TRIGGER_PROJECT_REF.",
    },
    {
      title: "AI optional env",
      status: hasOpenAiEnv() ? "Ready" : "Partial",
      detail: hasOpenAiEnv()
        ? "Optional live AI can be enabled when needed."
        : "Formula-first AI still works, but live AI is not configured.",
    },
    {
      title: "Launch mode posture",
      status:
        launchState.mode === "private_beta" ||
        launchState.mode === "public_beta" ||
        launchState.mode === "full_launch"
          ? "Ready"
          : "Partial",
      detail: `Current launch mode is ${launchState.label}.`,
    },
    {
      title: "Delayed market-data bridge",
      status:
        hasRuntimeSupabaseAdminEnv() && hasMarketDataProvider && hasMarketDataExecutionSecret
          ? "Ready"
          : hasRuntimeSupabaseAdminEnv() || hasMarketDataBridge
            ? "Partial"
            : "Blocked",
      detail: hasMarketDataBridge
        ? hasRuntimeSupabaseAdminEnv()
          ? hasMarketDataProvider && hasMarketDataExecutionSecret
            ? "Public routes can read persisted snapshots, verified ingestion is ready, and provider sync configuration exists. The remaining blocker is the upstream feed itself."
            : "Public routes can now read persisted snapshots and the backend can accept verified market-data ingestion, but provider URL and sync authorization still need to be finalized."
          : "Stock and fund routes can now prefer persisted source snapshots when they exist, but admin ingestion is still blocked until service-role access is active."
        : "The delayed market-data bridge still needs Supabase-backed snapshot access before public routes can move beyond static fallback values.",
    },
  ];

  const totalScore = items.reduce((sum, item) => sum + itemScore(item.status), 0);
  const percentage = Math.round((totalScore / items.length) * 100);

  return {
    percentage,
    readyCount: items.filter((item) => item.status === "Ready").length,
    blockedCount: items.filter((item) => item.status === "Blocked").length,
    items,
  };
}
