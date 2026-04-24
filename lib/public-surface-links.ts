const INTERNAL_PUBLIC_BLOCKLIST = [
  /^\/admin(?:\/|$)/i,
  /^\/api\/admin(?:\/|$)/i,
  /^\/build-tracker(?:\/|$)/i,
  /^\/launch-readiness(?:\/|$)/i,
  /^\/source-readiness(?:\/|$)/i,
];

function normalizeHref(href: string) {
  return href.trim();
}

export function isBlockedInternalPublicHref(href?: string | null) {
  if (!href) {
    return false;
  }

  const normalizedHref = normalizeHref(href);

  return INTERNAL_PUBLIC_BLOCKLIST.some((pattern) => pattern.test(normalizedHref));
}

export function getPublicSafeHref(href?: string | null) {
  if (!href) {
    return undefined;
  }

  return isBlockedInternalPublicHref(href) ? undefined : normalizeHref(href);
}
