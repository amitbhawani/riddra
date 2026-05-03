import { cache } from "react";

import { courses } from "@/lib/courses";
import { canUseDebugFallbackPaths } from "@/lib/durable-data-runtime";
import { webinars } from "@/lib/webinars";
import { env } from "@/lib/env";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/admin";

export const publishableCmsEntityRouteBases = {
  stock: "/stocks",
  mutual_fund: "/mutual-funds",
  etf: "/etfs",
  ipo: "/ipo",
  sif: "/sif",
  aif: "/aif",
  pms: "/pms",
  course: "/courses",
  webinar: "/webinars",
  newsletter: "/newsletter",
  research_article: "/learn",
} as const;

export type PublishableCmsEntityType = keyof typeof publishableCmsEntityRouteBases;

type PublishableContentRecordRow = {
  id: string;
  entity_type: PublishableCmsEntityType;
  canonical_slug: string;
  canonical_symbol: string | null;
  source_table: string | null;
  source_row_id: string | null;
  title: string;
  source_payload: Record<string, unknown> | null;
  editorial_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  published_at: string | null;
};

export type PublishableCmsRecord = {
  id: string;
  entityType: PublishableCmsEntityType;
  canonicalSlug: string;
  canonicalSymbol: string | null;
  sourceTable: string | null;
  sourceRowId: string | null;
  title: string;
  sourcePayload: Record<string, unknown>;
  editorialPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  href: string;
};

const publishableCmsEntityTypes = Object.keys(
  publishableCmsEntityRouteBases,
) as PublishableCmsEntityType[];

let publishableContentCacheVersion = 0;

export function invalidatePublishableContentCaches() {
  publishableContentCacheVersion += 1;
}

export function isDevelopmentPublishableFallbackEnabled() {
  return canUseDebugFallbackPaths() && env.devPublishableFallback === "true";
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function normalizePublicHref(href: string) {
  const normalized = href.split(/[?#]/, 1)[0]?.trim().replace(/\/+$/g, "") ?? "";
  return normalized || "/";
}

function mapPublishableContentRecord(row: PublishableContentRecordRow): PublishableCmsRecord {
  const routeBase = publishableCmsEntityRouteBases[row.entity_type];

  return {
    id: row.id,
    entityType: row.entity_type,
    canonicalSlug: row.canonical_slug,
    canonicalSymbol: row.canonical_symbol,
    sourceTable: row.source_table,
    sourceRowId: row.source_row_id,
    title: row.title,
    sourcePayload: row.source_payload ?? {},
    editorialPayload: row.editorial_payload ?? {},
    metadata: row.metadata ?? {},
    publishedAt: row.published_at,
    href: `${routeBase}/${row.canonical_slug}`,
  };
}

function requiresDurableSourceBacking(record: Pick<PublishableCmsRecord, "entityType" | "sourceRowId">) {
  return ["stock", "mutual_fund", "ipo"].includes(record.entityType) && !record.sourceRowId;
}

function logPublishableContentWarning(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[cms-public] ${operation}: ${detail}`);
}

async function getDevelopmentFallbackRecords(
  entityType: PublishableCmsEntityType,
): Promise<PublishableCmsRecord[]> {
  if (!isDevelopmentPublishableFallbackEnabled()) {
    return [];
  }

  try {
    if (entityType === "course") {
      return courses.map((course) => ({
        id: `dev-preview-course:${course.slug}`,
        entityType: "course",
        canonicalSlug: course.slug,
        canonicalSymbol: null,
        sourceTable: null,
        sourceRowId: null,
        title: course.title,
        sourcePayload: {
          category: course.category,
          level: course.level,
          access: course.access,
        },
        editorialPayload: {
          summary: course.summary,
        },
        metadata: {
          developmentPreview: true,
          previewSource: "courses_catalog",
        },
        publishedAt: null,
        href: `/courses/${course.slug}`,
      }));
    }

    if (entityType === "webinar") {
      return webinars.map((webinar) => ({
        id: `dev-preview-webinar:${webinar.slug}`,
        entityType: "webinar",
        canonicalSlug: webinar.slug,
        canonicalSymbol: null,
        sourceTable: null,
        sourceRowId: null,
        title: webinar.title,
        sourcePayload: {
          format: webinar.format,
          audience: webinar.audience,
          access: webinar.access,
        },
        editorialPayload: {
          summary: webinar.summary,
        },
        metadata: {
          developmentPreview: true,
          previewSource: "webinars_catalog",
        },
        publishedAt: null,
        href: `/webinars/${webinar.slug}`,
      }));
    }

    if (!hasRuntimeSupabaseEnv()) {
      return [];
    }

    const supabase = createSupabaseReadClient();

    if (entityType === "stock") {
      const { data, error } = await supabase
        .from("instruments")
        .select("id,slug,symbol,name,instrument_type,exchange")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? [])
        .filter(
          (row) =>
            typeof row?.slug === "string" &&
            typeof row?.name === "string" &&
            ["stock", "equity", "share"].includes(
              String(row?.instrument_type ?? "")
                .trim()
                .toLowerCase(),
            ),
        )
        .map((row) => ({
          id: `dev-preview-stock:${row.id}`,
          entityType: "stock" as const,
          canonicalSlug: normalizeSlug(row.slug),
          canonicalSymbol: typeof row.symbol === "string" ? row.symbol : null,
          sourceTable: "instruments",
          sourceRowId: typeof row.id === "string" ? row.id : null,
          title: row.name,
          sourcePayload: {
            exchange: typeof row.exchange === "string" ? row.exchange : null,
            instrument_type: row.instrument_type,
            symbol: typeof row.symbol === "string" ? row.symbol : null,
          },
          editorialPayload: {},
          metadata: {
            developmentPreview: true,
            previewSource: "instruments",
          },
          publishedAt: null,
          href: `/stocks/${normalizeSlug(row.slug)}`,
        }));
    }

    if (entityType === "mutual_fund") {
      const { data, error } = await supabase
        .from("mutual_funds")
        .select("id,slug,fund_name,category,amc_name")
        .order("fund_name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? [])
        .filter(
          (row) => typeof row?.slug === "string" && typeof row?.fund_name === "string",
        )
        .map((row) => ({
          id: `dev-preview-fund:${row.id}`,
          entityType: "mutual_fund" as const,
          canonicalSlug: normalizeSlug(row.slug),
          canonicalSymbol: null,
          sourceTable: "mutual_funds",
          sourceRowId: typeof row.id === "string" ? row.id : null,
          title: row.fund_name,
          sourcePayload: {
            category: typeof row.category === "string" ? row.category : null,
            amc_name: typeof row.amc_name === "string" ? row.amc_name : null,
          },
          editorialPayload: {},
          metadata: {
            developmentPreview: true,
            previewSource: "mutual_funds",
          },
          publishedAt: null,
          href: `/mutual-funds/${normalizeSlug(row.slug)}`,
        }));
    }

    if (entityType === "ipo") {
      const { data, error } = await supabase
        .from("ipos")
        .select("id,slug,company_name,ipo_type,status")
        .order("company_name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? [])
        .filter(
          (row) => typeof row?.slug === "string" && typeof row?.company_name === "string",
        )
        .map((row) => ({
          id: `dev-preview-ipo:${row.id}`,
          entityType: "ipo" as const,
          canonicalSlug: normalizeSlug(row.slug),
          canonicalSymbol: null,
          sourceTable: "ipos",
          sourceRowId: typeof row.id === "string" ? row.id : null,
          title: row.company_name,
          sourcePayload: {
            ipo_type: typeof row.ipo_type === "string" ? row.ipo_type : null,
            status: typeof row.status === "string" ? row.status : null,
          },
          editorialPayload: {},
          metadata: {
            developmentPreview: true,
            previewSource: "ipos",
          },
          publishedAt: null,
          href: `/ipo/${normalizeSlug(row.slug)}`,
        }));
    }

    return [];
  } catch (error) {
    logPublishableContentWarning(
      `Unable to build development preview records for ${entityType}`,
      error,
    );
    return [];
  }
}

const getPublishableCmsRecordsCached = cache(
  async (
    entityType: PublishableCmsEntityType,
    cacheVersion: number,
  ): Promise<PublishableCmsRecord[]> => {
    void cacheVersion;
    let records: PublishableCmsRecord[] = [];
    let durableReadAttempted = false;

    if (hasRuntimeSupabaseAdminEnv() || process.env.NODE_ENV === "development") {
      try {
        const supabase = hasRuntimeSupabaseAdminEnv()
          ? createSupabaseAdminClient()
          : createSupabaseReadClient();
        durableReadAttempted = true;
        const { data, error } = await supabase
          .from("publishable_content_records")
          .select(
            "id,entity_type,canonical_slug,canonical_symbol,source_table,source_row_id,title,source_payload,editorial_payload,metadata,published_at",
          )
          .eq("entity_type", entityType)
          .order("title", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        records = (data ?? [])
          .map((row) => mapPublishableContentRecord(row as PublishableContentRecordRow))
          .filter((record) => !requiresDurableSourceBacking(record));
      } catch (error) {
        logPublishableContentWarning(
          `Unable to read publishable CMS records for ${entityType}`,
          error,
        );
      }
    }

    if (records.length > 0) {
      return records;
    }

    if (durableReadAttempted && !isDevelopmentPublishableFallbackEnabled()) {
      return [];
    }

    return getDevelopmentFallbackRecords(entityType);
  },
);

export async function getPublishableCmsRecords(
  entityType: PublishableCmsEntityType,
): Promise<PublishableCmsRecord[]> {
  return getPublishableCmsRecordsCached(entityType, publishableContentCacheVersion);
}

const getPublishableCmsRecordBySlugCached = cache(
  async (
    entityType: PublishableCmsEntityType,
    slug: string,
    cacheVersion: number,
  ): Promise<PublishableCmsRecord | null> => {
    void cacheVersion;
    const normalizedSlug = normalizeSlug(slug);

    if (!normalizedSlug) {
      return null;
    }

    const records = await getPublishableCmsRecords(entityType);
    return records.find((record) => record.canonicalSlug === normalizedSlug) ?? null;
  },
);

export async function getPublishableCmsRecordBySlug(
  entityType: PublishableCmsEntityType,
  slug: string,
): Promise<PublishableCmsRecord | null> {
  return getPublishableCmsRecordBySlugCached(entityType, slug, publishableContentCacheVersion);
}

export async function getPublishableCmsSlugSet(entityType: PublishableCmsEntityType) {
  return new Set(
    (await getPublishableCmsRecords(entityType)).map((record) => record.canonicalSlug),
  );
}

const getPublishableCmsHrefSetCached = cache(async (cacheVersion: number) => {
  const records = (
    await Promise.all(
      publishableCmsEntityTypes.map((entityType) =>
        getPublishableCmsRecordsCached(entityType, cacheVersion),
      ),
    )
  ).flat();

  return new Set(records.map((record) => normalizePublicHref(record.href)));
});

export async function getPublishableCmsHrefSet() {
  return getPublishableCmsHrefSetCached(publishableContentCacheVersion);
}

export async function filterEntriesToPublishableCms<T extends { href: string }>(entries: readonly T[]) {
  const publishableHrefSet = await getPublishableCmsHrefSet();

  return entries.filter((entry) => publishableHrefSet.has(normalizePublicHref(entry.href)));
}
