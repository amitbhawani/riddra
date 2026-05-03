"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { MouseEvent, ReactNode, KeyboardEvent } from "react";

import { getInternalLinkProps } from "@/lib/link-utils";

type MarketNewsClickSurfaceProps = {
  href: string;
  articleId: string;
  entityType?: string | null;
  entitySlug?: string | null;
  className?: string;
  children: ReactNode;
};

const seenMarketNewsImpressions = new Set<string>();

function normalizeHrefForComparison(value: string) {
  try {
    if (value.startsWith("/")) {
      return new URL(value, window.location.origin).pathname;
    }

    return new URL(value).pathname;
  } catch {
    return value;
  }
}

function trackMarketNewsEvent(input: {
  articleId: string;
  eventType?: "click" | "impression";
  entityType?: string | null;
  entitySlug?: string | null;
}) {
  const payload = JSON.stringify({
    articleId: input.articleId,
    eventType: input.eventType ?? "click",
    entityType: input.entityType ?? "",
    entitySlug: input.entitySlug ?? "",
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/market-news/click", blob);
      return;
    }

    void fetch("/api/market-news/click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Intentionally swallow analytics failures so navigation never blocks.
  }
}

export function MarketNewsTrackedLink({
  href,
  articleId,
  entityType,
  entitySlug,
  className,
  children,
}: MarketNewsClickSurfaceProps) {
  return (
    <Link
      href={href}
      {...getInternalLinkProps()}
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        trackMarketNewsEvent({ articleId, eventType: "click", entityType, entitySlug });
      }}
    >
      {children}
    </Link>
  );
}

export function MarketNewsClickSurface({
  href,
  articleId,
  entityType,
  entitySlug,
  className,
  children,
}: MarketNewsClickSurfaceProps) {
  const router = useRouter();
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (seenMarketNewsImpressions.has(articleId)) {
      return;
    }

    const element = surfaceRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const hasVisibleEntry = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35,
        );

        if (!hasVisibleEntry || seenMarketNewsImpressions.has(articleId)) {
          return;
        }

        seenMarketNewsImpressions.add(articleId);
        trackMarketNewsEvent({
          articleId,
          eventType: "impression",
          entityType,
          entitySlug,
        });
        observer.disconnect();
      },
      {
        threshold: [0.35],
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [articleId, entitySlug, entityType]);

  const handleSurfaceNavigation = () => {
    trackMarketNewsEvent({ articleId, eventType: "click", entityType, entitySlug });
    router.push(href);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

    if (anchor) {
      const anchorHref = anchor.getAttribute("href")?.trim() ?? "";

      if (
        anchorHref &&
        normalizeHrefForComparison(anchorHref) === normalizeHrefForComparison(href)
      ) {
        trackMarketNewsEvent({ articleId, eventType: "click", entityType, entitySlug });
      }

      return;
    }

    handleSurfaceNavigation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleSurfaceNavigation();
  };

  return (
    <div
      role="link"
      tabIndex={0}
      ref={surfaceRef}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
