import {
  canonicalAssetIntakeSummary,
  canonicalAssetIntakeTemplates,
} from "@/lib/canonical-asset-intake";
import { canonicalCoverageFamilyBreakdown } from "@/lib/canonical-coverage";
import {
  sourceMappingDeskLanes,
  sourceMappingDeskSummary,
} from "@/lib/source-mapping-desk";

export type SourceMappingRegistryRow = {
  lane: "Intake family" | "Human handoff";
  label: string;
  owner: string;
  sourceClass: string;
  currentCoverage: string;
  target: string;
  note: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export const sourceMappingRegistryRows: SourceMappingRegistryRow[] = [
  ...canonicalAssetIntakeTemplates.map((template) => {
    const familyCoverage = canonicalCoverageFamilyBreakdown.find(
      (family) =>
        family.familyLabel === template.family ||
        (template.family === "PMS / AIF / SIF" &&
          ["PMS", "AIF", "SIF"].includes(family.familyLabel)),
    );

    return {
      lane: "Intake family" as const,
      label: template.family,
      owner: template.owner,
      sourceClass:
        template.family === "Stocks"
          ? "Exchange + issuer + market data"
          : template.family === "Mutual Funds"
            ? "AMFI + AMC + factsheet"
            : template.family === "IPOs"
              ? "Exchange + DRHP/RHP + registrar"
              : "Issuer + benchmark + document sources",
      currentCoverage: String(template.currentCoverage),
      target: template.firstWaveTarget,
      note: familyCoverage
        ? `${familyCoverage.routeCount} current routes · delayed ${familyCoverage.delayed} · manual ${familyCoverage.manual} · identity ${familyCoverage.identityReady}`
        : template.objective,
    };
  }),
  ...sourceMappingDeskLanes.map((lane) => ({
    lane: "Human handoff" as const,
    label: lane.title,
    owner: lane.owner,
    sourceClass: `${sourceMappingDeskSummary.sourceClasses} tracked source classes`,
    currentCoverage: `${canonicalAssetIntakeSummary.currentRouteCoverage} routes`,
    target: canonicalAssetIntakeSummary.firstWaveGoal,
    note: lane.summary,
  })),
];

export const sourceMappingRegistrySummary = {
  rows: sourceMappingRegistryRows.length,
  intakeFamilies: canonicalAssetIntakeTemplates.length,
  humanLanes: sourceMappingDeskLanes.length,
  sourceClasses: sourceMappingDeskSummary.sourceClasses,
};

export function toSourceMappingRegistryCsv(rows: SourceMappingRegistryRow[]) {
  const header = [
    "lane",
    "label",
    "owner",
    "source_class",
    "current_coverage",
    "target",
    "note",
  ];

  const dataRows = rows.map((row) =>
    [row.lane, row.label, row.owner, row.sourceClass, row.currentCoverage, row.target, row.note]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...dataRows].join("\n");
}
