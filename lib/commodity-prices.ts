export type CommodityQuote = {
  symbol: "gold" | "silver";
  title: string;
  unitLabel: string;
  inrValue: number | null;
  usdValue: number | null;
  usdinr: number | null;
  source: string;
  updatedAt: string | null;
};

const COMMODITY_QUOTES_CACHE_TTL_MS = 60_000;

type CommodityQuotesCacheEntry = {
  expiresAt: number;
  value: CommodityQuote[];
};

let commodityQuotesCache: CommodityQuotesCacheEntry | null = null;

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request failed: ${url}`);
  }

  return response.json();
}

async function getUsdInr() {
  const sources = [
    {
      label: "open.er-api.com",
      load: async () => {
        const data = await fetchJson("https://open.er-api.com/v6/latest/USD");
        const value = Number(data?.rates?.INR);
        return Number.isFinite(value) && value > 0 ? { value, source: "open.er-api.com" } : null;
      },
    },
    {
      label: "cdn.jsdelivr.net",
      load: async () => {
        const data = await fetchJson(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
        );
        const value = Number(data?.usd?.inr);
        return Number.isFinite(value) && value > 0 ? { value, source: "cdn.jsdelivr.net" } : null;
      },
    },
  ];

  for (const source of sources) {
    try {
      const result = await source.load();
      if (result) {
        return result;
      }
    } catch {}
  }

  return { value: null, source: "Unavailable" };
}

async function getMetalUsd(symbol: "XAU" | "XAG") {
  const primary = `https://api.gold-api.com/price/${symbol}`;
  const fallback = `https://data-asg.goldprice.org/dbXRates/USD`;

  try {
    const data = await fetchJson(primary);
    const value = Number(data?.price);
    return Number.isFinite(value) && value > 0
      ? { value, source: "gold-api.com", updatedAt: data?.timestamp ? new Date(data.timestamp * 1000).toISOString() : null }
      : null;
  } catch {}

  try {
    const data = await fetchJson(fallback);
    const item = Array.isArray(data?.items) ? data.items[0] : null;
    const field = symbol === "XAU" ? Number(item?.xauPrice) : Number(item?.xagPrice);
    return Number.isFinite(field) && field > 0
      ? { value: field, source: "goldprice.org", updatedAt: item?.currTime ?? null }
      : null;
  } catch {}

  return { value: null, source: "Unavailable", updatedAt: null };
}

function perGramInr(usdPerOunce: number, usdInr: number) {
  const troyOunce = 31.1035;
  return (usdPerOunce / troyOunce) * usdInr;
}

export async function getCommodityQuotes(): Promise<CommodityQuote[]> {
  if (commodityQuotesCache && commodityQuotesCache.expiresAt > Date.now()) {
    return commodityQuotesCache.value;
  }

  const [usdInr, gold, silver] = await Promise.all([getUsdInr(), getMetalUsd("XAU"), getMetalUsd("XAG")]);
  const goldValue = gold?.value ?? null;
  const goldUpdatedAt = gold?.updatedAt ?? null;
  const goldSource = gold?.source ?? "Unavailable";
  const silverValue = silver?.value ?? null;
  const silverUpdatedAt = silver?.updatedAt ?? null;
  const silverSource = silver?.source ?? "Unavailable";

  const quotes: CommodityQuote[] = [
    {
      symbol: "gold",
      title: "Gold",
      unitLabel: "per gram",
      inrValue: usdInr.value && goldValue ? perGramInr(goldValue, usdInr.value) : null,
      usdValue: goldValue,
      usdinr: usdInr.value,
      source: [goldSource, usdInr.source].filter(Boolean).join(" + "),
      updatedAt: goldUpdatedAt,
    },
    {
      symbol: "silver",
      title: "Silver",
      unitLabel: "per gram",
      inrValue: usdInr.value && silverValue ? perGramInr(silverValue, usdInr.value) : null,
      usdValue: silverValue,
      usdinr: usdInr.value,
      source: [silverSource, usdInr.source].filter(Boolean).join(" + "),
      updatedAt: silverUpdatedAt,
    },
  ];

  commodityQuotesCache = {
    value: quotes,
    expiresAt: Date.now() + COMMODITY_QUOTES_CACHE_TTL_MS,
  };

  return quotes;
}
