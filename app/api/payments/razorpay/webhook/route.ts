import { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { getPaymentEventSummary, verifyRazorpayWebhookSignature } from "@/lib/payment-events";

export async function POST(request: NextRequest) {
  if (!env.razorpayWebhookSecret) {
    return Response.json(
      {
        ok: false,
        error: "Webhook secret missing",
        note: "Set RAZORPAY_WEBHOOK_SECRET before enabling live billing events.",
      },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhookSignature(payload, signature)) {
    return Response.json(
      {
        ok: false,
        error: "Invalid webhook signature",
      },
      { status: 400 },
    );
  }

  const body = safeJsonParse(payload);
  const event = typeof body?.event === "string" ? body.event : "unknown";
  const summary = getPaymentEventSummary(event);

  return Response.json({
    ok: true,
    received: event,
    handled: Boolean(summary),
    note:
      summary?.action ??
      "Webhook signature is valid. Event storage and entitlement mutation will be connected once Supabase billing records go live.",
  });
}

function safeJsonParse(payload: string) {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}
