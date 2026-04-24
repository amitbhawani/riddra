"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { UserBookmarkItem } from "@/lib/user-product-store";

function formatSavedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPageTypeLabel(pageType: UserBookmarkItem["pageType"]) {
  switch (pageType) {
    case "mutual_fund":
      return "Mutual fund";
    case "index":
      return "Index";
    case "learn":
    case "research":
      return "Learn";
    default:
      return "Stock";
  }
}

export function UserBookmarkPanel({
  initialItems,
  mode = "full",
}: {
  initialItems: UserBookmarkItem[];
  mode?: "full" | "summary";
}) {
  const [items, setItems] = useState(initialItems);
  const [banner, setBanner] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleItems = mode === "summary" ? items.slice(0, 4) : items;

  function removeBookmark(item: UserBookmarkItem) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/bookmarks", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageType: item.pageType, slug: item.slug }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; items?: UserBookmarkItem[] }
        | null;

      if (!response.ok || !data?.items) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not remove that bookmark right now.",
        });
        return;
      }

      setItems(data.items);
      setBanner({
        tone: "success",
        text: "Bookmark removed.",
      });
    });
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <div
          className={`rounded-[12px] border px-4 py-3 text-sm ${
            banner.tone === "success"
              ? "border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.92)] text-[#166534]"
              : "border-[rgba(248,113,113,0.18)] bg-[rgba(254,242,242,0.92)] text-[#b91c1c]"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      {items.length ? (
        <div className="grid gap-3">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#1B3A6B]">{item.title}</p>
                    <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-2.5 py-1 text-[11px] font-medium text-[#1B3A6B]">
                      {getPageTypeLabel(item.pageType)}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-[rgba(107,114,128,0.88)]">
                    Saved on {formatSavedDate(item.addedAt)} • {item.href}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={item.href}
                    className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-3 text-xs font-medium text-[#1B3A6B]"
                  >
                    Open page
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeBookmark(item)}
                    disabled={isPending}
                    className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-3 text-xs font-medium text-[#1B3A6B]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-5 py-6">
          <p className="text-sm font-medium text-[#1B3A6B]">No bookmarks yet</p>
          <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
            Bookmark stock, fund, index, or learn pages to keep your most useful routes together.
          </p>
        </div>
      )}
    </div>
  );
}
