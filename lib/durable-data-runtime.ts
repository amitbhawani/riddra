export type DurableDataRuntime = "local_json" | "hosted_db";
export type AppRuntimeMode = "local_dev" | "hosted";

function normalizeAppRuntimeOverride(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["hosted", "prod", "production", "hosted_proof", "hosted_live"].includes(normalized)) {
    return "hosted" as const;
  }

  if (["local", "dev", "development", "local_dev"].includes(normalized)) {
    return "local_dev" as const;
  }

  return null;
}

function normalizeRuntimeOverride(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["hosted", "db", "hosted_db", "production"].includes(normalized)) {
    return "hosted_db" as const;
  }

  if (["local", "json", "local_json", "development", "dev"].includes(normalized)) {
    return "local_json" as const;
  }

  return null;
}

export function getAppRuntimeMode(): AppRuntimeMode {
  const explicitRuntime = normalizeAppRuntimeOverride(process.env.RIDDRA_RUNTIME_MODE);

  if (explicitRuntime) {
    return explicitRuntime;
  }

  const durableOverride = normalizeRuntimeOverride(process.env.RIDDRA_DURABLE_DATA_RUNTIME);

  if (durableOverride) {
    return durableOverride === "hosted_db" ? "hosted" : "local_dev";
  }

  return process.env.NODE_ENV === "production" ? "hosted" : "local_dev";
}

export function isHostedAppRuntime() {
  return getAppRuntimeMode() === "hosted";
}

export function isLocalDevRuntime() {
  return getAppRuntimeMode() === "local_dev";
}

export function isProductionMode() {
  return isHostedAppRuntime() || process.env.NODE_ENV === "production";
}

export function canUseDebugFallbackPaths() {
  return isLocalDevRuntime() && !isProductionMode();
}

export function getDurableDataRuntime(): DurableDataRuntime {
  const override = normalizeRuntimeOverride(process.env.RIDDRA_DURABLE_DATA_RUNTIME);

  if (override) {
    return override;
  }

  return isHostedAppRuntime() ? "hosted_db" : "local_json";
}

export function isHostedDbRuntime() {
  return getDurableDataRuntime() === "hosted_db";
}

export function isLocalJsonRuntime() {
  return getDurableDataRuntime() === "local_json";
}

export function canUseFileFallback() {
  const vercelFlag = String(process.env.VERCEL ?? "").trim().toLowerCase();

  if (vercelFlag === "1" || vercelFlag === "true") {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return isLocalDevRuntime() && isLocalJsonRuntime();
}

export function getFileFallbackDisabledMessage(scope = "This operation") {
  return `${scope} requires durable Supabase storage in hosted mode. Local JSON fallback is disabled.`;
}
