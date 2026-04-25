import { env } from "@/lib/env";
import { canAccessAdminApiPath, canAccessAdminPagePath, getDefaultCapabilitiesForRole } from "@/lib/product-permissions";

const PUBLIC_PAGE_EXACT_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/contact",
  "/help",
  "/privacy",
  "/terms",
  "/methodology",
  "/get-started",
  "/pricing",
]);

const PUBLIC_PAGE_PREFIXES = ["/auth/"];

const OPERATOR_PAGE_EXACT_PATHS = new Set([
  "/build-tracker",
  "/launch-readiness",
  "/source-readiness",
]);

const OPERATOR_API_EXACT_PATHS = new Set([
  "/api/canonical-intake-template",
  "/api/release-checks",
  "/api/smoke-test-journeys",
]);

const OPERATOR_API_PATTERNS = [
  /^\/api\/.+-registry$/,
  /^\/api\/launch-[a-z0-9-]+$/,
  /^\/api\/.+-packet$/,
];

function normalizeEmailList(value: string | undefined) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isPrivateBetaModeEnabled() {
  return false;
}

export function getConfiguredAdminEmailsFromEnv() {
  return normalizeEmailList(env.adminEmails);
}

export function getConfiguredBetaUserEmails() {
  return normalizeEmailList(env.betaUserEmails);
}

export function isAdminEmailFromEnv(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getConfiguredAdminEmailsFromEnv().includes(email.toLowerCase());
}

export function isBetaApprovedEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const normalized = email.toLowerCase();

  return (
    isAdminEmailFromEnv(normalized) ||
    getConfiguredBetaUserEmails().includes(normalized)
  );
}

export function isOperatorSurfacePath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/") ||
    OPERATOR_PAGE_EXACT_PATHS.has(pathname) ||
    OPERATOR_API_EXACT_PATHS.has(pathname) ||
    OPERATOR_API_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

export function isEditorAllowedAdminPagePath(pathname: string) {
  return canAccessAdminPagePath(pathname, "editor", getDefaultCapabilitiesForRole("editor"));
}

export function isEditorAllowedAdminApiPath(pathname: string) {
  return canAccessAdminApiPath(pathname, "editor", getDefaultCapabilitiesForRole("editor"));
}

export function isOperatorApiPath(pathname: string) {
  return (
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/") ||
    OPERATOR_API_EXACT_PATHS.has(pathname) ||
    OPERATOR_API_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

export function isPublicPagePath(pathname: string) {
  return (
    PUBLIC_PAGE_EXACT_PATHS.has(pathname) ||
    PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isBetaProtectedPagePath(pathname: string) {
  if (!isPrivateBetaModeEnabled()) {
    return false;
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return false;
  }

  if (pathname.includes(".")) {
    return false;
  }

  if (isOperatorSurfacePath(pathname) || isPublicPagePath(pathname)) {
    return false;
  }

  return true;
}
