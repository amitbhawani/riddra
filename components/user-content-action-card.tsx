"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { ProductCard } from "@/components/product-page-system";
import type { ProductPageType } from "@/lib/user-product-store";

type FeatureGate = {
  label: string;
  enabled: boolean;
  lockedReason: string;
  ctaHref: string;
  ctaLabel: string;
};

export function UserContentActionCard({
  pageType,
  slug,
  title,
  href,
  isSignedIn,
  allowWatchlist = false,
  watchlistPageType = "stock",
  watchlistQuery,
  featureGate,
  variant = "default",
}: {
  pageType: ProductPageType;
  slug: string;
  title: string;
  href: string;
  isSignedIn: boolean;
  allowWatchlist?: boolean;
  watchlistPageType?: "stock" | "mutual_fund";
  watchlistQuery?: string;
  featureGate?: FeatureGate | null;
  variant?: "default" | "compact";
}) {
  const [banner, setBanner] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTracked, setIsTracked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const watchlistTarget = watchlistQuery?.trim() || slug;

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    fetch("/api/account/bookmarks")
      .then((response) => response.json())
      .then((data: { items?: Array<{ pageType: ProductPageType; slug: string }> }) => {
        if (Array.isArray(data.items)) {
          setIsBookmarked(
            data.items.some((item) => item.pageType === pageType && item.slug === slug),
          );
        }
      })
      .catch(() => undefined);

    if (allowWatchlist) {
      fetch("/api/account/watchlist-items")
        .then((response) => response.json())
        .then((data: { items?: Array<{ pageType: "stock" | "mutual_fund"; slug: string }> }) => {
          if (Array.isArray(data.items)) {
            setIsTracked(
              data.items.some(
                (item) => item.pageType === watchlistPageType && item.slug === watchlistTarget,
              ),
            );
          }
        })
        .catch(() => undefined);
    }

    fetch("/api/account/recently-viewed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageType, slug, title, href }),
    }).catch(() => undefined);
  }, [allowWatchlist, href, isSignedIn, pageType, slug, title, watchlistPageType, watchlistTarget]);

  function toggleBookmark() {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/bookmarks", {
        method: isBookmarked ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isBookmarked ? { pageType, slug } : { pageType, slug, title, href },
        ),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not update bookmarks right now.",
        });
        return;
      }

      setIsBookmarked((current) => !current);
      setBanner({
        tone: "success",
        text: isBookmarked ? "Bookmark removed." : "Page bookmarked.",
      });
    });
  }

  function addToWatchlist() {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/watchlist-items", {
        method: isTracked ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isTracked
            ? { slug: watchlistTarget, pageType: watchlistPageType }
            : { query: watchlistTarget, pageType: watchlistPageType },
        ),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not update the watchlist right now.",
        });
        return;
      }

      setIsTracked((current) => !current);
      setBanner({
        tone: "success",
        text: isTracked ? "Removed from watchlist." : "Added to watchlist.",
      });
    });
  }

  const bannerNode = banner ? (
    <div
      className={`rounded-[10px] border px-3 py-2 text-sm ${
        banner.tone === "success"
          ? "border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.92)] text-[#166534]"
          : "border-[rgba(248,113,113,0.18)] bg-[rgba(254,242,242,0.92)] text-[#b91c1c]"
      }`}
    >
      {banner.text}
    </div>
  ) : null;

  const actionNode = isSignedIn ? (
    variant === "compact" ? (
      <div className="grid gap-2">
        <Link
          href="/account"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 text-sm font-medium text-white"
        >
          Open account
        </Link>
        <button
          type="button"
          onClick={toggleBookmark}
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm font-medium text-[#1B3A6B]"
        >
          {isBookmarked ? "Remove bookmark" : "Bookmark page"}
        </button>
        {allowWatchlist ? (
          <button
            type="button"
            onClick={addToWatchlist}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-4 text-sm font-medium text-[#1B3A6B]"
          >
            {isTracked ? "Remove from watchlist" : "Add to watchlist"}
          </button>
        ) : null}
      </div>
    ) : (
      <div className="grid gap-2">
        <button
          type="button"
          onClick={toggleBookmark}
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 text-sm font-medium text-white"
        >
          {isBookmarked ? "Remove bookmark" : "Bookmark page"}
        </button>
        {allowWatchlist ? (
          <button
            type="button"
            onClick={addToWatchlist}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm font-medium text-[#1B3A6B]"
          >
            {isTracked ? "Remove from watchlist" : "Add to watchlist"}
          </button>
        ) : null}
        <Link
          href="/account"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-4 text-sm font-medium text-[#1B3A6B]"
        >
          Open account
        </Link>
      </div>
    )
  ) : (
    <div className="space-y-2">
      <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.88)]">
        Sign in to bookmark this page, track it in your watchlist, and keep it in your recently viewed history.
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(href)}`}
        className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 text-sm font-medium text-white"
      >
        Sign in to save
      </Link>
    </div>
  );

  const featureGateNode = featureGate ? (
    <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-3 py-3">
      <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.76)]">
        {featureGate.label}
      </p>
      <p className="riddra-product-body mt-2 text-sm leading-6 text-[#1B3A6B]">
        {featureGate.enabled
          ? "Unlocked on your current membership."
          : featureGate.lockedReason}
      </p>
      {!featureGate.enabled ? (
        <Link
          href={featureGate.ctaHref}
          className="riddra-product-body mt-3 inline-flex text-sm font-medium text-[#1B3A6B] underline"
        >
          {featureGate.ctaLabel}
        </Link>
      ) : null}
    </div>
  ) : null;

  if (variant === "compact") {
    return (
      <div className="space-y-2.5 pt-1">
        {bannerNode}
        {actionNode}
        {featureGateNode}
      </div>
    );
  }

  return (
    <ProductCard tone="secondary" className="space-y-3">
      <div className="space-y-1">
        <p className="riddra-product-display text-[16px] font-semibold text-[#1B3A6B]">Save this page</p>
        <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.88)]">
          Keep this route close to your account so you can pick it up again quickly.
        </p>
      </div>
      {bannerNode}
      {actionNode}
      {featureGateNode}
    </ProductCard>
  );
}
