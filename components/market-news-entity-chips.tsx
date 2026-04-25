import Link from "next/link";

import type { MarketNewsArticleEntityRecord } from "@/lib/market-news/types";

function getEntityHref(entity: MarketNewsArticleEntityRecord) {
  switch (entity.entity_type) {
    case "stock":
      return `/stocks/${entity.entity_slug}`;
    case "sector":
      return `/sectors/${entity.entity_slug}`;
    case "etf":
      return `/etfs/${entity.entity_slug}`;
    case "ipo":
      return `/ipo/${entity.entity_slug}`;
    case "mutual_fund":
      return `/mutual-funds/${entity.entity_slug}`;
    case "index":
      return `/${entity.entity_slug}`;
    case "market":
      return "/markets";
    default:
      return null;
  }
}

function getEntityToneClasses(entity: MarketNewsArticleEntityRecord, compact: boolean) {
  const base = compact
    ? "px-2.5 py-1 text-[11px]"
    : "px-3 py-1.5 text-[12px]";

  switch (entity.entity_type) {
    case "stock":
      return `${base} border-[rgba(27,58,107,0.16)] bg-[rgba(27,58,107,0.05)] text-[#1B3A6B]`;
    case "sector":
      return `${base} border-[rgba(107,114,128,0.18)] bg-[rgba(107,114,128,0.06)] text-[#4B5563]`;
    case "etf":
      return `${base} border-[rgba(26,127,75,0.18)] bg-[rgba(26,127,75,0.06)] text-[#1A7F4B]`;
    case "ipo":
      return `${base} border-[rgba(212,133,59,0.22)] bg-[rgba(212,133,59,0.09)] text-[#8E5723]`;
    case "mutual_fund":
      return `${base} border-[rgba(82,183,136,0.2)] bg-[rgba(82,183,136,0.08)] text-[#1E6F5C]`;
    case "index":
      return `${base} border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.06)] text-[#1D4ED8]`;
    case "market":
      return `${base} border-[rgba(148,163,184,0.24)] bg-[rgba(148,163,184,0.08)] text-[#475569]`;
    default:
      return `${base} border-[rgba(221,215,207,0.92)] bg-[rgba(250,249,247,0.92)] text-[rgba(75,85,99,0.88)]`;
  }
}

export function MarketNewsEntityChips({
  entities,
  limit = 5,
  compact = false,
  activeEntitySlug,
}: {
  entities: MarketNewsArticleEntityRecord[];
  limit?: number;
  compact?: boolean;
  activeEntitySlug?: string | null;
}) {
  const dedupedEntities = Array.from(
    new Map(
      entities
        .filter((entity) => entity.display_name.trim())
        .map((entity) => [`${entity.entity_type}:${entity.entity_slug}`, entity]),
    ).values(),
  ).slice(0, limit);

  if (!dedupedEntities.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {dedupedEntities.map((entity) => {
        const href = getEntityHref(entity);
        const isActive = activeEntitySlug && entity.entity_slug === activeEntitySlug;
        const className = `inline-flex items-center rounded-full border font-medium transition ${
          isActive
            ? compact
              ? "px-2.5 py-1 text-[11px] border-[rgba(27,58,107,0.22)] bg-[rgba(27,58,107,0.08)] text-[#1B3A6B]"
              : "px-3 py-1.5 text-[12px] border-[rgba(27,58,107,0.22)] bg-[rgba(27,58,107,0.08)] text-[#1B3A6B]"
            : getEntityToneClasses(entity, compact)
        }`;

        if (!href) {
          return (
            <span key={`${entity.entity_type}:${entity.entity_slug}`} className={className}>
              {entity.display_name}
            </span>
          );
        }

        return (
          <Link
            key={`${entity.entity_type}:${entity.entity_slug}`}
            href={href}
            className={className}
          >
            {entity.display_name}
          </Link>
        );
      })}
    </div>
  );
}
