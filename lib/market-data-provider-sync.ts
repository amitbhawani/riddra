import {
  getMarketDataIngestionReadiness,
  ingestMarketDataPayload,
} from "@/lib/market-data-ingestion";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

export function getMarketDataProviderSyncReadiness() {
  const config = getRuntimeLaunchConfig();

  return {
    adminSupabaseReady: hasRuntimeSupabaseAdminEnv(),
    providerUrlReady: Boolean(config.marketDataProviderUrl),
    providerTokenReady: Boolean(config.marketDataProviderToken),
    ingestReadiness: getMarketDataIngestionReadiness(),
    mode:
      hasRuntimeSupabaseAdminEnv() && config.marketDataProviderUrl
        ? "provider_sync_ready"
        : "configuration_pending",
  };
}

export async function runMarketDataProviderSync() {
  const config = getRuntimeLaunchConfig();

  if (!hasRuntimeSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are required for provider sync.");
  }

  if (!config.marketDataProviderUrl) {
    throw new Error("MARKET_DATA_PROVIDER_URL is not configured.");
  }

  const headers = new Headers({
    Accept: "application/json",
  });

  if (config.marketDataProviderToken) {
    headers.set("Authorization", `Bearer ${config.marketDataProviderToken}`);
  }

  const response = await fetch(config.marketDataProviderUrl, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Provider sync failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const result = await ingestMarketDataPayload(payload, {
    triggerSource: "provider_sync",
    requestedBy: "trigger_provider_sync",
    taskIdentifier: "market-data-provider-sync",
    ingestMode: "provider_sync",
  });

  if (!result.ok) {
    const summary = result.failures
      .map((failure) => `${failure.seriesType}:${failure.assetSlug}`)
      .join(", ");
    throw new Error(`Provider sync completed with ${result.failures.length} series failures: ${summary}`);
  }

  return {
    providerUrl: config.marketDataProviderUrl,
    ...result,
  };
}
