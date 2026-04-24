"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { SearchSuggestion } from "@/lib/search-suggestions";

type SearchAssistFormProps = {
  defaultValue?: string;
  placeholder?: string;
  compact?: boolean;
  chromeTheme?: "dark" | "light";
};

export function SearchAssistForm({
  defaultValue = "",
  placeholder = "Search Riddra ...",
  compact = false,
  chromeTheme = "light",
}: SearchAssistFormProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const normalizedQuery = query.trim();

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    setSuggestions([]);
    setSuggestionMessage(null);

    if (compact && pathname !== "/search") {
      setQuery("");
    }
  }, [compact, pathname, searchParams]);

  useEffect(() => {
    const shouldFetch = compact ? normalizedQuery.length >= 2 : normalizedQuery.length > 0;

    if (!shouldFetch) {
      setSuggestions([]);
      setSuggestionMessage(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/suggestions?query=${encodeURIComponent(normalizedQuery)}&limit=${compact ? 6 : 12}`,
          { signal: controller.signal },
        );

        const payload = (await response.json()) as {
          suggestions?: SearchSuggestion[];
          degraded?: boolean;
          message?: string | null;
        };

        if (!active) {
          return;
        }

        setSuggestions(payload.suggestions ?? []);
        setSuggestionMessage(
          response.ok && !payload.degraded
            ? null
            : payload.message ?? "Search suggestions are waiting for a live Meilisearch index.",
        );
      } catch {
        if (!active || controller.signal.aborted) {
          return;
        }

        setSuggestions([]);
        setSuggestionMessage("Search suggestions are unavailable until the live Meilisearch index is ready.");
      }
    }, compact ? 100 : 140);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [compact, normalizedQuery]);

  const compactDark = compact && chromeTheme === "dark";
  const fullLight = !compact && chromeTheme === "light";
  const showCompactFallback = compact && normalizedQuery.length > 0 && suggestions.length === 0;

  return (
    <div className={compact ? "relative" : "space-y-3"}>
      <form
        action="/search"
        onSubmit={() => {
          setSuggestions([]);
        }}
        className={
          compact
            ? compactDark
              ? "flex h-[34px] items-center gap-2 overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.08)] px-3 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-[border-color,background-color] duration-200 focus-within:border-[#D4853B] focus-within:bg-[rgba(255,255,255,0.1)]"
              : "flex h-[34px] items-center gap-2 overflow-hidden rounded-[10px] border border-[rgba(15,23,42,0.1)] bg-white px-3 text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] duration-200 focus-within:border-[#D4853B] focus-within:shadow-[0_12px_28px_rgba(212,133,59,0.18)]"
            : "flex flex-col gap-4 lg:flex-row lg:items-center"
        }
      >
        {compact ? (
          <span
            aria-hidden="true"
            className={compactDark ? "text-[rgba(255,255,255,0.62)]" : "text-[rgba(71,85,105,0.82)]"}
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="8.5" cy="8.5" r="5.25" />
              <path d="M12.5 12.5 16.25 16.25" strokeLinecap="round" />
            </svg>
          </span>
        ) : null}
        <input
          type="search"
          name="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className={
            compact
              ? compactDark
                ? "h-full w-full min-w-[132px] bg-transparent text-[12px] font-medium text-white outline-none placeholder:text-[rgba(255,255,255,0.42)]"
                : "h-full w-full min-w-[132px] bg-transparent text-[12px] font-medium text-[#111827] outline-none placeholder:text-[rgba(107,114,128,0.76)]"
              : fullLight
                ? "min-h-[52px] flex-1 rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-5 text-sm text-[#1B3A6B] shadow-[0_10px_24px_rgba(27,58,107,0.06)] outline-none placeholder:text-[rgba(107,114,128,0.68)]"
                : "min-h-[52px] flex-1 rounded-full border border-white/12 bg-white/[0.04] px-5 text-sm text-white outline-none placeholder:text-mist/50"
          }
        />
        {compact ? null : (
          <button
            type="submit"
            className={
              fullLight
                ? "rounded-full border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#163157]"
                : "rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
            }
          >
            Search intelligently
          </button>
        )}
      </form>

      {suggestions.length > 0 ? (
        <div
          className={
            compact
              ? compactDark
                ? "absolute left-0 top-full z-[95] mt-3 grid w-[min(92vw,440px)] gap-1.5 rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[#1c1c1c] p-2.5 shadow-[0_24px_44px_rgba(0,0,0,0.42)]"
                : "absolute left-0 top-full z-[95] mt-3 grid w-[min(92vw,440px)] gap-1.5 rounded-[18px] border border-[rgba(221,215,207,0.92)] bg-[rgba(251,250,248,0.98)] p-2.5 shadow-2xl shadow-[rgba(27,58,107,0.12)]"
              : "grid gap-2 md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {suggestions.map((item) => (
            <Link
              key={`${item.category}-${item.href}`}
              href={item.href}
              onClick={() => {
                setSuggestions([]);
                if (compact) {
                  setQuery("");
                }
              }}
              className={
                compactDark
                  ? "rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 transition hover:border-[rgba(212,133,59,0.32)] hover:bg-[rgba(255,255,255,0.08)]"
                  : "rounded-2xl border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 transition hover:border-[rgba(27,58,107,0.16)] hover:bg-[rgba(27,58,107,0.02)]"
              }
            >
              <div className={compact ? "space-y-2" : "space-y-2"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={compactDark ? "truncate text-[15px] font-semibold text-white" : "truncate text-[15px] font-semibold text-[#1B3A6B]"}>
                      {item.title}
                    </p>
                    <p
                      className={
                        compactDark
                          ? "mt-1 truncate text-[12px] leading-5 text-[rgba(255,255,255,0.64)]"
                          : "mt-1 truncate text-[12px] leading-5 text-[rgba(107,114,128,0.76)]"
                      }
                    >
                      {item.context}
                    </p>
                  </div>
                  <span
                    className={
                      compactDark
                        ? "shrink-0 rounded-full bg-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(255,255,255,0.62)]"
                        : "shrink-0 rounded-full bg-[rgba(27,58,107,0.05)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]"
                    }
                  >
                    {item.category}
                  </span>
                </div>
                {item.truthLabel ? (
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={
                        compactDark
                          ? "rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(255,255,255,0.66)]"
                          : "rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.03)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(27,58,107,0.78)]"
                      }
                    >
                      {item.truthLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {showCompactFallback ? (
        <div
          className={
            compactDark
              ? "absolute left-0 right-0 top-full z-[94] mt-3 rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[#1c1c1c] px-4 py-3 shadow-[0_24px_44px_rgba(0,0,0,0.42)]"
              : "absolute left-0 right-0 top-full z-[94] mt-3 rounded-[18px] border border-[rgba(221,215,207,0.92)] bg-[rgba(251,250,248,0.98)] px-4 py-3 shadow-2xl shadow-[rgba(27,58,107,0.12)]"
          }
        >
          <Link
            href={`/search?query=${encodeURIComponent(normalizedQuery)}`}
            className={
              compactDark
                ? "block rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-3 transition hover:border-[rgba(212,133,59,0.32)] hover:bg-[rgba(255,255,255,0.08)]"
                : "block rounded-[14px] border border-[rgba(27,58,107,0.12)] bg-white px-3.5 py-3 transition hover:border-[rgba(212,133,59,0.36)] hover:bg-[rgba(27,58,107,0.02)]"
            }
          >
            <p className={compactDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-[#1B3A6B]"}>
              Search all results for "{normalizedQuery}"
            </p>
            <p
              className={
                compactDark
                  ? "mt-1 text-xs leading-5 text-[rgba(255,255,255,0.62)]"
                  : "mt-1 text-xs leading-5 text-[rgba(107,114,128,0.76)]"
              }
            >
              Open the full search page and browse stocks, funds, indices, tools, and workflows.
            </p>
          </Link>
        </div>
      ) : null}

      {normalizedQuery && suggestionMessage && !compact ? (
        <div
          className={
            compact
              ? compactDark
                ? "absolute left-0 right-0 top-full z-[89] mt-3 rounded-[18px] border border-[rgba(212,133,59,0.36)] bg-[rgba(38,24,12,0.96)] px-4 py-3 text-xs leading-6 text-[#f8d7b6] shadow-[0_24px_44px_rgba(0,0,0,0.42)]"
                : "absolute left-0 right-0 top-full z-20 mt-3 rounded-[18px] border border-amber-500/25 bg-[rgba(250,246,240,0.98)] px-4 py-3 text-xs leading-6 text-[#8E5723] shadow-2xl shadow-[rgba(27,58,107,0.12)]"
              : fullLight
                ? "rounded-[24px] border border-[rgba(212,133,59,0.24)] bg-[rgba(250,246,240,0.94)] px-4 py-3 text-sm leading-7 text-[#8E5723]"
                : "rounded-[24px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-100"
          }
        >
          <p className={compactDark ? "font-medium uppercase tracking-[0.14em] text-[#f3b875]" : "font-medium uppercase tracking-[0.14em] text-[#8E5723]"}>
            Search suggestions unavailable
          </p>
          <p className="mt-2">{suggestionMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
