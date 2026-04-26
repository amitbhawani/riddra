function parseMarketNewsDate(value: string | null | undefined) {
  const timestamp = Date.parse(String(value ?? ""));

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

export function formatMarketNewsDateTime(value: string | null | undefined) {
  const date = parseMarketNewsDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatMarketNewsFullDate(value: string | null | undefined) {
  const date = parseMarketNewsDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
  }).format(date);
}

export function formatMarketNewsRelativeTime(value: string | null | undefined) {
  const date = parseMarketNewsDate(value);

  if (!date) {
    return null;
  }

  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(hours / 24);

  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
