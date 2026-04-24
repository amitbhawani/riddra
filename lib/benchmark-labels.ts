const BENCHMARK_LABELS: Record<string, string> = {
  nifty50: "Nifty 50",
  nifty_auto: "Nifty Auto",
  nifty_it: "Nifty IT",
  nifty_bank: "Nifty Bank",
  banknifty: "Bank Nifty",
  sensex: "Sensex",
  finnifty: "Fin Nifty",
  nifty100: "Nifty 100",
  niftymidcap150: "Nifty Midcap 150",
};

const BENCHMARK_SLUG_ALIASES: Record<string, string> = {
  nifty50: "nifty50",
  "nifty 50": "nifty50",
  "nifty 50 tri": "nifty50",
  "nifty50 tri": "nifty50",
  nifty_auto: "nifty_auto",
  niftyauto: "nifty_auto",
  "nifty auto": "nifty_auto",
  "nifty auto tri": "nifty_auto",
  nifty_it: "nifty_it",
  niftyit: "nifty_it",
  "nifty it": "nifty_it",
  "nifty it tri": "nifty_it",
  nifty_bank: "nifty_bank",
  niftybank: "nifty_bank",
  "nifty bank sector": "nifty_bank",
  "nifty bank sector tri": "nifty_bank",
  sensex: "sensex",
  "s&p bse sensex": "sensex",
  "s&p bse sensex tri": "sensex",
  "bse sensex": "sensex",
  banknifty: "banknifty",
  "bank nifty": "banknifty",
  "nifty bank": "banknifty",
  "nifty bank tri": "banknifty",
  finnifty: "finnifty",
  "fin nifty": "finnifty",
  "nifty financial services": "finnifty",
  "nifty financial services tri": "finnifty",
  nifty100: "nifty100",
  "nifty 100": "nifty100",
  "nifty 100 tri": "nifty100",
  niftymidcap150: "niftymidcap150",
  "nifty midcap 150": "niftymidcap150",
  "nifty midcap 150 tri": "niftymidcap150",
};

export function normalizeBenchmarkSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return BENCHMARK_SLUG_ALIASES[normalized] ?? normalized.replace(/[^a-z0-9]+/g, "");
}

export function formatBenchmarkLabel(indexSlugOrLabel: string) {
  const normalized = normalizeBenchmarkSlug(indexSlugOrLabel);

  if (!normalized) {
    return "";
  }

  return (
    BENCHMARK_LABELS[normalized] ??
    normalized
      .split("_")
      .join(" ")
      .replace(/([a-z])(\d)/g, "$1 $2")
      .replace(/\b\w/g, (value) => value.toUpperCase())
  );
}
