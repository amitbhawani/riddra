"use client";

import { useEffect, useState, useTransition } from "react";

type SourceEntryConsolePayload = {
  indexEntries: {
    indexSlug: string;
    companyName: string;
    symbol: string;
    weightPercent: number;
    dailyMovePercent: number;
    sourceDate: string;
    createdAt: string;
  }[];
  routeOverrides: {
    route: string;
    field: string;
    currentValue: string;
    correctedValue: string;
    reason: string;
    reviewDate: string;
    createdAt: string;
  }[];
  stockCloseEntries: {
    slug: string;
    companyName: string;
    symbol: string;
    price: number;
    changePercent: number;
    source: string;
    sourceDate: string;
    createdAt: string;
  }[];
  stockChartEntries: {
    slug: string;
    companyName: string;
    symbol: string;
    timeframe: string;
    source: string;
    sourceDate: string;
    createdAt: string;
    bars: {
      time: string;
      open: number;
      high: number;
      low: number;
      close: number;
    }[];
  }[];
  fundNavEntries: {
    slug: string;
    fundName: string;
    category: string;
    nav: number;
    returns1Y: number;
    source: string;
    sourceDate: string;
    createdAt: string;
  }[];
  fundFactsheetEntries: {
    slug: string;
    fundName: string;
    amcName: string;
    documentLabel: string;
    source: string;
    sourceDate: string;
    referenceUrl?: string;
    createdAt: string;
  }[];
  goldHistory: {
    date: string;
    gold24: number;
    gold22: number;
    gold18: number;
    xauusd: number;
    usdinr: number;
    source: string;
  }[];
  silverHistory: {
    date: string;
    silver999: number;
    silver925: number;
    silver900: number;
    xagusd: number;
    usdinr: number;
    source: string;
  }[];
};

const emptyPayload: SourceEntryConsolePayload = {
  indexEntries: [],
  routeOverrides: [],
  stockCloseEntries: [],
  stockChartEntries: [],
  fundNavEntries: [],
  fundFactsheetEntries: [],
  goldHistory: [],
  silverHistory: [],
};

async function fetchConsolePayload(): Promise<SourceEntryConsolePayload> {
  const response = await fetch("/api/admin/source-entry", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load source entry data.");
  }

  return (await response.json()) as SourceEntryConsolePayload;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function cardInputClassName() {
  return "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-mist/44";
}

function removeButtonClassName() {
  return "rounded-full border border-white/12 bg-black/15 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60";
}

export function SourceEntryConsoleClient() {
  const [payload, setPayload] = useState<SourceEntryConsolePayload>(emptyPayload);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      fetchConsolePayload()
        .then(setPayload)
        .catch((loadError) => {
          setError(loadError instanceof Error ? loadError.message : "Unable to load source entry data.");
        });
    });
  }, []);

  const submitPayload = (body: Record<string, unknown>, successMessage: string, form?: HTMLFormElement | null) => {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/source-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const next = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof next.error === "string" ? next.error : "Save failed.");
        }

        form?.reset();
        setNotice(successMessage);
        setPayload(await fetchConsolePayload());
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Save failed.");
      }
    });
  };

  const removePayload = (body: Record<string, unknown>, successMessage: string) => {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/source-entry", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const next = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof next.error === "string" ? next.error : "Remove failed.");
        }

        setNotice(successMessage);
        setPayload(await fetchConsolePayload());
      } catch (removeError) {
        setError(removeError instanceof Error ? removeError.message : "Remove failed.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {notice ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Index constituent entry</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Log official component rows here while factsheet cleanup is in progress.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              submitPayload(
                {
                  type: "index-entry",
                  data: {
                    indexSlug: formData.get("indexSlug"),
                    companyName: formData.get("companyName"),
                    symbol: formData.get("symbol"),
                    weightPercent: formData.get("weightPercent"),
                    dailyMovePercent: formData.get("dailyMovePercent"),
                    sourceDate: formData.get("sourceDate"),
                  },
                },
                "Index entry saved to the backend store.",
                form,
              );
            }}
          >
            <input name="indexSlug" placeholder="Index slug (nifty50, banknifty)" className={cardInputClassName()} required />
            <input name="companyName" placeholder="Company name" className={cardInputClassName()} required />
            <input name="symbol" placeholder="Symbol" className={cardInputClassName()} required />
            <input name="weightPercent" type="number" step="0.01" placeholder="Weight %" className={cardInputClassName()} required />
            <input name="dailyMovePercent" type="number" step="0.01" placeholder="Daily move %" className={cardInputClassName()} required />
            <input name="sourceDate" type="date" className={cardInputClassName()} required />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save index row
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Stock close entry</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Save verified delayed last-close values here so completed stock routes stop depending on hardcoded code-side overrides.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              submitPayload(
                {
                  type: "stock-close",
                  data: {
                    slug: formData.get("slug"),
                    companyName: formData.get("companyName"),
                    symbol: formData.get("symbol"),
                    price: formData.get("price"),
                    changePercent: formData.get("changePercent"),
                    source: formData.get("source"),
                    sourceDate: formData.get("sourceDate"),
                  },
                },
                "Stock close row saved to the backend store.",
                form,
              );
            }}
          >
            <input name="slug" placeholder="Stock slug (tata-motors)" className={cardInputClassName()} required />
            <input name="companyName" placeholder="Company name" className={cardInputClassName()} required />
            <input name="symbol" placeholder="Symbol" className={cardInputClassName()} required />
            <input name="price" type="number" step="0.01" placeholder="Last close price" className={cardInputClassName()} required />
            <input name="changePercent" type="number" step="0.01" placeholder="Day change %" className={cardInputClassName()} required />
            <input name="source" placeholder="Source label" className={cardInputClassName()} required />
            <input name="sourceDate" type="date" className={cardInputClassName()} required />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save stock close
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Stock OHLCV entry</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">
            Save source-backed candlestick rows here so completed stock chart routes can switch into a native source-entry chart state without code edits.
          </p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              const barsJson = String(formData.get("barsJson") ?? "[]");

              let bars: unknown;

              try {
                bars = JSON.parse(barsJson);
              } catch {
                setError("Stock OHLCV bars must be valid JSON.");
                setNotice(null);
                return;
              }

              submitPayload(
                {
                  type: "stock-chart",
                  data: {
                    slug: formData.get("chartSlug"),
                    companyName: formData.get("chartCompanyName"),
                    symbol: formData.get("chartSymbol"),
                    timeframe: formData.get("timeframe"),
                    source: formData.get("chartSource"),
                    sourceDate: formData.get("chartSourceDate"),
                    bars,
                  },
                },
                "Stock OHLCV row saved to the backend store.",
                form,
              );
            }}
          >
            <input name="chartSlug" placeholder="Stock slug (tata-motors)" className={cardInputClassName()} required />
            <input name="chartCompanyName" placeholder="Company name" className={cardInputClassName()} required />
            <input name="chartSymbol" placeholder="Symbol" className={cardInputClassName()} required />
            <input name="timeframe" placeholder="Timeframe (1D)" className={cardInputClassName()} defaultValue="1D" required />
            <input name="chartSource" placeholder="Source label" className={cardInputClassName()} required />
            <input name="chartSourceDate" type="date" className={cardInputClassName()} required />
            <textarea
              name="barsJson"
              placeholder='OHLCV bars JSON, e.g. [{"time":"2026-04-10","open":912,"high":924,"low":905,"close":920}]'
              className={`${cardInputClassName()} min-h-[180px] resize-y font-mono text-xs leading-6`}
              required
            />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save stock OHLCV
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Mutual fund NAV entry</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">
            Save source-backed delayed NAV rows here so the tracked fund pages can move beyond waiting-feed states before the AMFI pipeline is fully automated.
          </p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              submitPayload(
                {
                  type: "fund-nav",
                  data: {
                    slug: formData.get("fundSlug"),
                    fundName: formData.get("fundName"),
                    category: formData.get("fundCategory"),
                    nav: formData.get("nav"),
                    returns1Y: formData.get("returns1Y"),
                    source: formData.get("fundSource"),
                    sourceDate: formData.get("fundSourceDate"),
                  },
                },
                "Fund NAV row saved to the backend store.",
                form,
              );
            }}
          >
            <input name="fundSlug" placeholder="Fund slug (hdfc-mid-cap-opportunities)" className={cardInputClassName()} required />
            <input name="fundName" placeholder="Fund name" className={cardInputClassName()} required />
            <input name="fundCategory" placeholder="Category" className={cardInputClassName()} required />
            <input name="nav" type="number" step="0.01" placeholder="Latest NAV" className={cardInputClassName()} required />
            <input name="returns1Y" type="number" step="0.01" placeholder="1Y return %" className={cardInputClassName()} required />
            <input name="fundSource" placeholder="Source label" className={cardInputClassName()} required />
            <input name="fundSourceDate" type="date" className={cardInputClassName()} required />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save fund NAV
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Mutual fund factsheet entry</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">
            Save AMC factsheet evidence here so tracked fund pages can show official document workflow status before the full AMFI and AMC document pipeline is automated.
          </p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              submitPayload(
                {
                  type: "fund-factsheet",
                  data: {
                    slug: formData.get("factsheetSlug"),
                    fundName: formData.get("factsheetFundName"),
                    amcName: formData.get("amcName"),
                    documentLabel: formData.get("documentLabel"),
                    source: formData.get("factsheetSource"),
                    sourceDate: formData.get("factsheetSourceDate"),
                    referenceUrl: formData.get("referenceUrl"),
                  },
                },
                "Fund factsheet evidence saved to the backend store.",
                form,
              );
            }}
          >
            <input name="factsheetSlug" placeholder="Fund slug (hdfc-mid-cap-opportunities)" className={cardInputClassName()} required />
            <input name="factsheetFundName" placeholder="Fund name" className={cardInputClassName()} required />
            <input name="amcName" placeholder="AMC name" className={cardInputClassName()} required />
            <input name="documentLabel" placeholder="Document label (Monthly factsheet)" className={cardInputClassName()} required />
            <input name="factsheetSource" placeholder="Source label" className={cardInputClassName()} required />
            <input name="factsheetSourceDate" type="date" className={cardInputClassName()} required />
            <input name="referenceUrl" type="url" placeholder="Optional reference URL" className={cardInputClassName()} />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save fund factsheet
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Metals history entry</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Enter real gold or silver history rows with source dates and conversion inputs.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              const tool = String(formData.get("tool") ?? "gold") as "gold" | "silver";

              submitPayload(
                tool === "gold"
                  ? {
                      type: "commodity-history",
                      tool,
                      data: {
                        date: formData.get("date"),
                        gold24: formData.get("primaryRate"),
                        gold22: formData.get("secondaryRate"),
                        gold18: formData.get("tertiaryRate"),
                        xauusd: formData.get("metalUsd"),
                        usdinr: formData.get("usdInr"),
                        source: formData.get("source"),
                      },
                    }
                  : {
                      type: "commodity-history",
                      tool,
                      data: {
                        date: formData.get("date"),
                        silver999: formData.get("primaryRate"),
                        silver925: formData.get("secondaryRate"),
                        silver900: formData.get("tertiaryRate"),
                        xagusd: formData.get("metalUsd"),
                        usdinr: formData.get("usdInr"),
                        source: formData.get("source"),
                      },
                    },
                `${tool === "gold" ? "Gold" : "Silver"} history row saved.`,
                form,
              );
            }}
          >
            <select name="tool" className={cardInputClassName()} defaultValue="gold">
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
            <input name="date" type="date" className={cardInputClassName()} required />
            <input name="primaryRate" type="number" step="0.01" placeholder="Primary purity rate" className={cardInputClassName()} required />
            <input name="secondaryRate" type="number" step="0.01" placeholder="Secondary purity rate" className={cardInputClassName()} required />
            <input name="tertiaryRate" type="number" step="0.01" placeholder="Tertiary purity rate" className={cardInputClassName()} required />
            <input name="metalUsd" type="number" step="0.0001" placeholder="Metal USD" className={cardInputClassName()} required />
            <input name="usdInr" type="number" step="0.0001" placeholder="USDINR" className={cardInputClassName()} required />
            <input name="source" placeholder="Source label" className={cardInputClassName()} required />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save metals row
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Verified route override</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Use this when a public route needs a launch-safe correction before the source pipeline is fully hardened.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              submitPayload(
                {
                  type: "route-override",
                  data: {
                    route: formData.get("route"),
                    field: formData.get("field"),
                    currentValue: formData.get("currentValue"),
                    correctedValue: formData.get("correctedValue"),
                    reason: formData.get("reason"),
                    reviewDate: formData.get("reviewDate"),
                  },
                },
                "Verified override saved to the backend store.",
                form,
              );
            }}
          >
            <input name="route" placeholder="/nifty50 or /markets" className={cardInputClassName()} required />
            <input name="field" placeholder="Field name" className={cardInputClassName()} required />
            <input name="currentValue" placeholder="Current value" className={cardInputClassName()} />
            <input name="correctedValue" placeholder="Corrected value" className={cardInputClassName()} required />
            <textarea name="reason" placeholder="Why this override is needed" className={`${cardInputClassName()} min-h-[112px] resize-y`} required />
            <input name="reviewDate" type="date" className={cardInputClassName()} required />
            <button disabled={isPending} className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60">
              Save override
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent index entries</h3>
          <div className="mt-4 grid gap-3">
            {payload.indexEntries.length ? (
              payload.indexEntries.map((entry) => (
                <div key={`${entry.createdAt}-${entry.symbol}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">
                      {entry.indexSlug} · {entry.companyName} ({entry.symbol})
                    </p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "index-entry",
                            data: {
                              createdAt: entry.createdAt,
                              indexSlug: entry.indexSlug,
                              symbol: entry.symbol,
                            },
                          },
                          `Removed ${entry.symbol} from the index-entry lane.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">Weight {entry.weightPercent}% · Day move {entry.dailyMovePercent}% · Source {entry.sourceDate}</p>
                  <p className="mt-1 text-xs text-mist/56">Saved {formatTimestamp(entry.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No index entries saved yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent stock close rows</h3>
          <div className="mt-4 grid gap-3">
            {payload.stockCloseEntries.length ? (
              payload.stockCloseEntries.map((entry) => (
                <div key={`${entry.createdAt}-${entry.slug}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">
                      {entry.companyName} ({entry.symbol})
                    </p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "stock-close",
                            data: { slug: entry.slug },
                          },
                          `Removed ${entry.companyName} from the stock-close lane.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">
                    {entry.slug} · ₹{entry.price.toFixed(2)} · {entry.changePercent >= 0 ? "+" : ""}
                    {entry.changePercent.toFixed(2)}%
                  </p>
                  <p className="mt-1">{entry.source} · {entry.sourceDate}</p>
                  <p className="mt-1 text-xs text-mist/56">Saved {formatTimestamp(entry.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No stock close rows saved yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent fund NAV rows</h3>
          <div className="mt-4 grid gap-3">
            {payload.fundNavEntries.length ? (
              payload.fundNavEntries.map((entry) => (
                <div key={`${entry.createdAt}-${entry.slug}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">{entry.fundName}</p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "fund-nav",
                            data: { slug: entry.slug },
                          },
                          `Removed ${entry.fundName} from the fund-NAV lane.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">
                    {entry.category} · {entry.slug} · ₹{entry.nav.toFixed(2)} · {entry.returns1Y >= 0 ? "+" : ""}
                    {entry.returns1Y.toFixed(2)}%
                  </p>
                  <p className="mt-1">{entry.source} · {entry.sourceDate}</p>
                  <p className="mt-1 text-xs text-mist/56">Saved {formatTimestamp(entry.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No fund NAV rows saved yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent fund factsheet rows</h3>
          <div className="mt-4 grid gap-3">
            {payload.fundFactsheetEntries.length ? (
              payload.fundFactsheetEntries.map((entry) => (
                <div key={`${entry.createdAt}-${entry.slug}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">{entry.fundName}</p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "fund-factsheet",
                            data: { slug: entry.slug },
                          },
                          `Removed ${entry.fundName} from the fund-factsheet lane.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">
                    {entry.amcName} · {entry.documentLabel}
                  </p>
                  <p className="mt-1">{entry.source} · {entry.sourceDate}</p>
                  {entry.referenceUrl ? <p className="mt-1 truncate text-xs text-aurora">{entry.referenceUrl}</p> : null}
                  <p className="mt-1 text-xs text-mist/56">Saved {formatTimestamp(entry.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No fund factsheet rows saved yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent stock OHLCV rows</h3>
          <div className="mt-4 grid gap-3">
            {payload.stockChartEntries.length ? (
              payload.stockChartEntries.map((entry) => (
                <div key={`${entry.createdAt}-${entry.slug}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">
                      {entry.companyName} ({entry.symbol})
                    </p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "stock-chart",
                            data: { slug: entry.slug },
                          },
                          `Removed ${entry.companyName} from the stock-OHLCV lane.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">
                    {entry.slug} · {entry.timeframe} · {entry.bars.length} bars
                  </p>
                  <p className="mt-1">{entry.source} · {entry.sourceDate}</p>
                  <p className="mt-1 text-xs text-mist/56">Saved {formatTimestamp(entry.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No stock OHLCV rows saved yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent route overrides</h3>
          <div className="mt-4 grid gap-3">
            {payload.routeOverrides.length ? (
              payload.routeOverrides.map((entry) => (
                <div key={`${entry.createdAt}-${entry.route}-${entry.field}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">
                      {entry.route} · {entry.field}
                    </p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "route-override",
                            data: {
                              createdAt: entry.createdAt,
                              route: entry.route,
                              field: entry.field,
                            },
                          },
                          `Removed the ${entry.field} override for ${entry.route}.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">Corrected to: {entry.correctedValue}</p>
                  <p className="mt-1">Reason: {entry.reason}</p>
                  <p className="mt-1 text-xs text-mist/56">Review by {entry.reviewDate} · Saved {formatTimestamp(entry.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No route overrides saved yet.</div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent gold history rows</h3>
          <div className="mt-4 grid gap-3">
            {payload.goldHistory.length ? (
              payload.goldHistory.map((entry) => (
                <div key={`${entry.date}-${entry.gold24}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">{entry.date}</p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "commodity-history",
                            tool: "gold",
                            data: { date: entry.date },
                          },
                          `Removed the gold history row for ${entry.date}.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">24K {entry.gold24} · 22K {entry.gold22} · 18K {entry.gold18}</p>
                  <p className="mt-1">XAUUSD {entry.xauusd} · USDINR {entry.usdinr}</p>
                  <p className="mt-1 text-xs text-mist/56">{entry.source}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No gold history rows saved yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Recent silver history rows</h3>
          <div className="mt-4 grid gap-3">
            {payload.silverHistory.length ? (
              payload.silverHistory.map((entry) => (
                <div key={`${entry.date}-${entry.silver999}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-white">{entry.date}</p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        removePayload(
                          {
                            type: "commodity-history",
                            tool: "silver",
                            data: { date: entry.date },
                          },
                          `Removed the silver history row for ${entry.date}.`,
                        )
                      }
                      className={removeButtonClassName()}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1">999 {entry.silver999} · 925 {entry.silver925} · 900 {entry.silver900}</p>
                  <p className="mt-1">XAGUSD {entry.xagusd} · USDINR {entry.usdinr}</p>
                  <p className="mt-1 text-xs text-mist/56">{entry.source}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">No silver history rows saved yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
