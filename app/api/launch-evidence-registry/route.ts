import {
  getLaunchEvidenceActionMemory,
  toLaunchEvidenceActionCsv,
} from "@/lib/launch-evidence-action-memory-store";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format");
  const memory = await getLaunchEvidenceActionMemory();

  if (format === "json") {
    return Response.json(memory);
  }

  return new Response(toLaunchEvidenceActionCsv(memory.items), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="launch-evidence-registry.csv"',
    },
  });
}
