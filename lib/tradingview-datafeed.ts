export type TradingviewLibraryConfig = {
  supported_resolutions: string[];
  supports_search: boolean;
  supports_group_request: boolean;
  supports_marks: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
};

export type TradingviewSearchResult = {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker: string;
  type: string;
};

export type TradingviewResolvedSymbol = {
  ticker: string;
  name: string;
  full_name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
};

export type TradingviewHistoryBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type PeriodParams = {
  from: number;
  to: number;
  firstDataRequest: boolean;
};

function normalizeResolution(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === "D" ? "1D" : normalized;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `TradingView datafeed request failed (${response.status}).`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function createRiddraTradingviewDatafeed(
  basePath = "/api/tradingview/datafeed",
) {
  return {
    async onReady(callback: (config: TradingviewLibraryConfig) => void) {
      const payload = await readJson<{ config: TradingviewLibraryConfig }>(
        `${basePath}/config`,
      );
      callback(payload.config);
    },

    async searchSymbols(
      userInput: string,
      exchange: string,
      symbolType: string,
      onResultReadyCallback: (results: TradingviewSearchResult[]) => void,
    ) {
      const params = new URLSearchParams();
      params.set("query", userInput);

      if (exchange) {
        params.set("exchange", exchange);
      }

      if (symbolType) {
        params.set("symbolType", symbolType);
      }

      try {
        const payload = await readJson<{ symbols: TradingviewSearchResult[] }>(
          `${basePath}/search?${params.toString()}`,
        );
        onResultReadyCallback(payload.symbols);
      } catch {
        onResultReadyCallback([]);
      }
    },

    async resolveSymbol(
      symbolName: string,
      onSymbolResolvedCallback: (symbolInfo: TradingviewResolvedSymbol) => void,
      onResolveErrorCallback: (reason: string) => void,
    ) {
      try {
        const params = new URLSearchParams({ symbol: symbolName });
        const payload = await readJson<{ symbol: TradingviewResolvedSymbol }>(
          `${basePath}/resolve?${params.toString()}`,
        );
        onSymbolResolvedCallback(payload.symbol);
      } catch (error) {
        onResolveErrorCallback(
          error instanceof Error ? error.message : "Symbol resolution failed.",
        );
      }
    },

    async getBars(
      symbolInfo: TradingviewResolvedSymbol,
      resolution: string,
      periodParams: PeriodParams,
      onHistoryCallback: (
        bars: TradingviewHistoryBar[],
        meta: { noData: boolean },
      ) => void,
      onErrorCallback: (reason: string) => void,
    ) {
      const normalizedResolution = normalizeResolution(resolution);

      if (normalizedResolution !== "1D") {
        onErrorCallback("TradingView Phase 1 supports daily bars only.");
        return;
      }

      try {
        const params = new URLSearchParams({
          symbol: symbolInfo.ticker,
          resolution: normalizedResolution,
          from: String(periodParams.from),
          to: String(periodParams.to),
        });
        const payload = await readJson<{
          bars: TradingviewHistoryBar[];
          meta: { noData: boolean };
        }>(`${basePath}/bars?${params.toString()}`);

        onHistoryCallback(payload.bars, payload.meta);
      } catch (error) {
        onErrorCallback(
          error instanceof Error ? error.message : "Bar history read failed.",
        );
      }
    },

    subscribeBars() {
      // Phase 1 is daily-only and intentionally skips realtime streaming.
    },

    unsubscribeBars() {
      // Phase 1 is daily-only and intentionally skips realtime streaming.
    },
  };
}
