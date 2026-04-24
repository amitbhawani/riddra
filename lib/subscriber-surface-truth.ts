import { getAuthContinuityState } from "@/lib/local-auth-bypass";
import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export function getSubscriberSurfaceTruth() {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const delivery = getTransactionalDeliveryReadiness();
  const normalizedLaunchMode = config.launchMode.toLowerCase();
  const commercialBillingDeferred = !["public_live", "public-launch", "public_launch", "live"].includes(
    normalizedLaunchMode,
  );
  const hasBillingCore = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
  const hasBillingWebhook = Boolean(config.razorpayWebhookSecret);
  const hasSupportDelivery = delivery.configured;
  const hasMarketDataProvider = Boolean(config.marketDataProviderUrl && config.marketDataProviderToken);
  const hasBrokerContinuity = false;
  const auth = getAuthContinuityState();
  const hasLiveAuthContinuity = auth.sessionReliability === "Verified";
  const hasPriorityAlertChannels = Boolean(config.supportWhatsapp || config.pushProviderKey);

  return {
    hasBillingCore,
    hasBillingWebhook,
    commercialBillingDeferred,
    hasSupportDelivery,
    hasMarketDataProvider,
    hasBrokerContinuity,
    hasLiveAuthContinuity,
    hasPriorityAlertChannels,
    usesPreviewMode:
      !hasLiveAuthContinuity ||
      !hasSupportDelivery ||
      !hasMarketDataProvider ||
      (!commercialBillingDeferred && !hasBillingWebhook),
  };
}
