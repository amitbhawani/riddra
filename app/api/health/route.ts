import { getPublicRuntimeHealthSnapshot } from "@/lib/runtime-diagnostics";

export async function GET() {
  const snapshot = await getPublicRuntimeHealthSnapshot();

  return Response.json(snapshot, {
    status: snapshot.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
