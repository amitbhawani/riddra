import { getSampleMarketDataPayload } from "@/lib/market-data-provider-sample";

export async function GET() {
  return Response.json({
    ok: true,
    service: "market-data-sample-payload",
    ...getSampleMarketDataPayload(),
  });
}
