"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import type { UserWatchlistItem } from "@/lib/user-product-store";

type UserWatchlistPanelItem = UserWatchlistItem & {
  livePrice?: string | null;
  dayChange?: string | null;
  week52Low?: string | null;
  week52High?: string | null;
  sectorLabel?: string | null;
  nav?: string | null;
  returns1Y?: string | null;
  categoryLabel?: string | null;
  benchmarkLabel?: string | null;
};

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

function getItemLabel(item: UserWatchlistItem) {
  return item.pageType === "mutual_fund" ? "Mutual fund" : "Stock";
}

function getChangeTone(value: string | null | undefined) {
  if (!value) {
    return "text-[rgba(75,85,99,0.84)]";
  }

  const normalized = value.trim();
  if (normalized.startsWith("-")) {
    return "text-[#B42318]";
  }

  if (normalized.startsWith("+")) {
    return "text-[#166534]";
  }

  return "text-[rgba(75,85,99,0.84)]";
}

function formatCellValue(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();

  if (!normalized || /^awaiting verified/i.test(normalized)) {
    return fallback;
  }

  return normalized;
}

function getWatchlistQueryError(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "Enter a stock symbol, stock slug, or mutual fund name.";
  }

  if (normalized.length < 2) {
    return "Enter at least 2 characters.";
  }

  if (!/^[a-z0-9&./()'’\-\s]+$/i.test(normalized)) {
    return "Use letters, numbers, spaces, hyphen, slash, ampersand, apostrophe, or dot.";
  }

  return null;
}

export function UserWatchlistPanel({
  initialItems,
  mode = "full",
}: {
  initialItems: UserWatchlistPanelItem[];
  mode?: "full" | "summary";
}) {
  const [items, setItems] = useState<UserWatchlistPanelItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [preferredType, setPreferredType] = useState<"auto" | "stock" | "mutual_fund">("auto");
  const [banner, setBanner] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedQuery = query.trim();
  const queryError = getWatchlistQueryError(query);
  const shouldShowQueryError = Boolean(query) && Boolean(queryError);
  const canAddItem = !isPending && !queryError;

  const stockItems = useMemo(
    () => items.filter((item) => item.pageType === "stock"),
    [items],
  );
  const mutualFundItems = useMemo(
    () => items.filter((item) => item.pageType === "mutual_fund"),
    [items],
  );
  const visibleStocks = mode === "summary" ? stockItems.slice(0, 2) : stockItems;
  const visibleFunds = mode === "summary" ? mutualFundItems.slice(0, 2) : mutualFundItems;

  function addItem() {
    if (queryError) {
      setBanner({
        tone: "danger",
        text: queryError,
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/watchlist-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: normalizedQuery,
          pageType: preferredType === "auto" ? undefined : preferredType,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; items?: UserWatchlistPanelItem[] }
        | null;

      if (!response.ok || !data?.items) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not add that watchlist item right now.",
        });
        return;
      }

      setItems(data.items);
      setQuery("");
      setBanner({
        tone: "success",
        text: "Watchlist updated. The new item is ready to open or remove any time.",
      });
    });
  }

  function removeItem(item: UserWatchlistPanelItem) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/watchlist-items", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: item.slug, pageType: item.pageType }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; items?: UserWatchlistPanelItem[] }
        | null;

      if (!response.ok || !data?.items) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not remove that watchlist item right now.",
        });
        return;
      }

      setItems(data.items);
      setBanner({
        tone: "success",
        text: "Watchlist updated.",
      });
    });
  }

  function renderSummaryItems(
    title: string,
    description: string,
    list: UserWatchlistPanelItem[],
    emptyText: string,
  ) {
    return (
      <div className="space-y-3 rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#1B3A6B]">{title}</p>
            <p className="mt-1 text-sm leading-6 text-[rgba(75,85,99,0.84)]">{description}</p>
          </div>
          <div className="rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-xs font-medium text-[#1B3A6B]">
            {list.length}
          </div>
        </div>

        {list.length ? (
          <div className="space-y-3">
            {list.map((item) => (
              <div
                key={item.id}
                className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[#f8fafc] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#1B3A6B]">{item.title}</p>
                      <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1B3A6B]">
                        {getItemLabel(item)}
                      </span>
                      {item.symbol ? (
                        <span className="rounded-full border border-[rgba(212,133,59,0.18)] bg-[rgba(255,250,244,0.96)] px-2.5 py-1 text-[11px] font-medium text-[#D4853B]">
                          {item.symbol}
                        </span>
                      ) : null}
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
                      onClick={() => removeItem(item)}
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
          <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">{emptyText}</p>
        )}
      </div>
    );
  }

  function renderStockTable(list: UserWatchlistPanelItem[]) {
    return (
      <div className="space-y-4 rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1B3A6B]">Stocks watchlist</p>
            <p className="mt-1 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              Review live price, 1-day move, and 52-week range without leaving your shortlist.
            </p>
          </div>
          <div className="rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-xs font-medium text-[#1B3A6B]">
            {list.length}
          </div>
        </div>

        {list.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(75,85,99,0.72)]">
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">Stock</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">Price</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">1D move</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">52W low</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">52W high</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">Added</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4">
                      <div className="min-w-[240px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#1B3A6B]">{item.title}</p>
                          {item.symbol ? (
                            <span className="rounded-full border border-[rgba(212,133,59,0.18)] bg-[rgba(255,250,244,0.96)] px-2.5 py-1 text-[11px] font-medium text-[#D4853B]">
                              {item.symbol}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[rgba(107,114,128,0.88)]">
                          {formatCellValue(item.sectorLabel, item.href)}
                        </p>
                      </div>
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm font-semibold text-[#111827]">
                      {formatCellValue(item.livePrice, "Awaiting quote")}
                    </td>
                    <td
                      className={`border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm font-semibold ${getChangeTone(item.dayChange)}`}
                    >
                      {formatCellValue(item.dayChange, "Awaiting move")}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm text-[rgba(75,85,99,0.92)]">
                      {formatCellValue(item.week52Low, "Awaiting range")}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm text-[rgba(75,85,99,0.92)]">
                      {formatCellValue(item.week52High, "Awaiting range")}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm text-[rgba(75,85,99,0.92)]">
                      {formatSavedDate(item.addedAt)}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={item.href}
                          className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-3 text-xs font-medium text-[#1B3A6B]"
                        >
                          Open page
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          disabled={isPending}
                          className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-3 text-xs font-medium text-[#1B3A6B]"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
            No stocks saved yet. Start with a symbol or slug like TATAMOTORS or tata-motors.
          </p>
        )}
      </div>
    );
  }

  function renderFundTable(list: UserWatchlistPanelItem[]) {
    return (
      <div className="space-y-4 rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1B3A6B]">Mutual funds watchlist</p>
            <p className="mt-1 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              Keep your tracked schemes organised with NAV, 1-year return, and benchmark context.
            </p>
          </div>
          <div className="rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-xs font-medium text-[#1B3A6B]">
            {list.length}
          </div>
        </div>

        {list.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(75,85,99,0.72)]">
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">Fund</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">NAV</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">1Y return</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">Category</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">Benchmark</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3">Added</th>
                  <th className="border-b border-[rgba(221,215,207,0.96)] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4">
                      <div className="min-w-[240px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#1B3A6B]">{item.title}</p>
                          <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-2.5 py-1 text-[11px] font-medium text-[#1B3A6B]">
                            Mutual fund
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[rgba(107,114,128,0.88)]">
                          {formatCellValue(item.categoryLabel, item.href)}
                        </p>
                      </div>
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm font-semibold text-[#111827]">
                      {formatCellValue(item.nav, "Awaiting NAV")}
                    </td>
                    <td
                      className={`border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm font-semibold ${getChangeTone(item.returns1Y)}`}
                    >
                      {formatCellValue(item.returns1Y, "Awaiting return")}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm text-[rgba(75,85,99,0.92)]">
                      {formatCellValue(item.categoryLabel, "Awaiting category")}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm text-[rgba(75,85,99,0.92)]">
                      {formatCellValue(item.benchmarkLabel, "Awaiting benchmark")}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4 text-sm text-[rgba(75,85,99,0.92)]">
                      {formatSavedDate(item.addedAt)}
                    </td>
                    <td className="border-b border-[rgba(239,232,223,0.9)] px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={item.href}
                          className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-3 text-xs font-medium text-[#1B3A6B]"
                        >
                          Open page
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          disabled={isPending}
                          className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-3 text-xs font-medium text-[#1B3A6B]"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
            No mutual funds saved yet. Try a route slug or a full scheme name.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1B3A6B]">Quick add</p>
            <p className="mt-1 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              {mode === "summary"
                ? "Add a stock or mutual fund quickly, then open it straight from your dashboard."
                : "Add by stock symbol, stock slug, or mutual fund name. The system will match the route for you and bring the latest watchlist fields into the table below."}
            </p>
          </div>
          <div className="rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-xs font-medium text-[#1B3A6B]">
            {items.length} tracked
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input
            id="watchlist-quick-add"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (banner?.tone === "danger") {
                setBanner(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addItem();
              }
            }}
            placeholder="TATAMOTORS, tata-motors, or HDFC Mid Cap Opportunities"
            aria-invalid={shouldShowQueryError}
            aria-describedby={shouldShowQueryError ? "watchlist-quick-add-error" : undefined}
            className="h-11 rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9ca3af]"
          />
          <select
            value={preferredType}
            onChange={(event) =>
              setPreferredType(event.target.value as "auto" | "stock" | "mutual_fund")
            }
            className="h-11 rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827]"
          >
            <option value="auto">Auto-detect</option>
            <option value="stock">Stocks only</option>
            <option value="mutual_fund">Mutual funds only</option>
          </select>
          <button
            type="button"
            onClick={addItem}
            disabled={!canAddItem}
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-5 text-sm font-medium text-[#ffffff] disabled:cursor-not-allowed disabled:text-[rgba(255,255,255,0.7)] disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Add to watchlist"}
          </button>
        </div>

        {shouldShowQueryError ? (
          <p id="watchlist-quick-add-error" className="mt-2 text-xs font-medium text-[#b91c1c]">
            {queryError}
          </p>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-[rgba(107,114,128,0.88)]">
          Tip: use auto-detect for most inputs. Choose a specific type only when the name could match more than one page family.
        </p>
      </div>

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

      {mode === "summary" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {renderSummaryItems(
            "Stocks watchlist",
            "Saved stocks stay one click away from your dashboard and account workspace.",
            visibleStocks,
            "No stocks saved yet. Add one above to keep your shortlist ready.",
          )}
          {renderSummaryItems(
            "Mutual funds watchlist",
            "Keep your tracked mutual funds separate from stocks so the page stays easier to scan.",
            visibleFunds,
            "No mutual funds saved yet. Add one above to keep fund research close at hand.",
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {renderStockTable(visibleStocks)}
          {renderFundTable(visibleFunds)}
        </div>
      )}

      {!items.length ? (
        <div className="rounded-[12px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-5 py-6">
          <p className="text-sm font-medium text-[#1B3A6B]">Your watchlist is empty right now</p>
          <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
            Start with one stock or mutual fund and the dashboard will keep it ready for quick return visits.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/stocks" className="text-sm font-medium text-[#1B3A6B] underline">
              Browse stocks
            </Link>
            <Link href="/mutual-funds" className="text-sm font-medium text-[#1B3A6B] underline">
              Browse mutual funds
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
