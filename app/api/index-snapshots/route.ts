import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import { getIndexSnapshot, getIndexSnapshots } from "@/lib/index-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  noStore();
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const successHeaders = {
    "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120",
  };
  const failureHeaders = {
    "Cache-Control": "no-store",
  };

  try {
    if (slug) {
      const snapshot = await getIndexSnapshot(slug);

      if (!snapshot) {
        return NextResponse.json(
          {
            error: `No durable snapshot rows found for "${slug}" in index_tracker_snapshots.`,
            code: "missing_durable_snapshot",
            slug,
          },
          { status: 404, headers: failureHeaders },
        );
      }

      return NextResponse.json({ snapshot }, { headers: successHeaders });
    }

    const snapshots = await getIndexSnapshots();
    return NextResponse.json({ snapshots }, { headers: successHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Index snapshot read failed";
    return NextResponse.json({ error: message }, { status: 500, headers: failureHeaders });
  }
}
