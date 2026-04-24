const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const simpleEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AdminValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminValidationError";
    this.status = status;
  }
}

export function cleanAdminString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function cleanOptionalAdminString(value: unknown, maxLength = 4000) {
  const nextValue = cleanAdminString(value, maxLength);
  return nextValue || null;
}

export function cleanAdminStringArray(value: unknown, maxLength = 120, itemLimit = 50) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => cleanAdminString(item, maxLength))
    .filter(Boolean)
    .slice(0, itemLimit);
}

export function cleanAdminIsoOrNull(value: unknown) {
  const nextValue = cleanOptionalAdminString(value, 80);

  if (!nextValue) {
    return null;
  }

  const timestamp = Date.parse(nextValue);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

export function assertRequiredAdminText(
  value: unknown,
  label: string,
  maxLength = 4000,
) {
  const nextValue = cleanAdminString(value, maxLength);

  if (!nextValue) {
    throw new AdminValidationError(`${label} is required.`);
  }

  return nextValue;
}

function isSafeRoute(value: string | null) {
  if (!value) {
    return true;
  }

  return value.startsWith("/") && !value.startsWith("//");
}

function isSafeHttpUrl(value: string | null) {
  if (!value) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function assertAdminSlugValue(value: unknown, label = "Slug") {
  const nextValue = cleanAdminString(value, 160).toLowerCase();

  if (!nextValue) {
    throw new AdminValidationError(`${label} is required.`);
  }

  if (!slugPattern.test(nextValue)) {
    throw new AdminValidationError(
      `${label} must use lowercase letters, numbers, and hyphens only.`,
    );
  }

  return nextValue;
}

export function assertAdminEmailValue(value: unknown, label = "Email address") {
  const nextValue = cleanAdminString(value, 240).toLowerCase();

  if (!nextValue) {
    throw new AdminValidationError(`${label} is required.`);
  }

  if (!simpleEmailPattern.test(nextValue)) {
    throw new AdminValidationError(`${label} must be a valid email.`);
  }

  return nextValue;
}

export function assertAdminRouteValue(value: unknown, label: string) {
  const nextValue = cleanOptionalAdminString(value, 400);

  if (!isSafeRoute(nextValue)) {
    throw new AdminValidationError(
      `${label} must be an internal route starting with "/".`,
    );
  }

  return nextValue;
}

export function assertAdminHttpUrlValue(value: unknown, label: string) {
  const nextValue = cleanOptionalAdminString(value, 800);

  if (!isSafeHttpUrl(nextValue)) {
    throw new AdminValidationError(`${label} must use an http or https URL.`);
  }

  return nextValue;
}

export function assertAdminUrlOrRouteValue(value: unknown, label: string) {
  const nextValue = cleanOptionalAdminString(value, 800);

  if (!nextValue) {
    return null;
  }

  if (isSafeRoute(nextValue) || isSafeHttpUrl(nextValue)) {
    return nextValue;
  }

  throw new AdminValidationError(
    `${label} must be an internal route or an http/https URL.`,
  );
}
