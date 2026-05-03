export const USER_ACTIVITY_TRACK_HEADER = "x-riddra-track-user-activity";
export const USER_ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;

const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|crawling|curl|wget|facebookexternalhit|slurp|bingpreview|headless/i;

export function isBotUserAgent(userAgent: string | null | undefined) {
  return BOT_USER_AGENT_PATTERN.test(String(userAgent ?? ""));
}

export function isMeaningfulActivityPath(pathname: string | null | undefined) {
  const normalized = String(pathname ?? "").trim();
  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith("/_next/") ||
    normalized === "/favicon.ico" ||
    normalized === "/robots.txt" ||
    normalized === "/sitemap.xml"
  ) {
    return false;
  }

  return true;
}

export function shouldTrackUserActivityRequest(input: {
  pathname: string | null | undefined;
  userAgent: string | null | undefined;
}) {
  return (
    isMeaningfulActivityPath(input.pathname) &&
    !isBotUserAgent(input.userAgent)
  );
}
