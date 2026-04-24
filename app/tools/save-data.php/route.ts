import { saveCommodityHistoryEntry, normalizeCommodityHistoryPayload } from "@/lib/commodity-history";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      tool?: "gold" | "silver";
      data?: Record<string, unknown>;
    };

    if (payload.tool !== "gold" && payload.tool !== "silver") {
      return new Response("unsupported tool", { status: 400 });
    }

    const normalized = normalizeCommodityHistoryPayload(payload.tool, payload.data ?? {});

    if (!normalized) {
      return new Response("invalid payload", { status: 400 });
    }

    await saveCommodityHistoryEntry(payload.tool, normalized);
    return new Response("saved successfully");
  } catch {
    return new Response("save failed", { status: 500 });
  }
}
