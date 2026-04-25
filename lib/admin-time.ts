const ADMIN_TIME_ZONE = "Asia/Kolkata";

function buildFormatter(
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: ADMIN_TIME_ZONE,
    ...options,
  });
}

const adminDateTimeFormatter = buildFormatter({
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

const adminDateFormatter = buildFormatter({
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatAdminDateTime(
  value: string | null | undefined,
  fallback = "Not recorded",
) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = adminDateTimeFormatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = lookup.day ?? "";
  const month = lookup.month ?? "";
  const year = lookup.year ?? "";
  const hour = lookup.hour ?? "";
  const minute = lookup.minute ?? "";
  const dayPeriod = (lookup.dayPeriod ?? "").toUpperCase();
  const timeZoneName = lookup.timeZoneName ?? "IST";

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} ${timeZoneName}`.trim();
}

export function formatAdminSavedState(
  value: string | null | undefined,
  prefix = "Last saved",
) {
  return `${prefix} ${formatAdminDateTime(value, "just now")}`;
}

export function formatAdminStorageDetail(
  storageMode: "durable" | "fallback" | null | undefined,
  value: string | null | undefined,
  action: "saved" | "removed" = "saved",
) {
  const storageLabel =
    storageMode === "durable"
      ? action === "removed"
        ? "Removed from the primary shared storage."
        : "Saved to the primary shared storage."
      : action === "removed"
        ? "Removed from the current workspace storage."
        : "Saved in the current workspace storage.";

  return `${storageLabel} ${formatAdminSavedState(value)}`;
}

export function formatAdminDateLabel(
  value: string | null | undefined,
  fallback = "Not recorded",
) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return adminDateFormatter.format(date);
}
