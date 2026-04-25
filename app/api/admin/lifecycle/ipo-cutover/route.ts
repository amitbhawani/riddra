import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { runIpoListingCutover } from "@/lib/ipo-lifecycle-runner";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

function isAuthorized(request: NextRequest) {
  const config = getRuntimeLaunchConfig();
  const providedSecret = request.headers.get("x-riddra-refresh-secret");

  if (providedSecret && providedSecret === config.marketDataRefreshSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");

  if (config.cronSecret && authHeader === `Bearer ${config.cronSecret}`) {
    return true;
  }

  return false;
}

function revalidateLifecycleSurfaces() {
  revalidatePath("/ipo");
  revalidatePath("/stocks");
  revalidatePath("/sitemap.xml");
}

function missingSecretResponse() {
  return Response.json(
    {
      ok: false,
      error: "MARKET_DATA_REFRESH_SECRET or CRON_SECRET must be configured.",
    },
    { status: 503 },
  );
}

function unauthorizedResponse() {
  return Response.json(
    {
      ok: false,
      error: "Unauthorized IPO lifecycle cutover request.",
    },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  const config = getRuntimeLaunchConfig();

  if (!config.marketDataRefreshSecret && !config.cronSecret) {
    return missingSecretResponse();
  }

  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const result = await runIpoListingCutover({ source: "cron_get" });
    revalidateLifecycleSurfaces();

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown IPO lifecycle cutover failure.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const config = getRuntimeLaunchConfig();

  if (!config.marketDataRefreshSecret && !config.cronSecret) {
    return missingSecretResponse();
  }

  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const result = await runIpoListingCutover({ source: "manual_post" });
    revalidateLifecycleSurfaces();

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown IPO lifecycle cutover failure.",
      },
      { status: 500 },
    );
  }
}

export async function HEAD(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response(null, { status: 401 });
  }

  return new Response(null, { status: 200 });
}
