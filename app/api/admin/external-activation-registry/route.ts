import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getExternalActivationRegistryRows,
  toExternalActivationRegistryCsv,
} from "@/lib/external-activation-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getExternalActivationRegistryRows();
  const csv = toExternalActivationRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-external-activation-registry.csv"',
    },
  });
}
