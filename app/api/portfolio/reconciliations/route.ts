import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";

export async function POST(request: Request) {
  const user = await requireUser();
  const durableJobs = getDurableJobSystemReadiness();
  const body = (await request.json()) as {
    fileName?: string;
    createdAt?: string;
    note?: string;
  };

  const fileName = body.fileName?.trim() ?? "";
  const createdAt = body.createdAt?.trim() ?? "";

  if (!fileName || !createdAt) {
    return NextResponse.json({ error: "Import run file name and timestamp are required." }, { status: 400 });
  }

  if (!durableJobs.configured) {
    return NextResponse.json(
      {
        error: "Trigger.dev is not configured for durable reconciliation jobs yet.",
        durableJobs,
      },
      { status: 503 },
    );
  }

  const handle = await queueDurableJob({
    taskId: "portfolio-reconciliation-checkpoint",
    payload: {
      user: {
        id: user.id,
        email: user.email ?? "local-preview-user",
      },
      fileName,
      createdAt,
      note: body.note?.trim() ?? "",
    },
    idempotencyKey: `portfolio-reconciliation:${user.id}:${fileName}:${createdAt}`,
    tags: ["durable-job", "reconciliation", "portfolio"],
    metadata: {
      routeTarget: "/api/portfolio/reconciliations",
      fileName,
      createdAt,
      requestedBy: user.email ?? "local-preview-user",
    },
  });
  const continuity = await syncAccountContinuityRecord(user, {
    route: "/portfolio/import",
    action: `Queued reconciliation checkpoint: ${fileName}`,
  });

  return NextResponse.json({
    ok: true,
    mode: "durable_job_queued",
    continuityUpdatedAt: continuity.updatedAt,
    job: {
      id: handle.id,
      taskId: "portfolio-reconciliation-checkpoint",
    },
    durableJobs,
  });
}
