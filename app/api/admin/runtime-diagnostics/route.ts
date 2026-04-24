import { requireAdmin } from "@/lib/auth";
import { getRuntimeDiagnosticsSnapshot } from "@/lib/runtime-diagnostics";

export async function GET() {
  await requireAdmin();

  const snapshot = await getRuntimeDiagnosticsSnapshot();

  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
