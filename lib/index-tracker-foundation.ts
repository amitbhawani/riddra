import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const INDEX_SOURCE_FOUNDATION = [
  {
    code: "nse_index",
    domain: "indexes",
    sourceName: "NSE Index Data",
    sourceType: "exchange",
    officialStatus: "official",
    refreshCadence: "near realtime subject to approved access",
    coverageScope: "Nifty 50 and related official index datasets",
    licenseNote:
      "Confirm commercial rights and refresh permissions before production realtime rollout.",
    fallbackBehavior: "Fallback to delayed snapshot and previous session data.",
    notes: "Preferred source for Nifty 50 index intelligence.",
  },
  {
    code: "nse_bank_index",
    domain: "indexes",
    sourceName: "NSE Bank Index Data",
    sourceType: "exchange",
    officialStatus: "official",
    refreshCadence: "near realtime subject to approved access",
    coverageScope: "Bank Nifty and related official index datasets",
    licenseNote:
      "Confirm commercial rights and refresh permissions before production realtime rollout.",
    fallbackBehavior: "Fallback to delayed snapshot and previous session data.",
    notes: "Preferred source for Bank Nifty intelligence.",
  },
  {
    code: "nse_financial_services_index",
    domain: "indexes",
    sourceName: "NSE Financial Services Index Data",
    sourceType: "exchange",
    officialStatus: "official",
    refreshCadence: "near realtime subject to approved access",
    coverageScope: "Fin Nifty and related financial services index datasets",
    licenseNote:
      "Confirm commercial rights and refresh permissions before production realtime rollout.",
    fallbackBehavior: "Fallback to delayed snapshot and previous session data.",
    notes: "Preferred source for Fin Nifty intelligence.",
  },
  {
    code: "bse_sensex",
    domain: "indexes",
    sourceName: "BSE Sensex Data",
    sourceType: "exchange",
    officialStatus: "official",
    refreshCadence: "near realtime subject to approved access",
    coverageScope: "Sensex and related official BSE index datasets",
    licenseNote:
      "Confirm commercial rights and refresh permissions before production realtime rollout.",
    fallbackBehavior: "Fallback to delayed snapshot and previous session data.",
    notes: "Preferred source for Sensex intelligence.",
  },
] as const;

const TRACKED_INDEX_FOUNDATION = [
  {
    slug: "nifty50",
    title: "Nifty 50",
    marketScope: "india",
    benchmarkType: "equity_index",
    primarySourceCode: "nse_index",
    updateMode: "snapshot",
    refreshTargetSeconds: 15,
    publicAccessLevel: "delayed",
    premiumAccessLevel: "intraday",
  },
  {
    slug: "banknifty",
    title: "Bank Nifty",
    marketScope: "india",
    benchmarkType: "banking_index",
    primarySourceCode: "nse_bank_index",
    updateMode: "snapshot",
    refreshTargetSeconds: 15,
    publicAccessLevel: "delayed",
    premiumAccessLevel: "intraday",
  },
  {
    slug: "finnifty",
    title: "Fin Nifty",
    marketScope: "india",
    benchmarkType: "financial_services_index",
    primarySourceCode: "nse_financial_services_index",
    updateMode: "snapshot",
    refreshTargetSeconds: 15,
    publicAccessLevel: "delayed",
    premiumAccessLevel: "intraday",
  },
  {
    slug: "sensex",
    title: "Sensex",
    marketScope: "india",
    benchmarkType: "equity_index",
    primarySourceCode: "bse_sensex",
    updateMode: "snapshot",
    refreshTargetSeconds: 15,
    publicAccessLevel: "delayed",
    premiumAccessLevel: "intraday",
  },
] as const;

const INDEX_COMPONENT_WEIGHT_FOUNDATION = [
  ["nifty50", "RELIANCE", "Reliance Industries", 9.8, "nse_index"],
  ["nifty50", "HDFCBANK", "HDFC Bank", 8.4, "nse_index"],
  ["nifty50", "ICICIBANK", "ICICI Bank", 7.6, "nse_index"],
  ["nifty50", "INFY", "Infosys", 5.7, "nse_index"],
  ["nifty50", "TCS", "TCS", 4.8, "nse_index"],
  ["banknifty", "HDFCBANK", "HDFC Bank", 28.4, "nse_bank_index"],
  ["banknifty", "ICICIBANK", "ICICI Bank", 23.9, "nse_bank_index"],
  ["banknifty", "SBIN", "State Bank of India", 11.7, "nse_bank_index"],
  ["banknifty", "AXISBANK", "Axis Bank", 10.1, "nse_bank_index"],
  ["finnifty", "HDFCBANK", "HDFC Bank", 17.9, "nse_financial_services_index"],
  ["finnifty", "ICICIBANK", "ICICI Bank", 14.6, "nse_financial_services_index"],
  ["finnifty", "SBILIFE", "SBI Life Insurance", 6.4, "nse_financial_services_index"],
  ["sensex", "RELIANCE", "Reliance Industries", 11.2, "bse_sensex"],
  ["sensex", "HDFCBANK", "HDFC Bank", 10.5, "bse_sensex"],
  ["sensex", "ICICIBANK", "ICICI Bank", 8.2, "bse_sensex"],
  ["sensex", "INFY", "Infosys", 7.4, "bse_sensex"],
  ["sensex", "TCS", "TCS", 5.6, "bse_sensex"],
] as const;

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function ensureTrackedIndexFoundationData(
  client: SupabaseAdminClient = createSupabaseAdminClient(),
) {
  const { error: sourceInsertError } = await client.from("data_sources").upsert(
    INDEX_SOURCE_FOUNDATION.map((item) => ({
      code: item.code,
      domain: item.domain,
      source_name: item.sourceName,
      source_type: item.sourceType,
      official_status: item.officialStatus,
      refresh_cadence: item.refreshCadence,
      coverage_scope: item.coverageScope,
      license_note: item.licenseNote,
      fallback_behavior: item.fallbackBehavior,
      notes: item.notes,
    })),
    { onConflict: "code" },
  );

  if (sourceInsertError) {
    throw new Error(`Index source foundation insert failed: ${sourceInsertError.message}`);
  }

  const { data: existingIndexes, error: existingIndexesError } = await client
    .from("tracked_indexes")
    .select("id, slug")
    .in(
      "slug",
      TRACKED_INDEX_FOUNDATION.map((item) => item.slug),
    );

  if (existingIndexesError) {
    throw new Error(`Tracked index foundation lookup failed: ${existingIndexesError.message}`);
  }

  const existingIndexBySlug = new Map(
    (existingIndexes ?? [])
      .filter(
        (row): row is { id: string; slug: string } =>
          typeof row?.id === "string" && typeof row?.slug === "string",
      )
      .map((row) => [row.slug, row.id]),
  );

  const missingTrackedIndexes = TRACKED_INDEX_FOUNDATION.filter(
    (item) => !existingIndexBySlug.has(item.slug),
  );

  if (missingTrackedIndexes.length > 0) {
    const { data: insertedIndexes, error: insertIndexesError } = await client
      .from("tracked_indexes")
      .insert(
        missingTrackedIndexes.map((item) => ({
          slug: item.slug,
          title: item.title,
          market_scope: item.marketScope,
          benchmark_type: item.benchmarkType,
          primary_source_code: item.primarySourceCode,
          update_mode: item.updateMode,
          refresh_target_seconds: item.refreshTargetSeconds,
          public_access_level: item.publicAccessLevel,
          premium_access_level: item.premiumAccessLevel,
          status: "planned",
        })),
      )
      .select("id, slug");

    if (insertIndexesError) {
      throw new Error(`Tracked index foundation insert failed: ${insertIndexesError.message}`);
    }

    for (const row of insertedIndexes ?? []) {
      if (typeof row?.id === "string" && typeof row?.slug === "string") {
        existingIndexBySlug.set(row.slug, row.id);
      }
    }
  }

  const trackedIndexIds = Array.from(existingIndexBySlug.values());
  if (trackedIndexIds.length === 0) {
    return existingIndexBySlug;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: existingWeights, error: existingWeightsError } = await client
    .from("index_component_weights")
    .select("tracked_index_id, effective_from, effective_to")
    .in("tracked_index_id", trackedIndexIds)
    .lte("effective_from", today);

  if (existingWeightsError) {
    throw new Error(`Index component foundation lookup failed: ${existingWeightsError.message}`);
  }

  const activeWeightSlugs = new Set<string>();

  for (const row of existingWeights ?? []) {
    const trackedIndexId =
      typeof row?.tracked_index_id === "string" ? row.tracked_index_id : "";
    const effectiveTo = typeof row?.effective_to === "string" ? row.effective_to : null;

    if (!trackedIndexId || (effectiveTo && effectiveTo < today)) {
      continue;
    }

    const slug = Array.from(existingIndexBySlug.entries()).find(([, id]) => id === trackedIndexId)?.[0];
    if (slug) {
      activeWeightSlugs.add(slug);
    }
  }

  const missingWeightRows = INDEX_COMPONENT_WEIGHT_FOUNDATION.filter(
    ([slug]) => !activeWeightSlugs.has(slug),
  );

  if (missingWeightRows.length > 0) {
    const { error: insertWeightsError } = await client.from("index_component_weights").insert(
      missingWeightRows
        .map(([slug, componentSymbol, componentName, weight, sourceCode]) => {
          const trackedIndexId = existingIndexBySlug.get(slug);
          if (!trackedIndexId) {
            return null;
          }

          return {
            tracked_index_id: trackedIndexId,
            component_symbol: componentSymbol,
            component_name: componentName,
            weight,
            effective_from: today,
            source_code: sourceCode,
          };
        })
        .filter(Boolean),
    );

    if (insertWeightsError) {
      throw new Error(`Index component foundation insert failed: ${insertWeightsError.message}`);
    }
  }

  return existingIndexBySlug;
}
