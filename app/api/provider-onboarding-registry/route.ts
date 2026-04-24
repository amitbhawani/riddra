import {
  getProviderOnboardingRegistryRows,
  toProviderOnboardingCsv,
} from "@/lib/provider-onboarding-registry";

export async function GET() {
  const rows = await getProviderOnboardingRegistryRows();

  return new Response(toProviderOnboardingCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="provider-onboarding-registry.csv"',
    },
  });
}
