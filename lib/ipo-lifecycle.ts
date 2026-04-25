import { getAdminOperatorStore, type AdminManagedRecord } from "@/lib/admin-operator-store";

export const IPO_LIFECYCLE_SECTION_KEY = "lifecycle";

export type IpoLifecycleState = {
  listingDate: string | null;
  listingDateKey: string | null;
  targetStockSlug: string | null;
  targetStockName: string | null;
  autoConvertOnListingDate: boolean;
  redirectActive: boolean;
  redirectPath: string | null;
  cutoverCompletedAt: string | null;
  cutoverStatus: string | null;
};

function cleanString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function cleanSlug(value: string | null | undefined) {
  return cleanString(value)?.toLowerCase() ?? null;
}

function cleanRoute(value: string | null | undefined) {
  const normalized = cleanString(value);

  if (!normalized) {
    return null;
  }

  const withoutQuery = normalized.split(/[?#]/, 1)[0]?.trim() ?? "";
  if (!withoutQuery.startsWith("/")) {
    return null;
  }

  return withoutQuery.replace(/\/+$/g, "") || "/";
}

function normalizeBoolean(value: string | null | undefined, defaultValue = false) {
  const normalized = cleanString(value)?.toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  return ["yes", "true", "1", "enabled", "on"].includes(normalized);
}

function toIstDateKey(value: string | null | undefined) {
  const normalized = cleanString(value);

  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function getSectionValue(record: AdminManagedRecord, sectionKey: string, fieldKey: string) {
  const section = record.sections?.[sectionKey];

  if (!section) {
    return null;
  }

  return cleanString(section.values?.[fieldKey]);
}

export function stripIpoSuffix(value: string | null | undefined) {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return null;
  }

  return cleaned.replace(/\s+ipo$/i, "").trim() || cleaned;
}

export function defaultStockSlugFromIpoSlug(value: string | null | undefined) {
  const cleaned = cleanSlug(value);

  if (!cleaned) {
    return null;
  }

  return cleaned.replace(/-ipo$/i, "") || cleaned;
}

export function getIpoLifecycleState(record: AdminManagedRecord): IpoLifecycleState {
  const lifecycleListingDate =
    getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "listingDate") ??
    getSectionValue(record, "data_sources", "sourceUpdatedAt");
  const targetStockSlug =
    cleanSlug(getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "targetStockSlug")) ??
    defaultStockSlugFromIpoSlug(record.slug);
  const targetStockName =
    stripIpoSuffix(getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "targetStockName")) ??
    stripIpoSuffix(getSectionValue(record, "identity", "companyName")) ??
    stripIpoSuffix(record.title);
  const redirectPath =
    cleanRoute(getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "redirectPath")) ??
    (targetStockSlug ? `/stocks/${targetStockSlug}` : null);

  return {
    listingDate: lifecycleListingDate,
    listingDateKey: toIstDateKey(lifecycleListingDate),
    targetStockSlug,
    targetStockName,
    autoConvertOnListingDate: normalizeBoolean(
      getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "autoConvertOnListingDate"),
      true,
    ),
    redirectActive: normalizeBoolean(
      getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "redirectActive"),
      false,
    ),
    redirectPath,
    cutoverCompletedAt: getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "cutoverCompletedAt"),
    cutoverStatus: getSectionValue(record, IPO_LIFECYCLE_SECTION_KEY, "cutoverStatus"),
  };
}

export async function getIpoRedirectTarget(slug: string) {
  const normalizedSlug = cleanSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const store = await getAdminOperatorStore();
  const record =
    store.records.find(
      (item) =>
        item.family === "ipos" &&
        item.slug === normalizedSlug &&
        item.status === "published",
    ) ?? null;

  if (!record) {
    return null;
  }

  const lifecycle = getIpoLifecycleState(record);

  if (!lifecycle.redirectActive || !lifecycle.redirectPath) {
    return null;
  }

  return lifecycle.redirectPath;
}

export async function getRedirectingIpoSlugSet() {
  const store = await getAdminOperatorStore();
  const slugs = new Set<string>();

  for (const record of store.records) {
    if (record.family !== "ipos" || record.status !== "published") {
      continue;
    }

    const lifecycle = getIpoLifecycleState(record);

    if (lifecycle.redirectActive && lifecycle.redirectPath) {
      slugs.add(record.slug);
    }
  }

  return slugs;
}

export async function getPublishedAdminManagedStockFallbackRecords() {
  const store = await getAdminOperatorStore();

  return store.records.filter(
    (record) =>
      record.family === "stocks" &&
      record.status === "published" &&
      Boolean(record.slug),
  );
}

export function getTodayIstDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}
