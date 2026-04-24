import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SourceRegistryItem = {
  code: string;
  domain: string;
  sourceName: string;
  sourceType: string;
  officialStatus: string;
  refreshCadence: string;
  coverageScope: string;
  licenseNote: string;
  fallbackBehavior: string;
  notes: string;
};

const registryPath = path.join(process.cwd(), "data", "source_registry.csv");

async function readFallbackRegistry(): Promise<SourceRegistryItem[]> {
  const raw = await readFile(registryPath, "utf8");
  const [header, ...rows] = raw.trim().split("\n");
  const keys = header.split(",");

  return rows.map((row) => {
    const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) ?? [];
    const record = Object.fromEntries(
      keys.map((key, index) => [
        key,
        (values[index] ?? "").replace(/^"|"$/g, ""),
      ]),
    );

    return {
      code: record.code,
      domain: record.domain,
      sourceName: record.source_name,
      sourceType: record.source_type,
      officialStatus: record.official_status,
      refreshCadence: record.refresh_cadence,
      coverageScope: record.coverage_scope,
      licenseNote: record.license_note,
      fallbackBehavior: record.fallback_behavior,
      notes: record.notes,
    };
  });
}

export const getSourceRegistry = cache(async (): Promise<SourceRegistryItem[]> => {
  if (!hasSupabaseEnv()) {
    return readFallbackRegistry();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("data_sources")
      .select(
        "code, domain, source_name, source_type, official_status, refresh_cadence, coverage_scope, license_note, fallback_behavior, notes",
      )
      .order("domain", { ascending: true })
      .order("source_name", { ascending: true });

    if (error || !data || data.length === 0) {
      return readFallbackRegistry();
    }

    return data.map((item) => ({
      code: item.code,
      domain: item.domain,
      sourceName: item.source_name,
      sourceType: item.source_type,
      officialStatus: item.official_status,
      refreshCadence: item.refresh_cadence ?? "",
      coverageScope: item.coverage_scope ?? "",
      licenseNote: item.license_note ?? "",
      fallbackBehavior: item.fallback_behavior ?? "",
      notes: item.notes ?? "",
    }));
  } catch {
    return readFallbackRegistry();
  }
});

export const getSourceByCode = cache(async (code: string) => {
  const registry = await getSourceRegistry();
  return registry.find((item) => item.code === code) ?? null;
});
