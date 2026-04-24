import {
  sourceMappingRegistryRows,
  toSourceMappingRegistryCsv,
} from "@/lib/source-mapping-registry";

export async function GET() {
  return new Response(toSourceMappingRegistryCsv(sourceMappingRegistryRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="source-mapping-registry.csv"',
    },
  });
}
