import { getAiGenerationMemory } from "@/lib/ai-generation-memory-store";

export type AiGenerationRegistryRow = {
  kind: "dataset" | "generation_run" | "answer_packet";
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getAiGenerationRegistryRows(): Promise<AiGenerationRegistryRow[]> {
  const memory = await getAiGenerationMemory();

  const datasetRows = memory.datasets.map((dataset) => ({
    kind: "dataset" as const,
    title: dataset.source,
    href: "/admin/knowledge-ops",
    status: dataset.status,
    owner: dataset.role,
    note: `${dataset.retainedChunks} chunks · ${dataset.routeTargets} routes · ${dataset.freshness}`,
  }));

  const runRows = memory.generationRuns.map((run) => ({
    kind: "generation_run" as const,
    title: run.workflow,
    href: "/admin/ai-ops",
    status: run.answerState,
    owner: `${run.mode} · ${run.costBand}`,
    note: `${run.routeTarget} · ${run.groundingSource} · ${run.storedAt}`,
  }));

  const packetRows = memory.answerPackets.map((packet) => ({
    kind: "answer_packet" as const,
    title: packet.workflow,
    href: "/market-copilot",
    status: packet.continuityState,
    owner: packet.audience,
    note: `${packet.routeTarget} · ${packet.groundingSources} · ${packet.storedAt}`,
  }));

  return [...datasetRows, ...runRows, ...packetRows].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getAiGenerationRegistrySummary() {
  const memory = await getAiGenerationMemory();

  return {
    totalRows: memory.datasets.length + memory.generationRuns.length + memory.answerPackets.length,
    datasets: memory.datasets.length,
    runs: memory.generationRuns.length,
    packets: memory.answerPackets.length,
    needsLiveProvider:
      memory.generationRuns.filter((run) => run.answerState === "Needs live provider").length +
      memory.answerPackets.filter((packet) => packet.continuityState === "Needs live provider").length,
  };
}

export function toAiGenerationRegistryCsv(rows: AiGenerationRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
