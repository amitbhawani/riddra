import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getProviderOnboardingRegistryRows,
  toProviderOnboardingCsv,
} from "@/lib/provider-onboarding-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getProviderOnboardingRegistryRows();

  return new NextResponse(toProviderOnboardingCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-provider-onboarding-registry.csv"',
    },
  });
}
