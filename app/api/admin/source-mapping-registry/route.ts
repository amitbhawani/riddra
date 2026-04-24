import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  sourceMappingRegistryRows,
  toSourceMappingRegistryCsv,
} from "@/lib/source-mapping-registry";

export async function GET() {
  await requireAdmin();

  return new NextResponse(toSourceMappingRegistryCsv(sourceMappingRegistryRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-source-mapping-registry.csv"',
    },
  });
}
