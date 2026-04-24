import { canUseDebugFallbackPaths } from "@/lib/durable-data-runtime";
import { env } from "@/lib/env";

export const OPEN_ACCESS_SURFACE_HEADER = "x-riddra-open-access-surface";
export const REQUEST_PATH_HEADER = "x-riddra-request-path";

const TRUSTED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHost(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  const withoutPort = trimmed
    .replace(/^\[/, "")
    .replace(/\](:\d+)?$/, "")
    .replace(/:\d+$/, "");

  return withoutPort || null;
}

export function isTrustedLocalRequestHost(value: string | null | undefined) {
  const host = normalizeHost(value);

  if (!host) {
    return false;
  }

  return TRUSTED_LOCAL_HOSTS.has(host);
}

export function isOpenAdminAccessEnabled() {
  return canUseDebugFallbackPaths() && env.openAdminAccess === "true";
}

export function isOpenAccessSurfacePath(pathname: string) {
  return (
    pathname === "/build-tracker" ||
    pathname === "/launch-readiness" ||
    pathname === "/source-readiness"
  );
}
