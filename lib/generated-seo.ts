import type { LaunchConfigStore } from "@/lib/launch-config-store";

type SeoFamily = string;

type SeoTemplateContext = {
  name: string;
  title: string;
  slug: string;
  symbol: string;
  price: string;
  sector: string;
  category: string;
  benchmark: string;
  route: string;
  site: string;
  brand: string;
  summary: string;
  family: string;
};

const BENCHMARK_LABELS: Record<string, string> = {
  nifty50: "Nifty 50",
  nifty100: "Nifty 100",
  nifty200: "Nifty 200",
  nifty500: "Nifty 500",
  banknifty: "Bank Nifty",
  finnifty: "Fin Nifty",
  sensex: "Sensex",
  nifty_auto: "Nifty Auto",
  nifty_it: "Nifty IT",
  nifty_fmcg: "Nifty FMCG",
  nifty_pharma: "Nifty Pharma",
  nifty_metal: "Nifty Metal",
  nifty_energy: "Nifty Energy",
  nifty_realty: "Nifty Realty",
  nifty_psu_bank: "Nifty PSU Bank",
  nse_equities: "NSE Equities",
};

function cleanValue(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function shouldSuppressSeoToken(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("awaiting") ||
    normalized.includes("pending") ||
    normalized.includes("unavailable") ||
    normalized.includes("not set") ||
    normalized === "unclassified"
  );
}

function normalizeSeoTokenValue(value: string | null | undefined) {
  const cleaned = cleanValue(value);
  if (!cleaned) {
    return "";
  }

  if (shouldSuppressSeoToken(cleaned)) {
    return "";
  }

  return cleaned;
}

function humanizeTokenValue(value: string | null | undefined) {
  const cleaned = normalizeSeoTokenValue(value);
  if (!cleaned) {
    return "";
  }

  const normalized = cleaned.toLowerCase();
  if (BENCHMARK_LABELS[normalized]) {
    return BENCHMARK_LABELS[normalized];
  }

  return cleaned
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function pickFirstNonEmptySeoValue(
  ...values: Array<string | null | undefined>
) {
  for (const value of values) {
    const cleaned = cleanValue(value);
    if (cleaned) {
      return cleaned;
    }
  }

  return "";
}

export function fillSeoTemplate(
  template: string | null | undefined,
  context: SeoTemplateContext,
  fallback: string,
) {
  const base = cleanValue(template) || fallback;
  let output = base.replace(/%s/g, context.name || context.title || fallback);

  for (const [key, value] of Object.entries(context)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }

  return output
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\|/g, " |")
    .replace(/\|\s+\|/g, "|")
    .trim();
}

export function resolveCanonicalUrlForSeo(
  value: string | null | undefined,
  publicHref: string | null | undefined,
  canonicalHost: string | null | undefined,
) {
  const directValue = cleanValue(value);
  if (directValue.startsWith("http://") || directValue.startsWith("https://")) {
    return directValue;
  }

  const routeValue = directValue || cleanValue(publicHref);
  if (!routeValue) {
    return "";
  }

  if (routeValue.startsWith("http://") || routeValue.startsWith("https://")) {
    return routeValue;
  }

  const host = cleanValue(canonicalHost).replace(/\/+$/, "");
  return host ? `${host}${routeValue.startsWith("/") ? routeValue : `/${routeValue}`}` : routeValue;
}

function resolveGeneratedOgImageUrl(
  baseUrl: string | null | undefined,
  family: SeoFamily,
  slug: string,
  context: SeoTemplateContext,
) {
  const base = cleanValue(baseUrl);
  if (!base) {
    return "";
  }

  if (base.includes("{{") || base.includes("%s")) {
    return fillSeoTemplate(base, context, base);
  }

  if (/^https?:\/\/.+\.(png|jpe?g|webp|svg)$/i.test(base) || /^\/.+\.(png|jpe?g|webp|svg)$/i.test(base)) {
    return base;
  }

  const normalizedBase = base.replace(/\/+$/, "");
  return `${normalizedBase}/${family}/${slug}.png`;
}

export function buildGeneratedSeoDefaults(input: {
  family: SeoFamily;
  slug: string;
  title: string;
  summary: string;
  symbol: string | null;
  publicHref: string | null;
  benchmarkMapping: string | null;
  launchConfig: LaunchConfigStore;
  seoContext?: {
    price?: string | null;
    sector?: string | null;
    category?: string | null;
    benchmark?: string | null;
  };
}) {
  const siteUrl =
    cleanValue(input.launchConfig.basic.siteUrl) ||
    cleanValue(input.launchConfig.content.canonicalHost) ||
    "https://riddra.com";
  const brandName = cleanValue(input.launchConfig.content.schemaOrganizationName) || "Riddra";
  const route = cleanValue(input.publicHref);
  const benchmark = humanizeTokenValue(
    input.seoContext?.benchmark ?? input.benchmarkMapping ?? "",
  );

  const context: SeoTemplateContext = {
    name: input.title,
    title: input.title,
    slug: input.slug,
    symbol: normalizeSeoTokenValue(input.symbol),
    price: normalizeSeoTokenValue(input.seoContext?.price),
    sector: normalizeSeoTokenValue(input.seoContext?.sector),
    category: normalizeSeoTokenValue(input.seoContext?.category),
    benchmark,
    route,
    site: siteUrl,
    brand: brandName,
    summary: cleanValue(input.summary),
    family: input.family,
  };

  const defaultTitleTemplate =
    cleanValue(input.launchConfig.content.defaultTitleTemplate) || "%s | Riddra";
  const defaultDescriptionTemplate =
    cleanValue(input.launchConfig.content.defaultMetaDescription) || input.summary;

  let titleTemplate = defaultTitleTemplate;
  let descriptionTemplate = defaultDescriptionTemplate;

  if (input.family === "stocks") {
    titleTemplate =
      cleanValue(input.launchConfig.content.stockTitleTemplate) || defaultTitleTemplate;
    descriptionTemplate =
      cleanValue(input.launchConfig.content.stockMetaDescriptionTemplate) ||
      defaultDescriptionTemplate;
  } else if (input.family === "mutual-funds") {
    titleTemplate =
      cleanValue(input.launchConfig.content.fundTitleTemplate) || defaultTitleTemplate;
    descriptionTemplate =
      cleanValue(input.launchConfig.content.fundMetaDescriptionTemplate) ||
      defaultDescriptionTemplate;
  } else if (input.family === "indices") {
    titleTemplate =
      cleanValue(input.launchConfig.content.indexTitleTemplate) || defaultTitleTemplate;
    descriptionTemplate =
      cleanValue(input.launchConfig.content.indexMetaDescriptionTemplate) ||
      defaultDescriptionTemplate;
  }

  return {
    metaTitle: fillSeoTemplate(titleTemplate, context, input.title),
    metaDescription:
      fillSeoTemplate(descriptionTemplate, context, input.summary) || input.summary,
    canonicalUrl: resolveCanonicalUrlForSeo(
      null,
      input.publicHref,
      cleanValue(input.launchConfig.content.canonicalHost) || cleanValue(input.launchConfig.basic.siteUrl),
    ),
    ogImage: resolveGeneratedOgImageUrl(
      input.launchConfig.content.ogImageBaseUrl,
      input.family,
      input.slug,
      context,
    ),
  };
}
