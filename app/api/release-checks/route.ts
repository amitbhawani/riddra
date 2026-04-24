import { releaseCheckRegistryRows, toReleaseCheckCsv } from "@/lib/release-checks";

export async function GET() {
  return new Response(toReleaseCheckCsv(releaseCheckRegistryRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="release-checks-registry.csv"',
    },
  });
}
