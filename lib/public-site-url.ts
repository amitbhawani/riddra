import { env } from "@/lib/env";
import { isHostedAppRuntime, isLocalDevRuntime } from "@/lib/durable-data-runtime";
import { getHostedRuntimeRequirements, getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

const LOCAL_FALLBACK_URL = "http://localhost:3000";

function normalizeSiteUrl(url: string) {
  const trimmed = url.replace(/\/$/, "");

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname === "riddra.com") {
      parsed.hostname = "www.riddra.com";
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

export function getConfiguredPublicSiteUrl() {
  const runtimeSiteUrl = getRuntimeLaunchConfig().siteUrl.trim();
  return runtimeSiteUrl ? normalizeSiteUrl(runtimeSiteUrl) : "";
}

export function hasConfiguredPublicSiteUrl() {
  return Boolean(getConfiguredPublicSiteUrl());
}

export function getPublicSiteUrl() {
  const configured = getConfiguredPublicSiteUrl();

  if (configured) {
    return configured;
  }

  if (isLocalDevRuntime()) {
    return LOCAL_FALLBACK_URL;
  }

  const requirements = getHostedRuntimeRequirements();
  const missing = requirements.missingSite.length > 0 ? requirements.missingSite.join(", ") : "NEXT_PUBLIC_SITE_URL";
  throw new Error(
    `Hosted runtime is missing a valid public site origin. Set ${missing} to the final beta domain instead of relying on unfinished local defaults.`,
  );
}

export function getAuthCallbackUrl(next = "/account/setup") {
  const baseUrl = isHostedAppRuntime() ? getPublicSiteUrl() : LOCAL_FALLBACK_URL;
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function getAuthSessionUrl(next = "/account/setup") {
  const baseUrl = isHostedAppRuntime() ? getPublicSiteUrl() : LOCAL_FALLBACK_URL;
  return `${baseUrl}/auth/session?next=${encodeURIComponent(next)}`;
}

export function getLocalSiteUrl() {
  return LOCAL_FALLBACK_URL;
}

export function getPublicSiteUrlStatus() {
  const hostedRequirements = getHostedRuntimeRequirements();
  const siteUrl =
    hostedRequirements.hosted && hostedRequirements.missingSite.length > 0
      ? ""
      : getPublicSiteUrl();

  return {
    configured: hostedRequirements.missingSite.length === 0 && (hasConfiguredPublicSiteUrl() || Boolean(env.siteUrl)),
    hosted: hostedRequirements.hosted,
    missingEnv: hostedRequirements.missingSite,
    siteUrl,
  };
}
