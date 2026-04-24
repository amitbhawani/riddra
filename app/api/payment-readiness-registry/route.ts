import {
  paymentReadinessRegistryRows,
  toPaymentReadinessCsv,
} from "@/lib/payment-readiness-registry";

export async function GET() {
  return new Response(toPaymentReadinessCsv(paymentReadinessRegistryRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payment-readiness-registry.csv"',
    },
  });
}
